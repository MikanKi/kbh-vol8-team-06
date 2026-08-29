import { deactivatePushSubscription, json, options, savePushSubscription } from '../server/vercel-handlers.js'

export const runtime = 'nodejs'

export function OPTIONS(request: Request) {
  return options(request)
}

export async function POST(request: Request) {
  try {
    return await savePushSubscription(request)
  } catch (error) {
    return json(request, 500, { error: error instanceof Error ? error.message : '通知設定を保存できませんでした。' })
  }
}

export async function DELETE(request: Request) {
  try {
    return await deactivatePushSubscription(request)
  } catch (error) {
    return json(request, 500, { error: error instanceof Error ? error.message : '通知解除に失敗しました。' })
  }
}
