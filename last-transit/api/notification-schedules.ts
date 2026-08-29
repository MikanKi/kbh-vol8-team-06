import { json, options, saveNotificationSchedule } from '../server/vercel-handlers.js'

export const runtime = 'nodejs'

export function OPTIONS(request: Request) {
  return options(request)
}

export async function POST(request: Request) {
  try {
    return await saveNotificationSchedule(request)
  } catch (error) {
    return json(request, 500, { error: error instanceof Error ? error.message : '通知予定を保存できませんでした。' })
  }
}
