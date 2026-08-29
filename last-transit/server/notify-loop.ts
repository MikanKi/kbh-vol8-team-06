import { pool } from './database.js'
import { sendDueNotifications } from './send-due-notifications.js'

let isRunning = false

async function runOnce() {
  if (isRunning) return
  isRunning = true

  try {
    const count = await sendDueNotifications()
    console.log(`通知確認完了: ${count}件`) 
  } catch (error) {
    console.error('通知の定期実行に失敗しました。', error)
  } finally {
    isRunning = false
  }
}

await runOnce()
const timer = setInterval(() => { void runOnce() }, 60_000)

async function shutdown() {
  clearInterval(timer)
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })

console.log('通知の自動確認を開始しました（1分ごと）。Ctrl + C で停止します。')
