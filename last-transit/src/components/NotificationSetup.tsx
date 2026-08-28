import { useEffect, useState } from 'react'
import {
  subscribeToPushNotifications,
  supportsPushNotifications,
  type PushSubscriptionPayload,
} from '../lib/push-notifications'

type NotificationSetupProps = {
  onSubscribed?: (subscription: PushSubscriptionPayload) => Promise<unknown>
}

export default function NotificationSetup({ onSubscribed }: NotificationSetupProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [status, setStatus] = useState('通知はまだ有効ではありません。')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setIsSupported(supportsPushNotifications())
  }, [])

  async function handleSubscribe() {
    setIsSubmitting(true)

    try {
      const subscription = await subscribeToPushNotifications()
      if (onSubscribed) {
        await onSubscribed(subscription)
      }
      setStatus('通知を有効にしました。')
    } catch (error) {
      const message = error instanceof Error ? error.message : '通知の設定に失敗しました。'
      setStatus(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isSupported) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        このブラウザでは通知を設定できません。対応ブラウザでお試しください。
      </p>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">終電・終バスの通知</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        設定した時刻に、最終便までの残り時間をお知らせします。
      </p>
      <button
        className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        onClick={handleSubscribe}
        type="button"
      >
        {isSubmitting ? '設定中...' : '通知を有効にする'}
      </button>
      <p aria-live="polite" className="mt-3 text-sm text-slate-600">
        {status}
      </p>
    </section>
  )
}
