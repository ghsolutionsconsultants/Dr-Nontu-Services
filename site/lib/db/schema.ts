// Database schema. Kept in code (not read from disk at runtime) so it ships inside the serverless bundle.
export const schemaSql = `-- Dr Nontu Medical Practice — schema
-- Idempotent: safe to run on every boot (PGlite locally) and via "npm run db:migrate" (Supabase).

create extension if not exists btree_gist;

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- Repair: some drivers stored settings as a JSON string containing JSON; unwrap those (safe to re-run).
update settings set value = (value #>> '{}')::jsonb
 where jsonb_typeof(value) = 'string' and (left(value #>> '{}', 1) in ('{', '[') or (value #>> '{}') in ('true', 'false'));

create table if not exists admins (
  id            serial primary key,
  email         text unique not null,
  name          text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists locations (
  id        text primary key,               -- esther-park | fourways | home | online
  name      text not null,
  kind      text not null check (kind in ('clinic','home','virtual')),
  address   text,
  map_url   text,
  parking   text,
  sort      int not null default 0
);

create table if not exists consult_types (
  id              text primary key,         -- in_person | house_call | virtual
  name            text not null,
  description     text not null default '',
  buffer_minutes  int  not null default 0,  -- travel / turnover after each visit
  requires_prepay boolean not null default false,
  active          boolean not null default true,
  sort            int not null default 0
);

-- Patients choose the length of their appointment; each length has its own fee.
create table if not exists consult_durations (
  id            serial primary key,
  consult_type  text not null references consult_types(id) on delete cascade,
  minutes       int  not null check (minutes between 5 and 240),
  price_cents   int  not null check (price_cents >= 0),
  active        boolean not null default true,
  unique (consult_type, minutes)
);

create table if not exists services (
  id        serial primary key,
  slug      text unique not null,
  name      text not null,
  summary   text not null,
  body      text not null default '',
  modes     text[] not null default '{}',
  image     text not null default '',
  bookable  boolean not null default true,
  sort      int not null default 0
);

-- Weekly opening windows. minutes from midnight, SAST. location_id null = any location of that type.
create table if not exists availability_rules (
  id           serial primary key,
  consult_type text not null references consult_types(id) on delete cascade,
  location_id  text references locations(id) on delete cascade,
  weekday      int not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_min    int not null check (start_min between 0 and 1440),
  end_min      int not null check (end_min between 0 and 1440),
  check (end_min > start_min)
);

create table if not exists blackouts (
  id         serial primary key,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text not null default '',
  check (ends_at > starts_at)
);

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  ref              text unique not null,
  consult_type     text not null references consult_types(id),
  location_id      text not null references locations(id),
  service_id       int references services(id) on delete set null,
  duration_minutes int not null,
  price_cents      int not null,
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  busy_until       timestamptz not null,      -- end_at + buffer (travel/turnover)
  status           text not null default 'pending_payment'
                   check (status in ('pending_payment','confirmed','completed','cancelled','no_show','expired')),
  payment_choice   text not null check (payment_choice in ('online','at_visit')),
  payment_status   text not null default 'unpaid'
                   check (payment_status in ('unpaid','paid','refund_pending','refunded')),
  patient_name     text not null,
  patient_email    text not null,
  patient_phone    text not null,
  patient_dob      date,
  medical_aid      text,
  medical_aid_no   text,
  home_address     text,
  reason           text not null default '',
  consent_at       timestamptz not null,
  manage_token     text unique not null,
  hold_expires_at  timestamptz,
  source           text not null default 'web',  -- web | admin
  reminder_sent_at timestamptz,
  cancelled_at     timestamptz,
  cancel_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_at > start_at),
  check (busy_until >= end_at)
);

-- One doctor: no two live bookings may overlap, across every location and mode.
do $$ begin
  alter table bookings add constraint bookings_no_overlap
    exclude using gist (tstzrange(start_at, busy_until) with &&)
    where (status in ('pending_payment','confirmed'));
exception when duplicate_object or duplicate_table then null; end $$;

create index if not exists bookings_start_idx on bookings (start_at);
create index if not exists bookings_status_idx on bookings (status);

create table if not exists payments (
  id            serial primary key,
  booking_id    uuid not null references bookings(id) on delete cascade,
  provider      text not null check (provider in ('paystack','mock','at_visit')),
  reference     text unique not null,
  amount_cents  int  not null,
  status        text not null check (status in ('initialized','success','failed','refunded')),
  channel       text,                       -- card | eft | apple_pay | cash | card_machine | medical_aid
  paid_at       timestamptz,
  refunded_at   timestamptz,
  raw           jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists payments_booking_idx on payments (booking_id);

create table if not exists analytics_events (
  id            serial primary key,
  ts            timestamptz not null default now(),
  event         text not null,              -- page_view | service_view | cta_click | booking_started | booking_completed
  path          text not null default '/',
  service_slug  text,
  label         text,
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  device        text,
  session_hash  text
);
create index if not exists analytics_ts_idx on analytics_events (ts);
create index if not exists analytics_event_idx on analytics_events (event);

create table if not exists seo_pages (
  path         text primary key,
  title        text not null,
  description  text not null,
  og_image     text,
  keyword      text
);

-- Dev mail outbox (and audit trail in production).
create table if not exists outbox (
  id         serial primary key,
  to_email   text not null,
  subject    text not null,
  html       text not null,
  sent       boolean not null default false,
  error      text,
  created_at timestamptz not null default now()
);
`;
