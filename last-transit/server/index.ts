import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { config } from './config.js'
import { pool } from './database.js'

type PushSubscriptionRequest = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

type NotificationScheduleRequest = {
  pushSubscriptionId?: string
  tripId?: string
  departureAt?: string
  notifyAt?: string
}

type DayType = 'weekday' | 'saturday' | 'holiday'

function corsOrigin(request: IncomingMessage) {
  const origin = request.headers.origin
  if (!origin) return config.appOrigin

  try {
    const url = new URL(origin)
    const isViteDevelopmentServer = url.hostname === 'localhost' && /^517\d$/.test(url.port)
    if (isViteDevelopmentServer) return origin
  } catch {
    // 不正なOriginは本番用の許可Originとして扱います。
  }

  return config.appOrigin
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown, origin: string) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    size += chunk.length
    if (size > 16_384) {
      throw new Error('リクエスト本文が大きすぎます。')
    }
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

const server = createServer(async (request, response) => {
  const respond = (statusCode: number, body: unknown) => sendJson(response, statusCode, body, corsOrigin(request))

  if (request.method === 'OPTIONS') {
    respond(204, null)
    return
  }

  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'GET' && requestUrl.pathname === '/api/manual-last-departures') {
    const stopId = requestUrl.searchParams.get('stopId')
    const dayType = requestUrl.searchParams.get('dayType')

    if (!stopId || !isDayType(dayType)) {
      respond(400, { error: 'stopIdとdayType（weekday / saturday / holiday）が必要です。' })
      return
    }

    try {
      const result = await pool.query<ManualLastDeparture>(`
        SELECT
          stop_id AS "stopId",
          stop_name AS "stopName",
          direction_label AS "directionLabel",
          day_type AS "dayType",
          last_departure_time::text AS "lastDepartureTime",
          route_label AS "routeLabel",
          source_url AS "sourceUrl",
          source_checked_at AS "sourceCheckedAt"
        FROM manual_last_departures
        WHERE stop_id = $1 AND day_type = $2 AND is_active = TRUE
      `, [stopId, dayType])

      const departure = result.rows[0]
      if (!departure || !departure.lastDepartureTime) {
        respond(404, { error: 'この停留所・運行日の最終便はまだ登録されていません。' })
        return
      }

      respond(200, departure)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : '最終便データの取得に失敗しました。'
      respond(500, { error: message })
      return
    }
  }

  if (request.method !== 'POST') {
    respond(404, { error: '見つからないAPIです。' })
    return
  }

  try {
    if (request.url === '/api/push-subscriptions') {
      const body = await readJson(request) as PushSubscriptionRequest
      if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
        respond(400, { error: '通知の購読情報が不完全です。' })
        return
      }

      const result = await pool.query<{ id: string }>(`
        INSERT INTO push_subscriptions (endpoint, p256dh_key, auth_key)
        VALUES ($1, $2, $3)
        ON CONFLICT (endpoint) DO UPDATE SET
          p256dh_key = EXCLUDED.p256dh_key,
          auth_key = EXCLUDED.auth_key,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id
      `, [body.endpoint, body.keys.p256dh, body.keys.auth])

      respond(201, { id: result.rows[0].id, status: 'active' })
      return
    }

    if (request.url === '/api/notification-schedules') {
      const body = await readJson(request) as NotificationScheduleRequest
      const departureAt = body.departureAt ? new Date(body.departureAt) : null
      const notifyAt = body.notifyAt ? new Date(body.notifyAt) : null

      if (
        !body.pushSubscriptionId
        || !body.tripId
        || !departureAt
        || !notifyAt
        || Number.isNaN(departureAt.getTime())
        || Number.isNaN(notifyAt.getTime())
      ) {
        respond(400, { error: '通知予定の情報が不完全です。' })
        return
      }

      const result = await pool.query<{ id: string; status: string }>(`
        INSERT INTO notification_schedules (
          push_subscription_id,
          trip_id,
          departure_at,
          notify_at
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (push_subscription_id, trip_id, notify_at) DO UPDATE SET
          departure_at = EXCLUDED.departure_at,
          status = 'pending',
          sent_at = NULL
        RETURNING id, status
      `, [body.pushSubscriptionId, body.tripId, departureAt, notifyAt])

      respond(201, result.rows[0])
      return
    }

    respond(404, { error: '見つからないAPIです。' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '通知設定の保存に失敗しました。'
    respond(500, { error: message })
  }
})

type ManualLastDeparture = {
  stopId: string
  stopName: string
  directionLabel: string
  dayType: DayType
  lastDepartureTime: string | null
  routeLabel: string | null
  sourceUrl: string
  sourceCheckedAt: string
}

function isDayType(value: string | null): value is DayType {
  return value === 'weekday' || value === 'saturday' || value === 'holiday'
}

server.listen(config.port, () => {
  console.log(`通知APIを http://localhost:${config.port} で起動しました。`)
})
