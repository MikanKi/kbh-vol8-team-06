import type { PushSubscriptionPayload } from './push-notifications'

type PushSubscriptionResponse = {
  id: string
  status: 'active'
}

export async function savePushSubscription(
  subscription: PushSubscriptionPayload,
): Promise<PushSubscriptionResponse> {
  const publicKey = subscription.keys?.p256dh
  const authKey = subscription.keys?.auth

  if (!subscription.endpoint || !publicKey || !authKey) {
    throw new Error('通知の購読情報が不完全です。もう一度設定してください。')
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  const response = await fetch(`${baseUrl}/api/push-subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: { p256dh: publicKey, auth: authKey },
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? '通知設定を保存できませんでした。')
  }

  return response.json() as Promise<PushSubscriptionResponse>
}
