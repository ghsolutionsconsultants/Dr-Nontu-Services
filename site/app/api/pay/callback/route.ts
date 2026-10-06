import { redirect } from 'next/navigation';
import { one } from '@/lib/db';
import { verifyPayment } from '@/lib/payments';
import { notifyConfirmed } from '@/lib/notify';

// Paystack (or the test checkout) sends the patient back here with ?reference=…
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get('reference') ?? new URL(req.url).searchParams.get('trxref');
  if (!reference) redirect('/book');
  const p = await one<{ manage_token: string }>(`select b.manage_token from payments p join bookings b on b.id = p.booking_id where p.reference = $1`, [reference]);
  if (!p) redirect('/book');
  let ok = false;
  try {
    const r = await verifyPayment(reference);
    ok = r.ok;
    if (r.ok && 'already' in r && !r.already) await notifyConfirmed(r.bookingId);
  } catch (e) { console.error(e); }
  redirect(ok ? `/book/confirmed?t=${p.manage_token}` : `/manage/${p.manage_token}?payment=failed`);
}
