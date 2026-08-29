export type LastDeparture = {
  tripId: string
  routeId: string
  routeName: string
  headsign: string | null
  departureTime: string
}

type ResponseBody = { stopId: string; serviceDate: string; departures: LastDeparture[] }
export type BusStop = { stop_id: string; stop_name: string }

function edgeBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl) throw new Error('VITE_API_BASE_URL にEdge FunctionのURLを設定してください。')
  return baseUrl
}

export async function getBusStops(): Promise<BusStop[]> {
  const response = await fetch(`${edgeBaseUrl()}/bus-stops`)
  const body = await response.json() as { stops?: BusStop[]; error?: string }
  if (!response.ok) throw new Error(body.error ?? '停留所を取得できませんでした。')
  return body.stops ?? []
}

export async function getLastDepartures(stopId: string): Promise<ResponseBody> {
  const response = await fetch(`${edgeBaseUrl()}/last-departures?stopId=${encodeURIComponent(stopId)}`)
  const body = await response.json() as ResponseBody & { error?: string }
  if (!response.ok) throw new Error(body.error ?? '最終便データを取得できませんでした。')
  return body
}
