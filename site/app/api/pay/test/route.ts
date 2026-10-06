import { one, q } from '@/lib/db';
import { paymentMode, settlePayment } from '@/lib/payments';
import { notifyConfirmed } from '@/lib/notify';

// Built-in test checkout. Only exists while no Paystack key is configured.
export async function POST(req: Request) {
  if (paymentMode() !== 'mock') return new Response('Not found', { status: 404 });
  const f = await req.formData();
  const reference = String(f.get('reference') ?? ''), outcome = String(f.get('outcome') ?? '');
  const p = await one<{ amount_cents: number }>(`select amount_cents from payments where reference = $1 and provider = 'mock'`, [reference]);
  if (!p) return new Response('Unknown reference', { status: 404 });
  if (outcome === 'success') {
    const r = await settlePayment(reference, p.amount_cents, String(f.get('channel') ?? 'card'), { test: true });
    if (r.ok && !r.already) await notifyConfirmed(r.bookingId);
  } else await q(`update payments set status = 'failed' where reference = $1`, [reference]);
  // 303 so the browser follows with GET
  return Response.redirect(new URL(`/api/pay/callback?reference=${encodeURIComponent(reference)}`, req.url), 303);
}
