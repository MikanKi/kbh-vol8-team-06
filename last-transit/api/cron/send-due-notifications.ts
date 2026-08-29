import { pool } from '../../server/database.js'
import { json } from '../../server/vercel-handlers.js'
import { sendDueNotifications } from '../../server/send-due-notifications.js'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json(request, 401, { error: '認証に失敗しました。' })
  }

  try {
    const count = await sendDueNotifications()
    return json(request, 200, { status: 'ok', sentCount: count })
  } catch (error) {
    return json(request, 500, { error: error instanceof Error ? error.message : '通知送信に失敗しました。' })
  } finally {
    // Vercel Functionでは接続を使い回すため、Poolは終了しません。
    void pool
  }
}
