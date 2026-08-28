-- 京都市バス GTFS-JP のみを保持する。地下鉄データはこのスキーマに混在させない。
CREATE TABLE bus_stops (
  source TEXT NOT NULL DEFAULT 'kyoto-city-bus',
  stop_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  stop_lat DOUBLE PRECISION,
  stop_lon DOUBLE PRECISION,
  PRIMARY KEY (source, stop_id)
);

CREATE TABLE bus_service_calendars (
  source TEXT NOT NULL DEFAULT 'kyoto-city-bus',
  service_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monday BOOLEAN NOT NULL,
  tuesday BOOLEAN NOT NULL,
  wednesday BOOLEAN NOT NULL,
  thursday BOOLEAN NOT NULL,
  friday BOOLEAN NOT NULL,
  saturday BOOLEAN NOT NULL,
  sunday BOOLEAN NOT NULL,
  PRIMARY KEY (source, service_id)
);

CREATE TABLE bus_service_exceptions (
  source TEXT NOT NULL DEFAULT 'kyoto-city-bus',
  service_id TEXT NOT NULL,
  service_date DATE NOT NULL,
  exception_type SMALLINT NOT NULL CHECK (exception_type IN (1, 2)),
  PRIMARY KEY (source, service_id, service_date)
);

CREATE TABLE bus_departures (
  source TEXT NOT NULL DEFAULT 'kyoto-city-bus',
  trip_id TEXT NOT NULL,
  stop_id TEXT NOT NULL,
  stop_sequence INTEGER NOT NULL,
  service_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  route_name TEXT NOT NULL,
  trip_headsign TEXT,
  departure_seconds INTEGER NOT NULL CHECK (departure_seconds >= 0),
  PRIMARY KEY (source, trip_id, stop_id, stop_sequence),
  FOREIGN KEY (source, stop_id) REFERENCES bus_stops (source, stop_id),
  FOREIGN KEY (source, service_id) REFERENCES bus_service_calendars (source, service_id)
);

CREATE INDEX bus_departures_stop_last_service_idx
  ON bus_departures (source, stop_id, departure_seconds DESC);
CREATE INDEX bus_service_exceptions_date_idx
  ON bus_service_exceptions (source, service_date);

ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_service_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_service_exceptions ENABLE ROW LEVEL SECURITY;
