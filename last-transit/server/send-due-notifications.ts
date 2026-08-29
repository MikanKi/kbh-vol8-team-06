import webpush, { type PushSubscription } from 'web-push'
import { pathToFileURL } from 'node:url'
import { config } from './config.js'
import { pool } from './database.js'

type DueNotification = {
  scheduleId: string
  subscriptionId: string
  endpoint: string
  p256dhKey: string
  authKey: string
}

webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey)

async function claimDueNotifications(): Promise<DueNotification[]> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query<DueNotification>(`
      SELECT
        schedules.id AS "scheduleId",
        subscriptions.id AS "subscriptionId",
        subscriptions.endpoint,
        subscriptions.p256dh_key AS "p256dhKey",
        subscriptions.auth_key AS "authKey"
      FROM notification_schedules AS schedules
      INNER JOIN push_subscriptions AS subscriptions
        ON subscriptions.id = schedules.push_subscription_id
      WHERE schedules.status = 'pending'
        AND schedules.notify_at <= NOW()
        AND subscriptions.is_active = TRUE
      FOR UPDATE OF schedules SKIP LOCKED
    `)

    if (result.rows.length > 0) {
      await client.query(
        "UPDATE notification_schedules SET status = 'processing' WHERE id = ANY($1::uuid[])",
        [result.rows.map((notification) => notification.scheduleId)],
      )
    }

    await client.query('COMMIT')
    return result.rows
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function sendDueNotifications() {
  const notifications = await claimDueNotifications()

  for (const notification of notifications) {
    const subscription: PushSubscription = {
      endpoint: notification.endpoint,
      keys: { p256dh: notification.p256dhKey, auth: notification.authKey },
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: '終電・終バス通知',
        body: '最終便が近づいています。時刻を確認してください。',
        url: '/',
      }))
      await pool.query(
        "UPDATE notification_schedules SET status = 'sent', sent_at = NOW() WHERE id = $1",
        [notification.scheduleId],
      )
    } catch (error) {
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : undefined
      const isExpiredSubscription = statusCode === 404 || statusCode === 410

      if (isExpiredSubscription) {
        await pool.query('UPDATE push_subscriptions SET is_active = FALSE WHERE id = $1', [notification.subscriptionId])
      }
      await pool.query(
        "UPDATE notification_schedules SET status = 'failed' WHERE id = $1",
        [notification.scheduleId],
      )
      console.error(`通知 ${notification.scheduleId} の送信に失敗しました。`, error)
    }
  }

  return notifications.length
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectExecution) {
  sendDueNotifications()
    .catch((error: unknown) => {
      console.error('通知の定期実行に失敗しました。', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await pool.end()
    })
}
