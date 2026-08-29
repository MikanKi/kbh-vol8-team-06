-- 京都バス「赤の宮」停留所のデモ用最終便データ。
-- Supabase SQL Editor で実行する。全件 GTFS 取込を行うまでの限定データである。
-- このスクリプトは何度実行しても同じ内容になる。他の京都バスデータは消さない。

BEGIN;

INSERT INTO bus_stops (source, stop_id, stop_name, stop_lat, stop_lon)
VALUES
  ('kyoto-bus', 'demo-akanomiya', '赤の宮', NULL, NULL),
  ('kyoto-bus', 'demo-asagirogaharacho', '朝露ヶ原町', NULL, NULL)
ON CONFLICT (source, stop_id) DO UPDATE
SET stop_name = EXCLUDED.stop_name, stop_lat = EXCLUDED.stop_lat, stop_lon = EXCLUDED.stop_lon;

-- 日曜を休日としている。祝日が平日に当たる場合は下の例外登録も必要。
INSERT INTO bus_service_calendars (
  source, service_id, start_date, end_date,
  monday, tuesday, wednesday, thursday, friday, saturday, sunday
) VALUES
  ('kyoto-bus', 'demo-weekday', '2026-01-01', '2030-12-31', true, true, true, true, true, false, false),
  ('kyoto-bus', 'demo-saturday', '2026-01-01', '2030-12-31', false, false, false, false, false, true, false),
  ('kyoto-bus', 'demo-holiday', '2026-01-01', '2030-12-31', false, false, false, false, false, false, true)
ON CONFLICT (source, service_id) DO UPDATE
SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
    monday = EXCLUDED.monday, tuesday = EXCLUDED.tuesday, wednesday = EXCLUDED.wednesday,
    thursday = EXCLUDED.thursday, friday = EXCLUDED.friday, saturday = EXCLUDED.saturday,
    sunday = EXCLUDED.sunday;

-- route_id を行先ごとに分けることで、API は各行先の最終便を1件ずつ返す。
INSERT INTO bus_departures (
  source, trip_id, stop_id, stop_sequence, service_id,
  route_id, route_name, trip_headsign, departure_seconds
) VALUES
  ('kyoto-bus', 'demo-demachiyanagi-weekday', 'demo-akanomiya', 1, 'demo-weekday', 'demo-demachiyanagi', '京都バス', '出町柳駅前行', 80520),
  ('kyoto-bus', 'demo-kyoto-station-weekday', 'demo-akanomiya', 1, 'demo-weekday', 'demo-kyoto-station', '京都バス', '京都駅前行', 80520),
  ('kyoto-bus', 'demo-shijo-kawaramachi-weekday', 'demo-akanomiya', 1, 'demo-weekday', 'demo-shijo-kawaramachi', '京都バス', '四条河原町行', 80520),
  ('kyoto-bus', 'demo-sanjo-keihan-weekday', 'demo-akanomiya', 1, 'demo-weekday', 'demo-sanjo-keihan', '京都バス', '三条京阪前行', 80520),
  ('kyoto-bus', 'demo-demachiyanagi-saturday', 'demo-akanomiya', 1, 'demo-saturday', 'demo-demachiyanagi', '京都バス', '出町柳駅前行', 79320),
  ('kyoto-bus', 'demo-kyoto-station-saturday', 'demo-akanomiya', 1, 'demo-saturday', 'demo-kyoto-station', '京都バス', '京都駅前行', 79320),
  ('kyoto-bus', 'demo-shijo-kawaramachi-saturday', 'demo-akanomiya', 1, 'demo-saturday', 'demo-shijo-kawaramachi', '京都バス', '四条河原町行', 79320),
  ('kyoto-bus', 'demo-sanjo-keihan-saturday', 'demo-akanomiya', 1, 'demo-saturday', 'demo-sanjo-keihan', '京都バス', '三条京阪前行', 79320),
  ('kyoto-bus', 'demo-demachiyanagi-holiday', 'demo-akanomiya', 1, 'demo-holiday', 'demo-demachiyanagi', '京都バス', '出町柳駅前行', 79320),
  ('kyoto-bus', 'demo-kyoto-station-holiday', 'demo-akanomiya', 1, 'demo-holiday', 'demo-kyoto-station', '京都バス', '京都駅前行', 79320),
  ('kyoto-bus', 'demo-shijo-kawaramachi-holiday', 'demo-akanomiya', 1, 'demo-holiday', 'demo-shijo-kawaramachi', '京都バス', '四条河原町行', 79320),
  ('kyoto-bus', 'demo-sanjo-keihan-holiday', 'demo-akanomiya', 1, 'demo-holiday', 'demo-sanjo-keihan', '京都バス', '三条京阪前行', 79320),
  ('kyoto-bus', 'demo-asagirogaharacho-demachiyanagi-weekday', 'demo-asagirogaharacho', 1, 'demo-weekday', 'demo-demachiyanagi', '京都バス', '出町柳駅前行', 73080),
  ('kyoto-bus', 'demo-asagirogaharacho-kitaoji-weekday', 'demo-asagirogaharacho', 1, 'demo-weekday', 'demo-kitaoji-terminal', '京都バス', '北大路バスターミナル行', 73080),
  ('kyoto-bus', 'demo-asagirogaharacho-demachiyanagi-saturday', 'demo-asagirogaharacho', 1, 'demo-saturday', 'demo-demachiyanagi', '京都バス', '出町柳駅前行', 68580),
  ('kyoto-bus', 'demo-asagirogaharacho-kitaoji-saturday', 'demo-asagirogaharacho', 1, 'demo-saturday', 'demo-kitaoji-terminal', '京都バス', '北大路バスターミナル行', 68580),
  ('kyoto-bus', 'demo-asagirogaharacho-demachiyanagi-holiday', 'demo-asagirogaharacho', 1, 'demo-holiday', 'demo-demachiyanagi', '京都バス', '出町柳駅前行', 68580),
  ('kyoto-bus', 'demo-asagirogaharacho-kitaoji-holiday', 'demo-asagirogaharacho', 1, 'demo-holiday', 'demo-kitaoji-terminal', '京都バス', '北大路バスターミナル行', 68580)
ON CONFLICT (source, trip_id, stop_id, stop_sequence) DO UPDATE
SET service_id = EXCLUDED.service_id, route_id = EXCLUDED.route_id, route_name = EXCLUDED.route_name,
    trip_headsign = EXCLUDED.trip_headsign, departure_seconds = EXCLUDED.departure_seconds;

COMMIT;
