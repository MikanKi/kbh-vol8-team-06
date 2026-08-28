CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_subscription_id UUID NOT NULL REFERENCES push_subscriptions(id),
  trip_id TEXT NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  notify_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX notification_schedules_subscription_trip_notify_at_idx
  ON notification_schedules (push_subscription_id, trip_id, notify_at);

CREATE INDEX notification_schedules_pending_notify_at_idx
  ON notification_schedules (notify_at)
  WHERE status = 'pending';

CREATE TABLE gtfs_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  publisher_name TEXT,
  publisher_url TEXT,
  version TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gtfs_stops (
  feed_id UUID NOT NULL REFERENCES gtfs_feeds(id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  PRIMARY KEY (feed_id, stop_id)
);

CREATE TABLE gtfs_routes (
  feed_id UUID NOT NULL REFERENCES gtfs_feeds(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL,
  agency_id TEXT,
  short_name TEXT,
  long_name TEXT,
  route_type INTEGER,
  PRIMARY KEY (feed_id, route_id)
);

CREATE TABLE gtfs_trips (
  feed_id UUID NOT NULL REFERENCES gtfs_feeds(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  headsign TEXT,
  direction_id INTEGER,
  PRIMARY KEY (feed_id, trip_id)
);

CREATE TABLE gtfs_stop_times (
  feed_id UUID NOT NULL REFERENCES gtfs_feeds(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL,
  stop_id TEXT NOT NULL,
  stop_sequence INTEGER NOT NULL,
  arrival_time TEXT,
  departure_time TEXT,
  pickup_type INTEGER,
  drop_off_type INTEGER,
  PRIMARY KEY (feed_id, trip_id, stop_sequence)
);

CREATE INDEX gtfs_stop_times_stop_departure_idx
  ON gtfs_stop_times (feed_id, stop_id, departure_time);

CREATE TABLE gtfs_calendar (
  feed_id UUID NOT NULL REFERENCES gtfs_feeds(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  monday BOOLEAN NOT NULL,
  tuesday BOOLEAN NOT NULL,
  wednesday BOOLEAN NOT NULL,
  thursday BOOLEAN NOT NULL,
  friday BOOLEAN NOT NULL,
  saturday BOOLEAN NOT NULL,
  sunday BOOLEAN NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  PRIMARY KEY (feed_id, service_id)
);

CREATE TABLE gtfs_calendar_dates (
  feed_id UUID NOT NULL REFERENCES gtfs_feeds(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  date DATE NOT NULL,
  exception_type INTEGER NOT NULL,
  PRIMARY KEY (feed_id, service_id, date)
);
