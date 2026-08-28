type Departure = {
  trip_id: string
  service_id: string
  route_id: string
  route_name: string
  trip_headsign: string | null
  departure_seconds: number
}

type Calendar = {
  service_id: string
  start_date: string
  end_date: string
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

const source = 'kyoto-city-bus'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } })
}

function japanDate(value: string | null) {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  if (value) return value
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

function secondsToTime(seconds: number) {
  const hour = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minute = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  return `${hour}:${minute}`
}

function runsOn(calendar: Calendar, serviceDate: string) {
  if (serviceDate < calendar.start_date || serviceDate > calendar.end_date) return false
  // 日付そのものの曜日を使う。JSTの深夜をUTCで解釈すると前日になるため +09:00 は使わない。
  const date = new Date(`${serviceDate}T00:00:00Z`)
  return calendar[['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getUTCDay()] as keyof Calendar] === true
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'GET') return json({ error: 'GET を使用してください。' }, 405)

  const url = new URL(request.url)
  const stopId = url.searchParams.get('stopId')?.trim()
  const serviceDate = japanDate(url.searchParams.get('date'))
  if (!stopId || !serviceDate) return json({ error: 'stopId と YYYY-MM-DD 形式の date を指定してください。' }, 400)

  const baseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!baseUrl || !serviceKey) return json({ error: 'Supabaseのサーバー設定が不足しています。' }, 500)
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  const api = (path: string) => fetch(`${baseUrl}/rest/v1/${path}`, { headers }).then(async (response) => {
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  })

  try {
    const stopQuery = new URLSearchParams({ source: `eq.${source}`, stop_id: `eq.${stopId}`, select: 'trip_id,service_id,route_id,route_name,trip_headsign,departure_seconds', order: 'departure_seconds.desc' })
    const departures = await api(`bus_departures?${stopQuery}`) as Departure[]
    if (departures.length === 0) return json({ stopId, serviceDate, departures: [] })

    const calendars = await api(`bus_service_calendars?${new URLSearchParams({ source: `eq.${source}`, select: 'service_id,start_date,end_date,monday,tuesday,wednesday,thursday,friday,saturday,sunday' })}`) as Calendar[]
    const exceptions = await api(`bus_service_exceptions?${new URLSearchParams({ source: `eq.${source}`, service_date: `eq.${serviceDate}`, select: 'service_id,exception_type' })}`) as Array<{ service_id: string; exception_type: number }>
    const exceptionByService = new Map(exceptions.map((exception) => [exception.service_id, exception.exception_type]))
    const activeServiceIds = new Set(calendars.filter((calendar) => exceptionByService.get(calendar.service_id) === 1 || (!exceptionByService.has(calendar.service_id) && runsOn(calendar, serviceDate))).map((calendar) => calendar.service_id))
    const lastByDirection = new Map<string, Departure>()
    for (const departure of departures) {
      if (!activeServiceIds.has(departure.service_id)) continue
      const key = `${departure.route_id}\u0000${departure.trip_headsign ?? ''}`
      if (!lastByDirection.has(key)) lastByDirection.set(key, departure)
    }
    const result = [...lastByDirection.values()].sort((a, b) => b.departure_seconds - a.departure_seconds).map((departure) => ({ tripId: departure.trip_id, routeId: departure.route_id, routeName: departure.route_name, headsign: departure.trip_headsign, departureTime: secondsToTime(departure.departure_seconds) }))
    return json({ stopId, serviceDate, departures: result })
  } catch (error) {
    console.error(error)
    return json({ error: '最終便データの取得に失敗しました。' }, 502)
  }
})
