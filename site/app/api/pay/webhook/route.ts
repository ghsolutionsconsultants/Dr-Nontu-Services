import { settlePayment, validWebhookSignature } from '@/lib/payments';
import { notifyConfirmed } from '@/lib/notify';
import { q } from '@/lib/db';

// Paystack → Settings → API Keys & Webhooks → https://<site>/api/pay/webhook
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-paystack-signature'))) return new Response('bad signature', { status: 401 });
  const evt = JSON.parse(raw) as { event: string; data: { reference: string; amount: number; channel?: string; currency?: string; transaction_reference?: string } };
  if (evt.event === 'charge.success' && evt.data.currency === 'ZAR') {
    const r = await settlePayment(evt.data.reference, evt.data.amount, evt.data.channel ?? null, evt.data);
    if (r.ok && !r.already) await notifyConfirmed(r.bookingId);
  }
  if (evt.event === 'refund.processed' && evt.data.transaction_reference) {
    await q(`update payments set status = 'refunded', refunded_at = now() where reference = $1`, [evt.data.transaction_reference]);
  }
  return new Response('ok');
}
