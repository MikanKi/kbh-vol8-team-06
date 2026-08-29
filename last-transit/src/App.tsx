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
      <p className="mt-3 text-slate-600">京都市バスの停留所を選び、路線・行先ごとの最終便を確認できます。</p>
      <form className="mt-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-800" htmlFor="stop-id">停留所</label>
        <div className="mt-2 flex gap-2">
          <select id="stop-id" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2" value={stopId} onChange={(event) => setStopId(event.target.value)} disabled={stops.length === 0}>
            <option value="">{stops.length ? '停留所を選択' : '停留所を読み込み中…'}</option>
            {stops.map((stop) => <option key={stop.stop_id} value={stop.stop_id}>{stop.stop_name}（{stop.stop_id}）</option>)}
          </select>
          <button className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">{loading ? '検索中…' : '最終便を調べる'}</button>
        </div>
      </form>
      {status && <p className="mt-4 text-sm text-slate-600" role="status">{status}</p>}
      {departures.length > 0 && <section className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200" aria-label="最終便一覧">
        <ul className="divide-y divide-slate-100">{departures.map((departure) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={`${departure.tripId}-${departure.departureTime}`}><div><p className="font-semibold text-slate-900">{departure.routeName}</p><p className="text-sm text-slate-600">{departure.headsign || '行先情報なし'}</p></div><time className="text-lg font-bold text-teal-700">{departure.departureTime}</time></li>)}</ul>
      </section>}
      <div className="mt-8">
        <ManualLastDeparture pushSubscriptionId={pushSubscriptionId} />
      </div>
      <div className="mt-5">
        <NotificationSetup onSubscribed={handleSubscribed} onUnsubscribed={handleUnsubscribed} />
      </div>
    </main>
  )
}
