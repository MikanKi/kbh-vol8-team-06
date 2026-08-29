import AdmZip from 'adm-zip'
import { parse } from 'csv-parse/sync'
import type { PoolClient } from 'pg'
import { gtfsConfig } from './config.js'
import { pool } from './database.js'

type CsvRow = Record<string, string>

type FeedMetadata = {
  feed_publisher_name?: string
  feed_publisher_url?: string
  feed_version?: string
}

const feedCode = 'kyoto-bus'

function optionalInteger(value: string | undefined): number | null {
  if (!value) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function optionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null
  }
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function gtfsDate(value: string): string {
  if (!/^\d{8}$/.test(value)) {
    throw new Error(`GTFSの日付形式が不正です: ${value}`)
  }
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function parseCsv(zip: AdmZip, filename: string, required = true): CsvRow[] {
  const entry = zip.getEntry(filename)
  if (!entry) {
    if (required) {
      throw new Error(`GTFSに必須ファイル ${filename} がありません。`)
    }
    return []
  }

  return parse(entry.getData().toString('utf8').replace(/^\uFEFF/, ''), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[]
}

async function insertRows(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: Array<Array<string | number | boolean | null>>,
) {
  const batchSize = 250
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize)
    const values: Array<string | number | boolean | null> = []
    const placeholders = batch.map((row, rowIndex) => {
      const offset = rowIndex * columns.length
      values.push(...row)
      return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(', ')})`
    })
    await client.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`, values)
  }
}

async function importGtfs() {
  const source = gtfsConfig()
  const sourceUrl = new URL(source.kyotoBusGtfsUrl)
  sourceUrl.searchParams.set('acl:consumerKey', source.odptConsumerKey)

  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`GTFSの取得に失敗しました: ${response.status} ${response.statusText}`)
  }

  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()))
  const metadata = parseCsv(zip, 'feed_info.txt', false)[0] as FeedMetadata | undefined
  const stops = parseCsv(zip, 'stops.txt')
  const routes = parseCsv(zip, 'routes.txt')
  const trips = parseCsv(zip, 'trips.txt')
  const stopTimes = parseCsv(zip, 'stop_times.txt')
  const calendar = parseCsv(zip, 'calendar.txt', false)
  const calendarDates = parseCsv(zip, 'calendar_dates.txt', false)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const feedResult = await client.query<{ id: string }>(`
      INSERT INTO gtfs_feeds (code, publisher_name, publisher_url, version, imported_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (code) DO UPDATE SET
        publisher_name = EXCLUDED.publisher_name,
        publisher_url = EXCLUDED.publisher_url,
        version = EXCLUDED.version,
        imported_at = NOW()
      RETURNING id
    `, [feedCode, metadata?.feed_publisher_name ?? null, metadata?.feed_publisher_url ?? null, metadata?.feed_version ?? null])
    const feedId = feedResult.rows[0].id

    await client.query('DELETE FROM gtfs_stop_times WHERE feed_id = $1', [feedId])
    await client.query('DELETE FROM gtfs_trips WHERE feed_id = $1', [feedId])
    await client.query('DELETE FROM gtfs_routes WHERE feed_id = $1', [feedId])
    await client.query('DELETE FROM gtfs_calendar_dates WHERE feed_id = $1', [feedId])
    await client.query('DELETE FROM gtfs_calendar WHERE feed_id = $1', [feedId])
    await client.query('DELETE FROM gtfs_stops WHERE feed_id = $1', [feedId])

    await insertRows(client, 'gtfs_stops', ['feed_id', 'stop_id', 'name', 'latitude', 'longitude'], stops.map((row) => [
      feedId, row.stop_id, row.stop_name, optionalNumber(row.stop_lat), optionalNumber(row.stop_lon),
    ]))
    await insertRows(client, 'gtfs_routes', ['feed_id', 'route_id', 'agency_id', 'short_name', 'long_name', 'route_type'], routes.map((row) => [
      feedId, row.route_id, row.agency_id || null, row.route_short_name || null, row.route_long_name || null, optionalInteger(row.route_type),
    ]))
    await insertRows(client, 'gtfs_trips', ['feed_id', 'trip_id', 'route_id', 'service_id', 'headsign', 'direction_id'], trips.map((row) => [
      feedId, row.trip_id, row.route_id, row.service_id, row.trip_headsign || null, optionalInteger(row.direction_id),
    ]))
    await insertRows(client, 'gtfs_stop_times', ['feed_id', 'trip_id', 'stop_id', 'stop_sequence', 'arrival_time', 'departure_time', 'pickup_type', 'drop_off_type'], stopTimes.map((row) => [
      feedId, row.trip_id, row.stop_id, optionalInteger(row.stop_sequence) ?? 0, row.arrival_time || null, row.departure_time || null, optionalInteger(row.pickup_type), optionalInteger(row.drop_off_type),
    ]))
    await insertRows(client, 'gtfs_calendar', ['feed_id', 'service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'], calendar.map((row) => [
      feedId, row.service_id, row.monday === '1', row.tuesday === '1', row.wednesday === '1', row.thursday === '1', row.friday === '1', row.saturday === '1', row.sunday === '1', gtfsDate(row.start_date), gtfsDate(row.end_date),
    ]))
    await insertRows(client, 'gtfs_calendar_dates', ['feed_id', 'service_id', 'date', 'exception_type'], calendarDates.map((row) => [
      feedId, row.service_id, gtfsDate(row.date), optionalInteger(row.exception_type) ?? 0,
    ]))

    await client.query('COMMIT')
    console.log(`京都バスGTFSを取り込みました（停留所: ${stops.length}件、便: ${trips.length}件、時刻: ${stopTimes.length}件）。`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

importGtfs()
  .catch((error: unknown) => {
    console.error('京都バスGTFSの取込に失敗しました。', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
