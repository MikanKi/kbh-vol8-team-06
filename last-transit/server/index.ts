import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { config } from './config.js'
import { pool } from './database.js'

type PushSubscriptionRequest = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': config.appOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
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
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, null)
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/push-subscriptions') {
    sendJson(response, 404, { error: '見つからないAPIです。' })
    return
  }

  try {
    const body = await readJson(request) as PushSubscriptionRequest
    if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
      sendJson(response, 400, { error: '通知の購読情報が不完全です。' })
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

    sendJson(response, 201, { id: result.rows[0].id, status: 'active' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '通知設定の保存に失敗しました。'
    sendJson(response, 500, { error: message })
  }
})

server.listen(config.port, () => {
  console.log(`通知APIを http://localhost:${config.port} で起動しました。`)
})
