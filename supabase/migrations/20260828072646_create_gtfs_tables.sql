create table public.stops (
  stop_id text primary key,
  stop_name text not null,
  stop_lat double precision,
  stop_lon double precision,
  location_type integer not null default 0,
  parent_station text,
  transport_type text not null check (transport_type in ('subway', 'bus'))
);

create table public.routes (
  route_id text primary key,
  agency_id text,
  route_short_name text,
  route_long_name text,
  route_type integer not null,
  transport_type text not null check (transport_type in ('subway', 'bus'))
);

create table public.trips (
  trip_id text primary key,
  route_id text not null references public.routes(route_id),
  service_id text not null,
  trip_headsign text
);

create table public.stop_times (
  trip_id text not null references public.trips(trip_id),
  stop_id text not null references public.stops(stop_id),
  stop_sequence integer not null,
  arrival_seconds integer not null,
  departure_seconds integer not null,
  primary key (trip_id, stop_sequence)
);

create table public.calendar (
  service_id text primary key,
  monday boolean not null,
  tuesday boolean not null,
  wednesday boolean not null,
  thursday boolean not null,
  friday boolean not null,
  saturday boolean not null,
  sunday boolean not null,
  start_date date not null,
  end_date date not null
);

create table public.calendar_dates (
  service_id text not null,
  service_date date not null,
  exception_type integer not null check (exception_type in (1, 2)),
  primary key (service_id, service_date)
);

create index stop_times_stop_departure_idx
  on public.stop_times (stop_id, departure_seconds);

create index trips_service_id_idx
  on public.trips (service_id);

alter table public.stops enable row level security;
alter table public.routes enable row level security;
alter table public.trips enable row level security;
alter table public.stop_times enable row level security;
alter table public.calendar enable row level security;
alter table public.calendar_dates enable row level security;