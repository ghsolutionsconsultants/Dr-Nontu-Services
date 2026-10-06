import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { q, one, tx, type Query } from './db';
import { slotsForDay, type Interval, type Rule } from './slots';
import { addDays, dateKey, fromSast, monthDays } from './time';

export type ConsultTypeId = 'in_person' | 'house_call' | 'virtual';

export interface BookingSettings { cancelCutoffHours: number; leadMinutes: number; holdMinutes: number; slotStepMinutes: number; maxDaysAhead: number }
export interface ConsultType { id: ConsultTypeId; name: string; description: string; buffer_minutes: number; requires_prepay: boolean; active: boolean; durations: { id: number; minutes: number; price_cents: number }[] }
export interface Location { id: string; name: string; kind: 'clinic' | 'home' | 'virtual'; address: string | null; map_url: string | null; parking: string | null }
export interface Service { id: number; slug: string; name: string; summary: string; modes: string[]; image: string }

export interface Booking {
  id: string; ref: string; consult_type: ConsultTypeId; location_id: string; service_id: number | null;
  duration_minutes: number; price_cents: number; start_at: Date; end_at: Date; busy_until: Date;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'expired';
  payment_choice: 'online' | 'at_visit'; payment_status: 'unpaid' | 'paid' | 'refund_pending' | 'refunded';
  patient_name: string; patient_email: string; patient_phone: string; patient_dob: string | null;
  medical_aid: string | null; medical_aid_no: string | null; home_address: string | null; reason: string;
  manage_token: string; hold_expires_at: Date | null; source: string; created_at: Date; cancelled_at: Date | null;
  type_name?: string; location_name?: string; location_address?: string | null; service_name?: string | null;
}

export class BookingError extends Error {
  constructor(public code: 'slot_taken' | 'invalid' | 'not_found' | 'too_late' | 'not_allowed', message: string) { super(message); }
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await one<{ value: unknown }>(`select value from settings where key = $1`, [key]);
  let v = r?.value;
  // tolerate JSON that was stored as a string of JSON
  if (typeof v === 'string' && /^\s*[[{]|^(true|false)$/.test(v)) { try { v = JSON.parse(v); } catch { /* keep */ } }
  return (v ?? fallback) as T;
}
export const bookingSettings = () => getSetting<BookingSettings>('booking', { cancelCutoffHours: 24, leadMinutes: 120, holdMinutes: 15, slotStepMinutes: 15, maxDaysAhead: 60 });

export async function getCatalog() {
  const [types, durations, locations, services, settings] = await Promise.all([
    q<Omit<ConsultType, 'durations'>>(`select id, name, description, buffer_minutes, requires_prepay, active from consult_types where active order by sort`),
    q<{ id: number; consult_type: string; minutes: number; price_cents: number }>(`select id, consult_type, minutes, price_cents from consult_durations where active order by minutes`),
    q<Location>(`select id, name, kind, address, map_url, parking from locations order by sort`),
    q<Service>(`select id, slug, name, summary, modes, image from services where bookable order by sort`),
    bookingSettings(),
  ]);
  const ct: ConsultType[] = types.map((t) => ({ ...t, durations: durations.filter((d) => d.consult_type === t.id).map(({ id, minutes, price_cents }) => ({ id, minutes, price_cents })) }));
  return { types: ct, locations, services, settings };
}

/** Which location ids a consult type may use. */
export function locationKindFor(type: ConsultTypeId) {
  return type === 'in_person' ? 'clinic' : type === 'house_call' ? 'home' : 'virtual';
}

/** Unpaid holds older than their expiry free their slot. */
export async function expireHolds(qq: Query = q) {
  await qq(`update bookings set status = 'expired', updated_at = now() where status = 'pending_payment' and hold_expires_at < now()`);
}

async function context(type: ConsultTypeId, location: string, from: Date, to: Date, excludeId?: string) {
  const [rules, busy, blackouts, ct] = await Promise.all([
    q<Rule>(`select weekday, start_min, end_min from availability_rules where consult_type = $1 and (location_id = $2 or location_id is null)`, [type, location]),
    q<{ start_at: Date; busy_until: Date }>(`select start_at, busy_until from bookings where status in ('pending_payment','confirmed') and start_at < $2 and busy_until > $1 and ($3::uuid is null or id <> $3::uuid)`, [from, to, excludeId ?? null]),
    q<{ starts_at: Date; ends_at: Date }>(`select starts_at, ends_at from blackouts where starts_at < $2 and ends_at > $1`, [from, to]),
    one<{ buffer_minutes: number }>(`select buffer_minutes from consult_types where id = $1 and active`, [type]),
  ]);
  if (!ct) throw new BookingError('invalid', 'That consultation type is not available.');
  return {
    rules, buffer: ct.buffer_minutes,
    busy: busy.map<Interval>((b) => ({ start: new Date(b.start_at), end: new Date(b.busy_until) })),
    blackouts: blackouts.map<Interval>((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) })),
  };
}

export async function getSlots(p: { type: ConsultTypeId; location: string; duration: number; date: string; excludeId?: string; now?: Date }) {
  await expireHolds();
  const s = await bookingSettings();
  const now = p.now ?? new Date();
  if (p.date > addDays(dateKey(now), s.maxDaysAhead)) return [];
  const from = fromSast(p.date, 0), to = fromSast(p.date, 1440 + 24 * 60);
  const c = await context(p.type, p.location, from, to, p.excludeId);
  return slotsForDay({ dateKey: p.date, rules: c.rules, busy: c.busy, blackouts: c.blackouts, duration: p.duration, buffer: c.buffer, step: s.slotStepMinutes, now, leadMinutes: s.leadMinutes });
}

/** Days in a month (YYYY-MM) with at least one open start time. */
export async function getMonthAvailability(p: { type: ConsultTypeId; location: string; duration: number; month: string; now?: Date }) {
  await expireHolds();
  const s = await bookingSettings();
  const now = p.now ?? new Date();
  const days = monthDays(p.month);
  const last = addDays(dateKey(now), s.maxDaysAhead);
  const c = await context(p.type, p.location, fromSast(days[0], 0), fromSast(days.at(-1)!, 2880));
  return days.filter((d) => d >= dateKey(now) && d <= last &&
    slotsForDay({ dateKey: d, rules: c.rules, busy: c.busy, blackouts: c.blackouts, duration: p.duration, buffer: c.buffer, step: s.slotStepMinutes, now, leadMinutes: s.leadMinutes }).length > 0);
}

export const BookingInput = z.object({
  type: z.enum(['in_person', 'house_call', 'virtual']),
  location: z.string().min(1),
  serviceId: z.coerce.number().int().positive().nullable().optional(),
  duration: z.coerce.number().int().positive(),
  start: z.string().datetime({ offset: true }),
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().regex(/^[+0-9 ()-]{9,20}$/, 'Please enter a valid phone number'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  medicalAid: z.string().trim().max(80).optional(),
  medicalAidNo: z.string().trim().max(40).optional(),
  address: z.string().trim().max(240).optional(),
  reason: z.string().trim().max(1000).optional(),
  payment: z.enum(['online', 'at_visit']),
  consent: z.literal(true, { message: 'Please accept the privacy notice to continue' }),
});
export type BookingInput = z.infer<typeof BookingInput>;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRef = () => 'DN-' + Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join('');
const newToken = () => randomBytes(24).toString('base64url');

const isOverlap = (e: unknown) => /bookings_no_overlap|exclusion|conflicting key/i.test(String((e as Error)?.message ?? e));

export async function createBooking(input: BookingInput, opts: { admin?: boolean } = {}) {
  const cat = await getCatalog();
  const type = cat.types.find((t) => t.id === input.type);
  if (!type) throw new BookingError('invalid', 'That consultation type is not available.');
  const dur = type.durations.find((d) => d.minutes === input.duration);
  if (!dur) throw new BookingError('invalid', 'Please choose an available appointment length.');
  const loc = cat.locations.find((l) => l.id === input.location && l.kind === locationKindFor(type.id));
  if (!loc) throw new BookingError('invalid', 'Please choose a valid location.');
  if (type.id === 'house_call' && !input.address) throw new BookingError('invalid', 'Please enter the address for the house call.');
  const start = new Date(input.start);

  if (!opts.admin) {
    const slots = await getSlots({ type: type.id, location: loc.id, duration: dur.minutes, date: dateKey(start) });
    if (!slots.some((s) => s.getTime() === start.getTime())) throw new BookingError('slot_taken', 'That time has just been taken. Please choose another.');
  }
  const payment = type.requires_prepay ? 'online' : input.payment;
  const status = payment === 'online' && !opts.admin ? 'pending_payment' : 'confirmed';
  const end = new Date(start.getTime() + dur.minutes * 60_000);
  const busyUntil = new Date(end.getTime() + type.buffer_minutes * 60_000);
  const s = cat.settings;

  try {
    return await tx(async (qq) => {
      await expireHolds(qq);
      const [b] = await qq<Booking>(
        `insert into bookings (ref, consult_type, location_id, service_id, duration_minutes, price_cents, start_at, end_at, busy_until, status,
          payment_choice, patient_name, patient_email, patient_phone, patient_dob, medical_aid, medical_aid_no, home_address, reason,
          consent_at, manage_token, hold_expires_at, source)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now(), $20, $21, $22) returning *`,
        [newRef(), type.id, loc.id, input.serviceId ?? null, dur.minutes, dur.price_cents, start, end, busyUntil, status,
          payment, input.name, input.email.toLowerCase(), input.phone, input.dob || null, input.medicalAid || null, input.medicalAidNo || null,
          input.address || null, input.reason ?? '', newToken(),
          status === 'pending_payment' ? new Date(Date.now() + s.holdMinutes * 60_000) : null, opts.admin ? 'admin' : 'web']);
      return b;
    });
  } catch (e) {
    if (isOverlap(e)) throw new BookingError('slot_taken', 'That time has just been taken. Please choose another.');
    throw e;
  }
}

const SELECT_FULL = `select b.*, ct.name as type_name, l.name as location_name, l.address as location_address, s.name as service_name
  from bookings b join consult_types ct on ct.id = b.consult_type join locations l on l.id = b.location_id left join services s on s.id = b.service_id`;

export const bookingByToken = (token: string) => one<Booking>(`${SELECT_FULL} where b.manage_token = $1`, [token]);
export const bookingByRef = (ref: string) => one<Booking>(`${SELECT_FULL} where b.ref = $1`, [ref]);
export const bookingById = (id: string) => one<Booking>(`${SELECT_FULL} where b.id = $1`, [id]);
export async function bookingsBetween(from: Date, to: Date) {
  return q<Booking>(`${SELECT_FULL} where b.start_at < $2 and b.end_at > $1 and b.status <> 'expired' order by b.start_at`, [from, to]);
}

export async function cancelBooking(b: Booking, opts: { by: 'patient' | 'admin'; reason?: string }) {
  if (!['pending_payment', 'confirmed'].includes(b.status)) throw new BookingError('not_allowed', 'This booking can no longer be cancelled.');
  if (opts.by === 'patient') {
    const s = await bookingSettings();
    if (new Date(b.start_at).getTime() - Date.now() < s.cancelCutoffHours * 3_600_000)
      throw new BookingError('too_late', `Bookings can be cancelled online up to ${s.cancelCutoffHours} hours before. Please WhatsApp or call us.`);
  }
  const [u] = await q<Booking>(
    `update bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = $2, updated_at = now(),
       payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
     where id = $1 returning *`, [b.id, opts.reason ?? (opts.by === 'patient' ? 'Cancelled by patient' : 'Cancelled by practice')]);
  return u;
}

export async function rescheduleBooking(b: Booking, startIso: string, opts: { admin?: boolean } = {}) {
  if (!['pending_payment', 'confirmed'].includes(b.status)) throw new BookingError('not_allowed', 'This booking can no longer be moved.');
  const start = new Date(startIso);
  if (!opts.admin) {
    const s = await bookingSettings();
    if (new Date(b.start_at).getTime() - Date.now() < s.cancelCutoffHours * 3_600_000)
      throw new BookingError('too_late', `Bookings can be moved online up to ${s.cancelCutoffHours} hours before. Please WhatsApp or call us.`);
    const slots = await getSlots({ type: b.consult_type, location: b.location_id, duration: b.duration_minutes, date: dateKey(start), excludeId: b.id });
    if (!slots.some((x) => x.getTime() === start.getTime())) throw new BookingError('slot_taken', 'That time is not available. Please choose another.');
  }
  const ct = await one<{ buffer_minutes: number }>(`select buffer_minutes from consult_types where id = $1`, [b.consult_type]);
  const end = new Date(start.getTime() + b.duration_minutes * 60_000);
  const busy = new Date(end.getTime() + (ct?.buffer_minutes ?? 0) * 60_000);
  try {
    const [u] = await q<Booking>(`update bookings set start_at = $2, end_at = $3, busy_until = $4, reminder_sent_at = null, updated_at = now() where id = $1 returning *`, [b.id, start, end, busy]);
    return u;
  } catch (e) {
    if (isOverlap(e)) throw new BookingError('slot_taken', 'That time is not available. Please choose another.');
    throw e;
  }
}

/** Within the online change cut-off? Then the patient must contact the practice. */
export const isLocked = (b: Pick<Booking, 'start_at'>, cutoffHours: number) => new Date(b.start_at).getTime() - Date.now() < cutoffHours * 3_600_000;

export async function setStatus(id: string, status: 'completed' | 'no_show' | 'confirmed') {
  return one<Booking>(`update bookings set status = $2, updated_at = now() where id = $1 returning *`, [id, status]);
}
