export type PushSubscriptionPayload = PushSubscriptionJSON

const serviceWorkerPath = '/service-worker.js'

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const normalizedValue = value.trim().replaceAll(/\s/g, '')
  if (!/^[A-Za-z0-9_-]+$/.test(normalizedValue)) {
    throw new Error('VAPID公開鍵の形式が正しくありません。.env.local の公開鍵だけを確認してください。')
  }

  const padding = '='.repeat((4 - (normalizedValue.length % 4)) % 4)
  const base64 = (normalizedValue + padding).replace(/-/g, '+').replace(/_/g, '/')
  let rawData: string

  try {
    rawData = window.atob(base64)
  } catch {
    throw new Error('VAPID公開鍵を読み取れません。.env.local の値を確認してください。')
  }
  const output = new Uint8Array(new ArrayBuffer(rawData.length))

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }

  return output.buffer
}

export function supportsPushNotifications(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function subscribeToPushNotifications(): Promise<PushSubscriptionPayload> {
  if (!supportsPushNotifications()) {
    throw new Error('このブラウザはプッシュ通知に対応していません。')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('通知の許可が必要です。ブラウザの設定から許可してください。')
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) {
    throw new Error('VITE_VAPID_PUBLIC_KEY が設定されていません。')
  }

  const registration = await navigator.serviceWorker.register(serviceWorkerPath)
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToArrayBuffer(publicKey),
  })

  return subscription.toJSON()
}

export async function unsubscribeFromPushNotifications(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null

  const registration = await navigator.serviceWorker.getRegistration(serviceWorkerPath)
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return null

  const endpoint = subscription.endpoint
  const didUnsubscribe = await subscription.unsubscribe()
  if (!didUnsubscribe) throw new Error('ブラウザ上の通知解除に失敗しました。')

  return endpoint
}
