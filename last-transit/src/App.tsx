import { useEffect, useState } from 'react'
import NotificationSetup from './components/NotificationSetup'
import ManualLastDeparture from './components/ManualLastDeparture'
import { deactivatePushSubscription, savePushSubscription } from './lib/push-subscription-api'

export default function App() {
  const [pushSubscriptionId, setPushSubscriptionId] = useState<string | null>(null)

  useEffect(() => {
    setPushSubscriptionId(localStorage.getItem('pushSubscriptionId'))
  }, [])

  async function handleSubscribed(subscription: Parameters<typeof savePushSubscription>[0]) {
    const response = await savePushSubscription(subscription)
    localStorage.setItem('pushSubscriptionId', response.id)
    setPushSubscriptionId(response.id)
    return response
  }

  async function handleUnsubscribed(endpoint: string) {
    await deactivatePushSubscription(endpoint)
    localStorage.removeItem('pushSubscriptionId')
    setPushSubscriptionId(null)
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-12">
      <p className="text-sm font-semibold text-teal-700">京都府</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">終電・終バス通知</h1>
      <p className="mt-3 text-slate-600">出発地と目的地を設定すると、最終便が近づいたときにお知らせします。</p>
      <div className="mt-8">
        <ManualLastDeparture pushSubscriptionId={pushSubscriptionId} />
      </div>
      <div className="mt-5">
        <NotificationSetup onSubscribed={handleSubscribed} onUnsubscribed={handleUnsubscribed} />
      </div>
    </main>
  )
}
