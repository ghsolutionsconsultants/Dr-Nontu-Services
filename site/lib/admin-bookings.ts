// The practice's own bookings: everything is allowed (any length, fee, date or time, past visits, double-booking,
// repeats), because the doctor is the one deciding. Only the patient-facing rules live in lib/booking.ts.
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { one, q, tx } from './db';
import { BookingError, locationKindFor, type Booking, type ConsultTypeId } from './booking';
import { fmtShort, fmtTime, fromSast } from './time';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRef = () => 'DN-' + Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join('');
const newToken = () => randomBytes(24).toString('base64url');
const isOverlap = (e: unknown) => /bookings_no_overlap|exclusion|conflicting key/i.test(String((e as Error)?.message ?? e));

export const ADMIN_STATUSES = ['confirmed', 'completed', 'no_show', 'cancelled'] as const;
export const REPEATS = { none: 0, '1w': 7, '2w': 14, '4w': 28 } as const;

const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
export const AdminBookingInput = z.object({
  type: z.enum(['in_person', 'house_call', 'virtual']),
  location: z.string().trim().optional(),
  serviceId: z.coerce.number().int().positive().nullable(),
  duration: z.coerce.number({ message: 'Enter the length in minutes' }).int().min(5, 'The shortest booking is 5 minutes').max(720, 'The longest booking is 12 hours'),
  price: z.coerce.number({ message: 'Enter the fee in rand' }).min(0, 'The fee cannot be negative').max(100000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
  status: z.enum(['pending_payment', 'confirmed', 'completed', 'no_show', 'cancelled', 'expired']),
  paymentChoice: z.enum(['online', 'at_visit']),
  name: z.string().trim().min(2, 'Enter the patient’s name').max(120),
  email: z.string().trim().max(160).refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'That email address doesn’t look right'),
  phone: z.string().trim().max(30).refine((v) => !v || /^[+0-9 ()-]{6,30}$/.test(v), 'That phone number doesn’t look right'),
  dob: z.string().trim().refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Choose a valid date of birth'),
  medicalAid: optional(80),
  medicalAidNo: optional(40),
  address: optional(240),
  reason: z.string().trim().max(2000),
  allowOverlap: z.boolean(),
  zone: z.string().trim().max(120).optional().transform((v) => v || null),
  repeat: z.enum(['none', '1w', '2w', '4w']).default('none'),
  repeatCount: z.coerce.number().int().min(1).max(26).default(1),
});
export type AdminBookingInput = z.infer<typeof AdminBookingInput>;

const LIVE = ['pending_payment', 'confirmed'];

/** The first live, non-double-booked appointment that a time would collide with. */
async function clashWith(start: Date, busyUntil: Date, exceptId?: string) {
  return one<{ ref: string; patient_name: string; start_at: Date }>(
    `select ref, patient_name, start_at from bookings
     where status in ('pending_payment','confirmed') and not allow_overlap and tstzrange(start_at, busy_until) && tstzrange($1, $2)
       and ($3::uuid is null or id <> $3::uuid)
     order by start_at limit 1`, [start, busyUntil, exceptId ?? null]);
}

async function resolve(input: AdminBookingInput) {
  const ct = await one<{ buffer_minutes: number }>(`select buffer_minutes from consult_types where id = $1`, [input.type]);
  if (!ct) throw new BookingError('invalid', 'That consultation type no longer exists.');
  const kind = locationKindFor(input.type as ConsultTypeId);
  const locs = await q<{ id: string }>(`select id from locations where kind = $1 order by sort`, [kind]);
  const location = input.type === 'in_person' ? locs.find((l) => l.id === input.location)?.id : locs[0]?.id;
  if (!location) throw new BookingError('invalid', input.type === 'in_person' ? 'Choose which practice.' : 'That location no longer exists.');
  if (input.type === 'house_call' && !input.address) throw new BookingError('invalid', 'Enter the address for the house call.');
  const [h, m] = input.time.split(':').map(Number);
  return { location, buffer: ct.buffer_minutes, start: fromSast(input.date, h * 60 + m) };
}

const span = (start: Date, minutes: number, buffer: number) => {
  const end = new Date(start.getTime() + minutes * 60_000);
  return { end, busyUntil: new Date(end.getTime() + buffer * 60_000) };
};
const clashMessage = (c: { ref: string; patient_name: string; start_at: Date }, when?: Date) =>
  `${when ? `${fmtShort(when)} ${fmtTime(when)} overlaps` : 'That time overlaps'} ${c.patient_name}’s booking (${c.ref}, ${fmtShort(new Date(c.start_at))} ${fmtTime(new Date(c.start_at))}). Pick another time, or tick “Allow double-booking”.`;

/** Creates one booking, or a series when repeat is set. All or nothing. */
export async function createAdminBookings(input: AdminBookingInput): Promise<Booking[]> {
  const { location, buffer, start } = await resolve(input);
  const step = REPEATS[input.repeat], count = step ? input.repeatCount : 1;
  const starts = Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * step * 86_400_000));
  const checks = LIVE.includes(input.status) && !input.allowOverlap;
  if (checks) {
    for (const s of starts) {
      const c = await clashWith(s, span(s, input.duration, buffer).busyUntil);
      if (c) throw new BookingError('slot_taken', clashMessage(c, count > 1 ? s : undefined));
    }
  }
  try {
    return await tx(async (qq) => {
      const out: Booking[] = [];
      for (const s of starts) {
        const { end, busyUntil } = span(s, input.duration, buffer);
        const [b] = await qq<Booking>(
          `insert into bookings (ref, consult_type, location_id, service_id, duration_minutes, price_cents, start_at, end_at, busy_until, status,
             payment_choice, patient_name, patient_email, patient_phone, patient_dob, medical_aid, medical_aid_no, home_address, reason,
             consent_at, manage_token, source, allow_overlap, cancelled_at, house_zone)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now(), $20, 'admin', $21, $22, $23) returning *`,
          [newRef(), input.type, location, input.serviceId, input.duration, Math.round(input.price * 100), s, end, busyUntil, input.status,
            input.paymentChoice, input.name, input.email.toLowerCase(), input.phone, input.dob || null, input.medicalAid, input.medicalAidNo,
            input.address, input.reason, newToken(), input.allowOverlap, input.status === 'cancelled' ? new Date() : null, input.type === 'house_call' ? input.zone : null]);
        out.push(b);
      }
      return out;
    });
  } catch (e) {
    if (isOverlap(e)) throw new BookingError('slot_taken', 'That time was just taken by another booking. Pick another time, or allow double-booking.');
    throw e;
  }
}

/** Saves every field of an existing booking. */
export async function updateAdminBooking(id: string, input: AdminBookingInput): Promise<Booking> {
  const { location, buffer, start } = await resolve(input);
  const { end, busyUntil } = span(start, input.duration, buffer);
  if (LIVE.includes(input.status) && !input.allowOverlap) {
    const c = await clashWith(start, busyUntil, id);
    if (c) throw new BookingError('slot_taken', clashMessage(c));
  }
  try {
    const b = await one<Booking>(
      `update bookings set consult_type = $2, location_id = $3, service_id = $4, duration_minutes = $5, price_cents = $6,
         reminder_sent_at = case when start_at <> $7 then null else reminder_sent_at end,
         start_at = $7, end_at = $8, busy_until = $9, status = $10, payment_choice = $11,
         patient_name = $12, patient_email = $13, patient_phone = $14, patient_dob = $15, medical_aid = $16, medical_aid_no = $17,
         home_address = $18, reason = $19, allow_overlap = $20, house_zone = $21,
         cancelled_at = case when $10 = 'cancelled' then coalesce(cancelled_at, now()) else null end,
         hold_expires_at = case when $10 = 'pending_payment' then hold_expires_at else null end,
         updated_at = now()
       where id = $1 returning *`,
      [id, input.type, location, input.serviceId, input.duration, Math.round(input.price * 100), start, end, busyUntil, input.status,
        input.paymentChoice, input.name, input.email.toLowerCase(), input.phone, input.dob || null, input.medicalAid, input.medicalAidNo,
        input.address, input.reason, input.allowOverlap, input.type === 'house_call' ? input.zone : null]);
    if (!b) throw new BookingError('not_found', 'That booking no longer exists.');
    return b;
  } catch (e) {
    if (isOverlap(e)) throw new BookingError('slot_taken', 'That time overlaps another booking. Pick another time, or allow double-booking.');
    throw e;
  }
}

/** Calendar drag and stretch: a new start and/or length, keeping everything else. */
export async function moveAdminBooking(id: string, start: Date, end: Date) {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (!(minutes >= 5 && minutes <= 720)) throw new BookingError('invalid', 'A booking must be between 5 minutes and 12 hours long.');
  const b = await one<Booking & { buffer_minutes: number }>(`select b.*, ct.buffer_minutes from bookings b join consult_types ct on ct.id = b.consult_type where b.id = $1`, [id]);
  if (!b) throw new BookingError('not_found', 'That booking no longer exists.');
  const busyUntil = new Date(end.getTime() + b.buffer_minutes * 60_000);
  if (LIVE.includes(b.status) && !b.allow_overlap) {
    const c = await clashWith(start, busyUntil, id);
    if (c) throw new BookingError('slot_taken', clashMessage(c));
  }
  try {
    return await one<Booking>(
      `update bookings set reminder_sent_at = case when start_at <> $2 then null else reminder_sent_at end,
         start_at = $2, end_at = $3, busy_until = $4, duration_minutes = $5, updated_at = now() where id = $1 returning *`,
      [id, start, end, busyUntil, minutes]);
  } catch (e) {
    if (isOverlap(e)) throw new BookingError('slot_taken', 'That time overlaps another booking.');
    throw e;
  }
}

/** Permanently removes bookings and their payment records. Returns how many were deleted. */
export async function deleteBookings(ids: string[]) {
  if (!ids.length) return 0;
  const rows = await q<{ id: string }>(`delete from bookings where id = any($1::uuid[]) returning id`, [ids]);
  return rows.length;
}

/** Bulk status change from the bookings list. Cancelling a paid booking flags it for refund, as elsewhere. */
export async function setStatusMany(ids: string[], status: 'confirmed' | 'completed' | 'no_show' | 'cancelled') {
  if (!ids.length) return 0;
  const rows = await q<{ id: string }>(
    `update bookings set status = $2, updated_at = now(),
       cancelled_at = case when $2 = 'cancelled' then coalesce(cancelled_at, now()) else null end,
       cancel_reason = case when $2 = 'cancelled' then coalesce(cancel_reason, 'Cancelled by practice') else cancel_reason end,
       payment_status = case when $2 = 'cancelled' and payment_status = 'paid' then 'refund_pending' else payment_status end
     where id = any($1::uuid[]) returning id`, [ids, status]);
  return rows.length;
}

/** Removes a payment the practice recorded by hand (not an online Paystack payment; refund those instead). */
export async function deleteManualPayment(bookingId: string, paymentId: number) {
  const p = await one<{ provider: string }>(`select provider from payments where id = $1 and booking_id = $2`, [paymentId, bookingId]);
  if (!p) throw new BookingError('not_found', 'That payment no longer exists.');
  if (p.provider === 'paystack') throw new BookingError('not_allowed', 'Online payments can’t be deleted. Refund them instead.');
  await q(`delete from payments where id = $1`, [paymentId]);
  await q(`update bookings set payment_status = case when exists (select 1 from payments where booking_id = $1 and status = 'success') then 'paid' else 'unpaid' end, updated_at = now() where id = $1`, [bookingId]);
}
