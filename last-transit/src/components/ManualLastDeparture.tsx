import { useEffect, useState } from 'react'
import { saveNotificationSchedule } from '../lib/notification-schedule-api'

type DayType = 'weekday' | 'saturday' | 'holiday'

type Stop = {
  id: string
  label: string
}

type LastDeparture = {
  stopId: string
  stopName: string
  directionLabel: string
  dayType: DayType
  lastDepartureTime: string
  routeLabel: string | null
  sourceUrl: string
  sourceCheckedAt: string
}

const stops: Stop[] = [
  { id: '6001_2', label: '赤の宮 → 大原方面' },
  { id: '472_1', label: '朝露ヶ原町 → 出町柳・北大路方面' },
  { id: '906_1', label: '飛鳥井町 → 京都駅前方面' },
]

const dayTypeLabels: Record<DayType, string> = {
  weekday: '平日',
  saturday: '土曜',
  holiday: '休日',
}

function formatTime(value: string) {
  return value.slice(0, 5)
}

function departureDate(serviceDate: string, time: string) {
  return new Date(`${serviceDate}T${formatTime(time)}:00+09:00`)
}

function remainingTimeText(serviceDate: string, time: string, now: number) {
  const departureAt = departureDate(serviceDate, time)
  const difference = departureAt.getTime() - now
  const minutes = Math.ceil(difference / 60_000)

  if (difference < 0) return 'この最終便は出発済みです。'
  if (minutes === 0) return 'まもなく出発です。'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours > 0 ? `あと${hours}時間${remainingMinutes}分` : `あと${remainingMinutes}分`
}

type ManualLastDepartureProps = {
  pushSubscriptionId: string | null
}

function todayInJapan() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function ManualLastDeparture({ pushSubscriptionId }: ManualLastDepartureProps) {
  const [stopId, setStopId] = useState(stops[0].id)
  const [dayType, setDayType] = useState<DayType>('weekday')
  const [result, setResult] = useState<LastDeparture | null>(null)
  const [message, setMessage] = useState('停留所と運行日を選んで確認してください。')
  const [isLoading, setIsLoading] = useState(false)
  const [serviceDate, setServiceDate] = useState(todayInJapan)
  const [minutesBefore, setMinutesBefore] = useState('30')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  async function handleSearch() {
    setIsLoading(true)
    setResult(null)

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
      const searchParams = new URLSearchParams({ stopId, dayType })
      const response = await fetch(`${baseUrl}/api/manual-last-departures?${searchParams}`)
      const body = await response.json().catch(() => null) as LastDeparture | { error?: string } | null

      if (!response.ok) {
        const error = body as { error?: string } | null
        setMessage(error?.error ?? '最終便を取得できませんでした。')
        return
      }

      const departure = body as LastDeparture
      setResult(departure)
      setMessage('最終便を取得しました。')
    } catch {
      setMessage('APIに接続できません。通知APIが起動しているか確認してください。')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleScheduleNotification() {
    if (!result) return
    if (!pushSubscriptionId) {
      setNotificationMessage('先に下の「通知を有効にする」を押してください。')
      return
    }

    const departureAt = departureDate(serviceDate, result.lastDepartureTime)
    const leadMinutes = Number(minutesBefore)
    const notifyAt = new Date(departureAt.getTime() - leadMinutes * 60_000)

    if (Number.isNaN(departureAt.getTime()) || leadMinutes < 1) {
      setNotificationMessage('利用日と通知する分数を正しく入力してください。')
      return
    }

    if (departureAt.getTime() <= Date.now()) {
      setNotificationMessage('最終便の出発後です。利用日を未来の日付に変更してください。')
      return
    }

    try {
      await saveNotificationSchedule({
        pushSubscriptionId,
        tripId: `manual:${result.stopId}:${serviceDate}:${result.dayType}:${result.lastDepartureTime}`,
        departureAt,
        notifyAt,
      })
      setNotificationMessage(`${leadMinutes}分前の通知を設定しました。`)
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : '通知予定を保存できませんでした。')
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">京都バスの最終便</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        GPSは使いません。利用する停留所と運行日を自分で選択します。
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          停留所・方面
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            value={stopId}
            onChange={(event) => setStopId(event.target.value)}
          >
            {stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.label}</option>)}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-800">
          運行日
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            value={dayType}
            onChange={(event) => setDayType(event.target.value as DayType)}
          >
            {(Object.keys(dayTypeLabels) as DayType[]).map((value) => (
              <option key={value} value={value}>{dayTypeLabels[value]}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isLoading}
        onClick={handleSearch}
        type="button"
      >
        {isLoading ? '確認中...' : '最終便を確認する'}
      </button>

      <p aria-live="polite" className="mt-3 text-sm text-slate-600">{message}</p>

      {result && (
        <div className="mt-4 rounded-xl bg-teal-50 p-4 text-slate-900">
          <p className="text-sm font-medium">{result.stopName} → {result.directionLabel}</p>
          <p className="mt-1 text-3xl font-bold">最終便 {formatTime(result.lastDepartureTime)}</p>
          <p className="mt-2 text-lg font-semibold text-teal-900">
            {remainingTimeText(serviceDate, result.lastDepartureTime, currentTime)}
          </p>
          {result.routeLabel && <p className="mt-2 text-sm">{result.routeLabel}</p>}
          <a className="mt-3 inline-block text-sm font-medium text-teal-800 underline" href={result.sourceUrl} rel="noreferrer" target="_blank">
            京都バス公式時刻表を確認する
          </a>

          <div className="mt-4 grid gap-3 border-t border-teal-200 pt-4">
            <label className="grid gap-1 text-sm font-medium">
              利用日
              <input
                className="rounded-lg border border-teal-300 bg-white px-3 py-2"
                type="date"
                value={serviceDate}
                onChange={(event) => setServiceDate(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              何分前に通知するか
              <input
                className="rounded-lg border border-teal-300 bg-white px-3 py-2"
                min="1"
                type="number"
                value={minutesBefore}
                onChange={(event) => setMinutesBefore(event.target.value)}
              />
            </label>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              onClick={handleScheduleNotification}
              type="button"
            >
              この最終便の通知を設定する
            </button>
            {notificationMessage && <p aria-live="polite" className="text-sm">{notificationMessage}</p>}
          </div>
        </div>
      )}
    </section>
  )
}
