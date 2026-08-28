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
