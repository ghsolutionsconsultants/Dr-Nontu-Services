'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { login, logout, requireAdmin } from '@/lib/auth';
import { signSession, SESSION_COOKIE } from '@/lib/session';
import { one, q } from '@/lib/db';
import { BookingError, bookingById, cancelBooking, rescheduleBooking, setStatus } from '@/lib/booking';
import { mailCancelled, mailConfirmed, mailPaymentLink, mailRescheduled } from '@/lib/email';
import { paymentsForBooking, recordInPersonPayment, refundPayment, type VisitChannel } from '@/lib/payments';
import { AdminBookingInput, createAdminBookings, deleteBookings, deleteManualPayment, setStatusMany, updateAdminBooking } from '@/lib/admin-bookings';
import { fromSast } from '@/lib/time';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string) => Number(f.get(k));
const back = (path: string, msg: string, kind: 'ok' | 'err' = 'ok'): never => redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);
const refresh = (publicToo = false) => { revalidatePath('/admin', 'layout'); if (publicToo) revalidatePath('/', 'layout'); };
const hm = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + (m || 0); };

export async function loginAction(f: FormData) {
  const next = s(f, 'next');
  if (!(await login(s(f, 'email'), String(f.get('password') ?? '')))) redirect(`/admin/login?err=1${next ? `&next=${encodeURIComponent(next)}` : ''}`);
  redirect(next.startsWith('/admin') ? next : '/admin');
}
export async function logoutAction() { await logout(); redirect('/admin/login'); }

/* ── bookings ── */
export async function bookingAction(id: string, f: FormData) {
  await requireAdmin();
  const op = s(f, 'op'), path = `/admin/bookings/${id}`;
  const b = await bookingById(id);
  if (!b) back('/admin/bookings', 'Booking not found.', 'err');
  try {
    switch (op) {
      case 'complete': await setStatus(id, 'completed'); break;
      case 'no_show': await setStatus(id, 'no_show'); break;
      case 'cancel': {
        await cancelBooking(b!, { by: 'admin', reason: s(f, 'reason') || undefined });
        if (f.get('notify')) { const u = await bookingById(id); if (u) await mailCancelled(u); }
        break;
      }
      case 'reschedule': {
        const [d, t] = [s(f, 'date'), s(f, 'time')];
        await rescheduleBooking(b!, fromSast(d, hm(t)).toISOString(), { admin: true });
        if (f.get('notify')) { const u = await bookingById(id); if (u) await mailRescheduled(u); }
        break;
      }
      case 'paid': await recordInPersonPayment(b!, s(f, 'channel') as VisitChannel, Math.round(num(f, 'amount') * 100) || b!.price_cents); break;
      case 'delete_payment': await deleteManualPayment(id, num(f, 'payment')); break;
      case 'delete': {
        await deleteBookings([id]);
        refresh();
        back('/admin/bookings', `Booking ${b!.ref} for ${b!.patient_name} was deleted.`);
        break;
      }
      case 'refund': {
        const p = (await paymentsForBooking(id)).find((x) => x.status === 'success' && x.provider !== 'at_visit');
        if (!p) back(path, 'There is no online payment to refund.', 'err');
        await refundPayment(p!);
        break;
      }
      case 'payment_link': await mailPaymentLink(b!); break;
      case 'resend': await mailConfirmed(b!); break;
      default: back(path, 'Unknown action.', 'err');
    }
  } catch (e) {
    if (e instanceof BookingError) back(path, e.message, 'err');
    if (e instanceof Error && e.message.startsWith('Paystack')) back(path, e.message, 'err');
    throw e;
  }
  refresh();
  back(path, { complete: 'Marked as completed.', no_show: 'Marked as no-show.', cancel: 'Booking cancelled.', reschedule: 'Booking moved.', paid: 'Payment recorded.', delete_payment: 'Payment record removed.', refund: 'Refund issued.', payment_link: 'Payment link emailed to the patient.', resend: 'Confirmation re-sent.' }[op] ?? 'Saved.');
}

export type FormState = { error?: string } | null;
const LIVE = ['pending_payment', 'confirmed'];

/** New and edited practice bookings (useActionState): errors come back to the form so nothing typed is lost. */
export async function saveBooking(_prev: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const id = s(f, 'id') || null, pay = s(f, 'pay');
  const parsed = AdminBookingInput.safeParse({
    type: s(f, 'type'), location: s(f, 'location'), serviceId: s(f, 'service') ? num(f, 'service') : null,
    duration: s(f, 'duration'), price: s(f, 'price') || 0, date: s(f, 'date'), time: s(f, 'time'), status: s(f, 'status') || 'confirmed',
    paymentChoice: pay === 'link' ? 'online' : (s(f, 'paymentChoice') || 'at_visit'),
    name: s(f, 'name'), email: s(f, 'email'), phone: s(f, 'phone'), dob: s(f, 'dob'), medicalAid: s(f, 'medicalAid'), medicalAidNo: s(f, 'medicalAidNo'),
    address: s(f, 'address'), reason: s(f, 'reason'), allowOverlap: !!f.get('allowOverlap'), repeat: s(f, 'repeat') || 'none', repeatCount: s(f, 'repeatCount') || 1,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  if (pay === 'link' && !parsed.data.email) return { error: 'Add the patient’s email address to send a payment link.' };
  let target = '', msg = '';
  try {
    if (id) {
      const before = await bookingById(id);
      const saved = await updateAdminBooking(id, parsed.data);
      target = saved.id; msg = 'Changes saved.';
      const full = f.get('notify') ? await bookingById(saved.id) : null;
      if (full?.patient_email) {
        if (full.status === 'cancelled' && before?.status !== 'cancelled') await mailCancelled(full);
        else if (LIVE.includes(full.status) && before && +new Date(before.start_at) !== +new Date(full.start_at)) await mailRescheduled(full);
        else if (LIVE.includes(full.status)) await mailConfirmed(full);
        msg = 'Changes saved and the patient was emailed.';
      }
    } else {
      const made = await createAdminBookings(parsed.data);
      target = made[0].id;
      // "already paid" is recorded against the first appointment of a series
      if (pay === 'paid') await recordInPersonPayment(made[0], (s(f, 'channel') || 'cash') as VisitChannel, Math.round(num(f, 'amount') * 100) || made[0].price_cents);
      for (const b of made) {
        const full = await bookingById(b.id);
        if (!full?.patient_email) continue;
        if (pay === 'link' && LIVE.includes(full.status)) await mailPaymentLink(full);
        else if (f.get('notify') && LIVE.includes(full.status)) await mailConfirmed(full);
      }
      msg = made.length > 1 ? `${made.length} bookings created, starting with this one.` : 'Booking created.';
    }
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  refresh();
  back(`/admin/bookings/${target}`, msg);
  return null;
}

/** Bulk actions from the bookings list. */
export async function bulkBookings(f: FormData) {
  await requireAdmin();
  const ids = f.getAll('ids').map(String).filter(Boolean), op = s(f, 'op');
  const ret = s(f, 'return').startsWith('/admin/bookings') ? s(f, 'return') : '/admin/bookings';
  if (!ids.length) back(ret, 'Tick at least one booking first.', 'err');
  let n = 0;
  if (op === 'delete') n = await deleteBookings(ids);
  else if (op === 'confirmed' || op === 'completed' || op === 'no_show' || op === 'cancelled') n = await setStatusMany(ids, op);
  else back(ret, 'Choose what to do with the selected bookings.', 'err');
  refresh();
  const what = { delete: 'deleted', confirmed: 'marked confirmed', completed: 'marked completed', no_show: 'marked as no-show', cancelled: 'cancelled' }[op];
  back(ret, `${n} booking${n === 1 ? '' : 's'} ${what}.`);
}

/* ── availability ── */
export async function addRule(f: FormData) {
  await requireAdmin();
  const type = s(f, 'type'), loc = s(f, 'location') || null, [a, b] = [hm(s(f, 'start')), s(f, 'end') === '24:00' ? 1440 : hm(s(f, 'end'))];
  if (b <= a) back('/admin/availability', 'The end time must be after the start time.', 'err');
  const kind = (await one<{ kind: string }>(`select kind from locations where id = $1`, [loc]))?.kind;
  const want = type === 'in_person' ? 'clinic' : type === 'house_call' ? 'home' : 'virtual';
  if (kind !== want) back('/admin/availability', `${type === 'in_person' ? 'In-person hours need a practice location' : type === 'house_call' ? 'House-call hours use the “Your home” location' : 'Virtual hours use the “Video call” location'}.`, 'err');
  const days = f.getAll('day').map(Number);
  if (!days.length) back('/admin/availability', 'Choose at least one day.', 'err');
  for (const d of days) await q(`insert into availability_rules (consult_type, location_id, weekday, start_min, end_min) values ($1,$2,$3,$4,$5)`, [type, loc, d, a, b]);
  refresh(); back('/admin/availability', 'Opening hours added.');
}
export async function deleteRule(id: number) { await requireAdmin(); await q(`delete from availability_rules where id = $1`, [id]); refresh(); back('/admin/availability', 'Opening hours removed.'); }
export async function addBlackout(f: FormData) {
  await requireAdmin();
  const start = fromSast(s(f, 'from'), s(f, 'fromTime') ? hm(s(f, 'fromTime')) : 0);
  const end = fromSast(s(f, 'to') || s(f, 'from'), s(f, 'toTime') ? hm(s(f, 'toTime')) : 1440);
  if (end <= start) back('/admin/availability', 'The block must end after it starts.', 'err');
  await q(`insert into blackouts (starts_at, ends_at, reason) values ($1,$2,$3)`, [start, end, s(f, 'reason')]);
  refresh(); back('/admin/availability', 'Time blocked. Patients can no longer book it.');
}
export async function deleteBlackout(id: number) { await requireAdmin(); await q(`delete from blackouts where id = $1`, [id]); refresh(); back('/admin/availability', 'Block removed.'); }

/* ── fees ── */
export async function saveType(id: string, f: FormData) {
  await requireAdmin();
  await q(`update consult_types set buffer_minutes = $2, requires_prepay = $3, active = $4 where id = $1`, [id, num(f, 'buffer') || 0, !!f.get('prepay'), !!f.get('active')]);
  refresh(true); back('/admin/fees', 'Consultation type saved.');
}
export async function saveDuration(id: number, f: FormData) {
  await requireAdmin();
  const price = Math.round(num(f, 'price') * 100);
  if (!(price >= 0)) back('/admin/fees', 'Please enter a valid fee.', 'err');
  await q(`update consult_durations set price_cents = $2, active = $3 where id = $1`, [id, price, !!f.get('active')]);
  await q(`update settings set value = 'false' where key = 'fees_are_placeholder'`);
  refresh(true); back('/admin/fees', 'Fee saved.');
}
export async function addDuration(f: FormData) {
  await requireAdmin();
  const minutes = num(f, 'minutes'), price = Math.round(num(f, 'price') * 100);
  if (!(minutes >= 5 && minutes <= 240)) back('/admin/fees', 'Length must be between 5 and 240 minutes.', 'err');
  try { await q(`insert into consult_durations (consult_type, minutes, price_cents) values ($1,$2,$3)`, [s(f, 'type'), minutes, price]); }
  catch { back('/admin/fees', 'That length already exists for this type.', 'err'); }
  refresh(true); back('/admin/fees', 'Appointment length added.');
}
export async function deleteDuration(id: number) {
  await requireAdmin();
  await q(`delete from consult_durations where id = $1`, [id]);
  refresh(true); back('/admin/fees', 'Appointment length removed.');
}

/* ── SEO ── */
export async function saveSeo(path: string, f: FormData) {
  await requireAdmin();
  await q(`insert into seo_pages (path, title, description, og_image, keyword) values ($1,$2,$3,$4,$5)
           on conflict (path) do update set title = excluded.title, description = excluded.description, og_image = excluded.og_image, keyword = excluded.keyword`,
    [path, s(f, 'title'), s(f, 'description'), s(f, 'og_image') || null, s(f, 'keyword') || null]);
  refresh(true); back(`/admin/seo?page=${encodeURIComponent(path)}`, 'Saved. Search engines will see it on their next visit.');
}

/* ── messages ── */
export async function messageAction(id: string, f: FormData) {
  await requireAdmin();
  const handled = s(f, 'op') === 'handled';
  await q(`update messages set handled_at = ${handled ? 'now()' : 'null'} where id = $1`, [id]);
  refresh();
  const view = s(f, 'view');
  back(`/admin/messages${view ? `?view=${encodeURIComponent(view)}` : ''}`, handled ? 'Marked as handled.' : 'Moved back to open.');
}

/* ── settings ── */
export async function saveSettings(f: FormData) {
  await requireAdmin();
  const set = (k: string, v: unknown) => q(`insert into settings (key, value) values ($1, $2::text::jsonb) on conflict (key) do update set value = excluded.value`, [k, JSON.stringify(v)]);
  await set('notify_emails', s(f, 'notify').split(/[\s,;]+/).filter(Boolean));
  await set('booking', {
    cancelCutoffHours: num(f, 'cutoff') || 24, leadMinutes: num(f, 'lead') || 0, holdMinutes: num(f, 'hold') || 15,
    slotStepMinutes: [5, 10, 15, 20, 30, 60].includes(num(f, 'step')) ? num(f, 'step') : 15, maxDaysAhead: num(f, 'ahead') || 60,
  });
  await set('house_call_areas', s(f, 'areas').split(/\n|,/).map((x) => x.trim()).filter(Boolean));
  refresh(true); back('/admin/settings', 'Settings saved.');
}
/** Change the sign-in email and/or password. Always asks for the current password. */
export async function changeLogin(f: FormData) {
  const me = await requireAdmin();
  const a = await one<{ email: string; name: string; password_hash: string }>(`select email, name, password_hash from admins where id = $1`, [Number(me.sub)]);
  if (!a || !(await bcrypt.compare(String(f.get('current') ?? ''), a.password_hash))) back('/admin/settings', 'Your current password is incorrect.', 'err');
  const email = s(f, 'email').toLowerCase(), next = String(f.get('next') ?? '');
  if (!/^\S+@\S+\.\S+$/.test(email)) back('/admin/settings', 'Please enter a valid email address.', 'err');
  if (next && next.length < 10) back('/admin/settings', 'Use at least 10 characters for the new password.', 'err');
  if (email !== a!.email && (await one(`select 1 from admins where email = $1`, [email]))) back('/admin/settings', 'Another admin already uses that email.', 'err');
  if (email === a!.email && !next) back('/admin/settings', 'Nothing to change.', 'err');
  await q(`update admins set email = $2, password_hash = coalesce($3, password_hash) where id = $1`, [Number(me.sub), email, next ? await bcrypt.hash(next, 11) : null]);
  // re-issue the session so the panel shows the new email straight away
  (await cookies()).set(SESSION_COOKIE, await signSession({ sub: me.sub, email, name: a!.name }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 });
  back('/admin/settings', email !== a!.email && next ? 'Email and password changed.' : next ? 'Password changed.' : 'Sign-in email changed.');
}
