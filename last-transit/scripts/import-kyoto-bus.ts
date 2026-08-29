import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Pool } from 'pg'

const SOURCE = 'kyoto-city-bus'
const gtfsDirectory = process.argv[2]

if (!gtfsDirectory || !process.env.DATABASE_URL) {
  console.error('使い方: npm run import:kyoto-bus -- /path/to/unpacked-gtfs')
  console.error('DATABASE_URL は .env.server に設定してください。')
  process.exit(1)
}

type CsvRow = Record<string, string>

function parseCsv(value: string): CsvRow[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') { field += '"'; index += 1 }
      else if (character === '"') quoted = false
      else field += character
    } else if (character === '"') quoted = true
    else if (character === ',') { row.push(field); field = '' }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += character
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const [firstHeader, ...headerRest] = rows[0]
  const header = [firstHeader.replace(/^\uFEFF/, ''), ...headerRest]
  const data = rows.slice(1)
  return data.filter((cells) => cells.some(Boolean)).map((cells) => Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ''])))
}

async function readGtfs(file: string) {
  return parseCsv(await readFile(join(resolve(gtfsDirectory), file), 'utf8'))
}

function timeToSeconds(time: string) {
  const parts = time.split(':').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error(`不正な時刻です: ${time}`)
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

async function insertRows(client: import('pg').PoolClient, table: string, columns: string[], rows: unknown[][]) {
  for (let offset = 0; offset < rows.length; offset += 250) {
    const batch = rows.slice(offset, offset + 250)
    const values = batch.flatMap((row, rowIndex) => row.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`))
    await client.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${batch.map((_, index) => `(${values.slice(index * columns.length, (index + 1) * columns.length).join(', ')})`).join(', ')}`,
      batch.flat())
  }
}

const [stops, routes, trips, stopTimes, calendars, exceptions] = await Promise.all([
  readGtfs('stops.txt'), readGtfs('routes.txt'), readGtfs('trips.txt'), readGtfs('stop_times.txt'),
  readGtfs('calendar.txt').catch(() => []), readGtfs('calendar_dates.txt').catch(() => []),
])
if (calendars.length === 0) throw new Error('calendar.txt が見つかりません。京都市バスGTFSの展開先を指定してください。')
const routeNames = new Map(routes.map((route) => [route.route_id, route.route_short_name || route.route_long_name || route.route_id]))
const tripsById = new Map(trips.map((trip) => [trip.trip_id, trip]))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  await client.query('BEGIN')
  await client.query('DELETE FROM bus_departures WHERE source = $1', [SOURCE])
  await client.query('DELETE FROM bus_service_exceptions WHERE source = $1', [SOURCE])
  await client.query('DELETE FROM bus_service_calendars WHERE source = $1', [SOURCE])
  await client.query('DELETE FROM bus_stops WHERE source = $1', [SOURCE])
  await insertRows(client, 'bus_stops', ['source', 'stop_id', 'stop_name', 'stop_lat', 'stop_lon'], stops.map((stop) => [SOURCE, stop.stop_id, stop.stop_name, Number(stop.stop_lat) || null, Number(stop.stop_lon) || null]))
  await insertRows(client, 'bus_service_calendars', ['source', 'service_id', 'start_date', 'end_date', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], calendars.map((calendar) => [SOURCE, calendar.service_id, calendar.start_date, calendar.end_date, ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => calendar[day] === '1')]))
  await insertRows(client, 'bus_service_exceptions', ['source', 'service_id', 'service_date', 'exception_type'], exceptions.map((exception) => [SOURCE, exception.service_id, exception.date, Number(exception.exception_type)]))
  const departures = stopTimes.flatMap((stopTime) => {
    const trip = tripsById.get(stopTime.trip_id)
    if (!trip || !stopTime.departure_time) return []
    return [[SOURCE, trip.trip_id, stopTime.stop_id, Number(stopTime.stop_sequence), trip.service_id, trip.route_id, routeNames.get(trip.route_id) ?? trip.route_id, trip.trip_headsign || null, timeToSeconds(stopTime.departure_time)]]
  })
  await insertRows(client, 'bus_departures', ['source', 'trip_id', 'stop_id', 'stop_sequence', 'service_id', 'route_id', 'route_name', 'trip_headsign', 'departure_seconds'], departures)
  await client.query('COMMIT')
  console.log(`京都市バスGTFSを取り込みました: 停留所 ${stops.length} 件、時刻表 ${departures.length} 件`)
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
