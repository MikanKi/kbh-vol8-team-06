import { getManualLastDeparture, json, options } from '../server/vercel-handlers.js'

export const runtime = 'nodejs'

export function OPTIONS(request: Request) {
  return options(request)
}

export async function GET(request: Request) {
  try {
    return await getManualLastDeparture(request)
  } catch (error) {
    return json(request, 500, { error: error instanceof Error ? error.message : '最終便データの取得に失敗しました。' })
  }
}
