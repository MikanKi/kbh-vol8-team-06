import { config } from './config.js'
import { pool } from './database.js'

type DayType = 'weekday' | 'saturday' | 'holiday'

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

function isDayType(value: string | null): value is DayType {
  return value === 'weekday' || value === 'saturday' || value === 'holiday'
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return config.appOrigin

  try {
    const url = new URL(origin)
    if (url.hostname === 'localhost' && /^517\d$/.test(url.port)) return origin
  } catch {
    // 不正なOriginには本番用の許可Originを返します。
  }

  return config.appOrigin
}

export function json(request: Request, status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin(request),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
    },
  })
}

export function options(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin(request),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
    },
  })
}

export async function savePushSubscription(request: Request) {
  const body = await request.json() as PushSubscriptionRequest
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return json(request, 400, { error: '通知の購読情報が不完全です。' })
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

  return json(request, 201, { id: result.rows[0].id, status: 'active' })
}

export async function saveNotificationSchedule(request: Request) {
  const body = await request.json() as NotificationScheduleRequest
  const departureAt = body.departureAt ? new Date(body.departureAt) : null
  const notifyAt = body.notifyAt ? new Date(body.notifyAt) : null

  if (!body.pushSubscriptionId || !body.tripId || !departureAt || !notifyAt
    || Number.isNaN(departureAt.getTime()) || Number.isNaN(notifyAt.getTime())) {
    return json(request, 400, { error: '通知予定の情報が不完全です。' })
  }

  const result = await pool.query<{ id: string; status: string }>(`
    INSERT INTO notification_schedules (push_subscription_id, trip_id, departure_at, notify_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (push_subscription_id, trip_id, notify_at) DO UPDATE SET
      departure_at = EXCLUDED.departure_at,
      status = 'pending',
      sent_at = NULL
    RETURNING id, status
  `, [body.pushSubscriptionId, body.tripId, departureAt, notifyAt])

  return json(request, 201, result.rows[0])
}

export async function getManualLastDeparture(request: Request) {
  const { searchParams } = new URL(request.url)
  const stopId = searchParams.get('stopId')
  const dayType = searchParams.get('dayType')

  if (!stopId || !isDayType(dayType)) {
    return json(request, 400, { error: 'stopIdとdayType（weekday / saturday / holiday）が必要です。' })
  }

  const result = await pool.query(`
    SELECT
      stop_id AS "stopId", stop_name AS "stopName", direction_label AS "directionLabel",
      day_type AS "dayType", last_departure_time::text AS "lastDepartureTime",
      route_label AS "routeLabel", source_url AS "sourceUrl", source_checked_at AS "sourceCheckedAt"
    FROM manual_last_departures
    WHERE stop_id = $1 AND day_type = $2 AND is_active = TRUE
  `, [stopId, dayType])

  const departure = result.rows[0] as { lastDepartureTime: string | null } | undefined
  if (!departure?.lastDepartureTime) {
    return json(request, 404, { error: 'この停留所・運行日の最終便はまだ登録されていません。' })
  }

  return json(request, 200, departure)
}
