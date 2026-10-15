import { bookingById } from './booking';
import { mailConfirmed, mailMembershipWelcome } from './email';
import { membershipById } from './membership';
import type { Settled } from './payments';

export async function notifyConfirmed(bookingId: string) {
  const b = await bookingById(bookingId);
  if (b) await mailConfirmed(b);
}

/** After a first successful payment: the booking confirmation, or the membership welcome. */
export async function notifySettled(r: Settled) {
  if (!r.ok || r.already) return;
  if (r.bookingId) await notifyConfirmed(r.bookingId);
  if (r.membershipId) { const m = await membershipById(r.membershipId); if (m) await mailMembershipWelcome(m); }
}
