import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { q, one } from './db';
import type { Booking } from './booking';
import { practice } from './content';

// Paystack when PAYSTACK_SECRET_KEY is set; otherwise a local test checkout (/pay/test) that
// follows the same redirect → verify → confirm path, so the whole flow can be exercised offline.
export const paymentMode = () => (process.env.PAYSTACK_SECRET_KEY ? 'paystack' : 'mock') as 'paystack' | 'mock';
const PAYSTACK = 'https://api.paystack.co';
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? practice.url;

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(PAYSTACK + path, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const j = await r.json();
  if (!r.ok || j.status === false) throw new Error(`Paystack: ${j.message ?? r.statusText}`);
  return j.data as T;
}

export interface Payment { id: number; booking_id: string; provider: string; reference: string; amount_cents: number; status: string; channel: string | null; paid_at: Date | null }

/** Starts an online payment for a booking and returns the checkout URL. */
export async function startPayment(b: Booking): Promise<string> {
  if (b.payment_status === 'paid') throw new Error('This booking is already paid.');
  const reference = `${b.ref}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const mode = paymentMode();
  await q(`insert into payments (booking_id, provider, reference, amount_cents, status) values ($1,$2,$3,$4,'initialized')`, [b.id, mode, reference, b.price_cents]);
  // a fresh hold while the patient is at checkout
  await q(`update bookings set hold_expires_at = now() + interval '15 minutes' where id = $1 and status = 'pending_payment'`, [b.id]);
  if (mode === 'mock') return `/pay/test?reference=${encodeURIComponent(reference)}`;
  const data = await paystack<{ authorization_url: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: b.patient_email, amount: b.price_cents, currency: 'ZAR', reference,
      callback_url: `${siteUrl()}/api/pay/callback`,
      metadata: { booking_ref: b.ref, booking_id: b.id, cancel_action: `${siteUrl()}/manage/${b.manage_token}` },
    }),
  });
  return data.authorization_url;
}

/**
 * Marks a payment successful and confirms its booking. Idempotent: webhook, callback and
 * the test checkout may all report the same reference.
 */
export async function settlePayment(reference: string, amountCents: number, channel: string | null, raw: unknown) {
  const p = await one<Payment>(`select * from payments where reference = $1`, [reference]);
  if (!p) return { ok: false as const, reason: 'unknown reference' };
  if (amountCents !== p.amount_cents) return { ok: false as const, reason: 'amount mismatch' };
  if (p.status === 'success') return { ok: true as const, bookingId: p.booking_id, already: true };
  await q(`update payments set status = 'success', channel = $2, paid_at = now(), raw = $3 where id = $1`, [p.id, channel, JSON.stringify(raw ?? {})]);
  // An expired hold whose time is still free comes back to life; if someone took the slot meanwhile,
  // the exclusion constraint refuses and the booking is flagged for refund.
  try {
    await q(`update bookings set payment_status = 'paid', status = case when status in ('pending_payment','expired') then 'confirmed' else status end,
             hold_expires_at = null, updated_at = now() where id = $1`, [p.booking_id]);
  } catch {
    await q(`update bookings set payment_status = 'refund_pending', updated_at = now() where id = $1`, [p.booking_id]);
  }
  return { ok: true as const, bookingId: p.booking_id, already: false };
}

/** Asks Paystack for the truth about a reference (used by the redirect callback). */
export async function verifyPayment(reference: string) {
  if (paymentMode() === 'mock') {
    const p = await one<Payment>(`select * from payments where reference = $1`, [reference]);
    return p?.status === 'success' ? { ok: true as const, bookingId: p.booking_id } : { ok: false as const, reason: 'not paid' };
  }
  const d = await paystack<{ status: string; amount: number; channel: string; currency: string }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (d.status !== 'success' || d.currency !== 'ZAR') return { ok: false as const, reason: d.status };
  return settlePayment(reference, d.amount, d.channel, d);
}

export function validWebhookSignature(rawBody: string, signature: string | null) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = createHmac('sha512', key).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function refundPayment(p: Payment) {
  if (p.status !== 'success') throw new Error('Only successful payments can be refunded.');
  if (p.provider === 'paystack') await paystack('/refund', { method: 'POST', body: JSON.stringify({ transaction: p.reference }) });
  await q(`update payments set status = 'refunded', refunded_at = now() where id = $1`, [p.id]);
  await q(`update bookings set payment_status = 'refunded', updated_at = now() where id = $1`, [p.booking_id]);
}

/** Payment taken at the practice: cash, card machine or medical aid. */
export async function recordInPersonPayment(b: Booking, channel: 'cash' | 'card_machine' | 'medical_aid', amountCents = b.price_cents) {
  const reference = `${b.ref}-VISIT-${randomBytes(2).toString('hex').toUpperCase()}`;
  await q(`insert into payments (booking_id, provider, reference, amount_cents, status, channel, paid_at) values ($1,'at_visit',$2,$3,'success',$4, now())`, [b.id, reference, amountCents, channel]);
  await q(`update bookings set payment_status = 'paid', updated_at = now() where id = $1`, [b.id]);
}

export const paymentsForBooking = (id: string) => q<Payment>(`select * from payments where booking_id = $1 order by created_at desc`, [id]);
