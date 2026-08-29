-- ODPTの利用承認前に使う、京都バス公式時刻表の手入力データです。
-- 既存のschema.sqlと002_gtfs_schema.sqlを実行したSupabase SQL Editorで実行してください。

CREATE TABLE IF NOT EXISTS manual_last_departures (
  stop_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  direction_label TEXT NOT NULL,
  day_type TEXT NOT NULL CHECK (day_type IN ('weekday', 'saturday', 'holiday')),
  last_departure_time TIME,
  route_label TEXT,
  source_url TEXT NOT NULL,
  source_checked_at DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (stop_id, day_type)
);

-- NULLは「未登録」を表します。時刻を推測して通知することはしません。
INSERT INTO manual_last_departures (
  stop_id, stop_name, direction_label, day_type, last_departure_time,
  route_label, source_url, source_checked_at
) VALUES
  ('6001_2', '赤の宮', '大原方面', 'weekday', '19:36', '特17 大原行', 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=6001_2', '2026-08-28'),
  ('6001_2', '赤の宮', '大原方面', 'saturday', NULL, NULL, 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=6001_2', '2026-08-28'),
  ('6001_2', '赤の宮', '大原方面', 'holiday', NULL, NULL, 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=6001_2', '2026-08-28'),
  ('472_1', '朝露ヶ原町', '出町柳・北大路方面', 'weekday', '20:18', '36 出町柳駅前行', 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=472_1', '2026-08-28'),
  ('472_1', '朝露ヶ原町', '出町柳・北大路方面', 'saturday', NULL, NULL, 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=472_1', '2026-08-28'),
  ('472_1', '朝露ヶ原町', '出町柳・北大路方面', 'holiday', NULL, NULL, 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=472_1', '2026-08-28'),
  ('906_1', '飛鳥井町', '京都駅前方面', 'weekday', '20:24', '臨時 京都駅前行', 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=906_1', '2026-08-28'),
  ('906_1', '飛鳥井町', '京都駅前方面', 'saturday', NULL, NULL, 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=906_1', '2026-08-28'),
  ('906_1', '飛鳥井町', '京都駅前方面', 'holiday', NULL, NULL, 'https://www.kyotobus.jp/route/timetable/schedule.html?stop_id=906_1', '2026-08-28')
ON CONFLICT (stop_id, day_type) DO UPDATE SET
  stop_name = EXCLUDED.stop_name,
  direction_label = EXCLUDED.direction_label,
  last_departure_time = EXCLUDED.last_departure_time,
  route_label = EXCLUDED.route_label,
  source_url = EXCLUDED.source_url,
  source_checked_at = EXCLUDED.source_checked_at,
  is_active = TRUE;

-- 土曜・休日の公式時刻表を確認したら、例えば次のように時刻を入力します。
-- UPDATE manual_last_departures
-- SET last_departure_time = 'HH:MM', route_label = '系統 行先', source_checked_at = CURRENT_DATE
-- WHERE stop_id = '6001_2' AND day_type = 'saturday';
