import NotificationSetup from './components/NotificationSetup'
import { savePushSubscription } from './lib/push-subscription-api'

export default function App() {
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-12">
      <p className="text-sm font-semibold text-teal-700">京都府</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">終電・終バス通知</h1>
      <p className="mt-3 text-slate-600">出発地と目的地を設定すると、最終便が近づいたときにお知らせします。</p>
      <div className="mt-8">
        <NotificationSetup onSubscribed={savePushSubscription} />
      </div>
    </main>
  )
}
