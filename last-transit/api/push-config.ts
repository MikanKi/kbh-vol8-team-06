import { getPushConfig, options } from '../server/vercel-handlers.js'

export const runtime = 'nodejs'

export function OPTIONS(request: Request) {
  return options(request)
}

export function GET(request: Request) {
  return getPushConfig(request)
}
