// Database schema. Kept in code (not read from disk at runtime) so it ships inside the serverless bundle.
export const schemaSql = `-- Dr Nontu Medical Practice — schema
-- Idempotent: safe to run on every boot (PGlite locally) and via "npm run db:migrate" (Supabase).

create extension if not exists btree_gist;

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

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

-- House calls are priced by where the patient is (not by length), optionally with an evening fee.
create table if not exists house_call_zones (
  id                  serial primary key,
  name                text not null,
  note                text not null default '',
  price_cents         int check (price_cents >= 0),          -- null: quote on request, not bookable online
  evening_price_cents int check (evening_price_cents >= 0),
  evening_from        int check (evening_from between 0 and 1440), -- minutes after midnight, SAST
  sort                int not null default 0,
  active              boolean not null default true
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

-- The practice may deliberately double-book someone (allow_overlap); everyone else stays one at a time.
alter table bookings add column if not exists allow_overlap boolean not null default false;
-- the house-call area the fee was based on (kept as text, so later edits to areas don't rewrite history)
alter table bookings add column if not exists house_zone text;

-- One doctor: no two live bookings may overlap, across every location and mode (unless double-booked on purpose).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_no_overlap' and pg_get_constraintdef(oid) like '%allow_overlap%') then
    alter table bookings drop constraint if exists bookings_no_overlap;
    alter table bookings add constraint bookings_no_overlap
      exclude using gist (tstzrange(start_at, busy_until) with &&)
      where (status in ('pending_payment','confirmed') and not allow_overlap);
  end if;
end $$;

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

-- Membership (Silver / Gold), billed monthly through Paystack subscriptions.
create table if not exists memberships (
  id                    uuid primary key default gen_random_uuid(),
  plan                  text not null check (plan in ('silver','gold')),
  price_cents           int  not null,
  name                  text not null,
  email                 text not null,
  phone                 text not null,
  status                text not null default 'pending' check (status in ('pending','active','non_renewing','past_due','cancelled')),
  provider              text not null default 'mock',
  paystack_customer     text,
  paystack_subscription text,
  paystack_email_token  text,
  manage_token          text unique not null,
  consent_at            timestamptz not null,
  started_at            timestamptz,
  next_payment_at       timestamptz,
  cancelled_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists memberships_email_idx on memberships (email);
-- payments belong to a booking or to a membership
alter table payments alter column booking_id drop not null;
alter table payments add column if not exists membership_id uuid references memberships(id) on delete cascade;

-- Messages from the website contact form. Members' brief medical queries are linked to their membership.
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null check (topic in ('general','booking','member')),
  name          text not null,
  email         text not null,
  phone         text not null,
  body          text not null,
  membership_id uuid references memberships(id) on delete set null,
  consent_at    timestamptz not null,
  handled_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists messages_created_idx on messages (created_at desc);
create index if not exists messages_email_idx on messages (lower(email), created_at);

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

-- ── Data updates (after every table exists) ──
-- Booking alerts also go to the practice Gmail (only if still the original single address).
update settings set value = '["info@drnontu.co.za", "drnontumedicalpractice@gmail.com"]'::jsonb
 where key = 'notify_emails' and value = '["info@drnontu.co.za"]'::jsonb;

-- The care plans page is now Membership (only if the title was never edited).
update seo_pages set title = 'Membership | Dr Nontu Medical Practice',
  description = 'Silver (R149/month) and Gold (R399/month) memberships: brief medical queries, prescription savings and priority access.'
 where path = '/care-plans' and title = 'Care plans | Dr Nontu Medical Practice';

-- The contact page description no longer promises WhatsApp (only if never edited).
update seo_pages set description = 'Practices in Esther Park (Kempton Park) and Fourways. Call, send a message or book online.'
 where path = '/contact' and description = 'Practices in Esther Park (Kempton Park) and Fourways. Call, WhatsApp or book online.';
-- Dr Nontu's fees (Oct 2026), applied once to an existing database; later edits in Admin → Fees stay.
do $$ begin
  if exists (select 1 from consult_types) and not exists (select 1 from settings where key = 'fees_2026_10') then
    delete from consult_durations where consult_type in ('in_person', 'virtual', 'house_call');
    insert into consult_durations (consult_type, minutes, price_cents) values
      ('in_person', 15, 55000), ('in_person', 30, 70000), ('in_person', 60, 90000),
      ('virtual', 15, 35000), ('virtual', 30, 50000),
      ('house_call', 60, 0);
    delete from house_call_zones;
    insert into house_call_zones (name, note, price_cents, evening_price_cents, evening_from, sort) values
      ('The Parks Lifestyle Apartments', 'Fourways', 60000, 80000, 1140, 0),
      ('Up to 5 km', '', 120000, null, null, 1),
      ('More than 5 km, up to 10 km', '', 140000, null, null, 2),
      ('More than 10 km, up to 15 km', '', 160000, null, null, 3),
      ('Beyond 15 km', 'WhatsApp us for a quote', null, null, null, 4);
    update settings set value = 'false'::jsonb where key = 'fees_are_placeholder';
    insert into settings (key, value) values ('fees_2026_10', 'true'::jsonb);
  end if;
end $$;
-- Repair: some drivers stored settings as a JSON string containing JSON; unwrap those (safe to re-run).
update settings set value = (value #>> '{}')::jsonb
 where jsonb_typeof(value) = 'string' and (left(value #>> '{}', 1) in ('{', '[') or (value #>> '{}') in ('true', 'false'));
`;
