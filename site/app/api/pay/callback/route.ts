import { redirect } from 'next/navigation';
import { one } from '@/lib/db';
import { verifyPayment } from '@/lib/payments';
import { notifySettled } from '@/lib/notify';

// Paystack (or the test checkout) sends the patient back here with ?reference=…
export async function GET(req: Request) {
  const u = new URL(req.url);
  const reference = u.searchParams.get('reference') ?? u.searchParams.get('trxref');
  if (!reference) redirect('/book');
  const p = await one<{ booking_token: string | null; member_token: string | null }>(
    `select b.manage_token booking_token, m.manage_token member_token from payments p
       left join bookings b on b.id = p.booking_id left join memberships m on m.id = p.membership_id where p.reference = $1`, [reference]);
  if (!p) redirect('/book');
  let ok = false;
  try {
    const r = await verifyPayment(reference);
    ok = r.ok;
    await notifySettled(r);
  } catch (e) { console.error(e); }
  if (p.member_token) redirect(`/membership/${p.member_token}${ok ? '?welcome=1' : '?payment=failed'}`);
  redirect(ok ? `/book/confirmed?t=${p.booking_token}` : `/manage/${p.booking_token}?payment=failed`);
}
