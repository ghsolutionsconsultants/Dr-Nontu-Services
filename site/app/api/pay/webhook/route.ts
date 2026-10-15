import { settlePayment, validWebhookSignature } from '@/lib/payments';
import { notifySettled } from '@/lib/notify';
import { onSubscriptionEvent } from '@/lib/membership';
import { one, q } from '@/lib/db';

// Paystack → Settings → API Keys & Webhooks → https://<site>/api/pay/webhook
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-paystack-signature'))) return new Response('bad signature', { status: 401 });
  const evt = JSON.parse(raw) as { event: string; data: Parameters<typeof onSubscriptionEvent>[1] & { currency?: string; transaction_reference?: string } };
  const d = evt.data;
  if (evt.event === 'charge.success' && d.currency === 'ZAR' && d.reference) {
    const ours = await one(`select 1 from payments where reference = $1`, [d.reference]);
    if (ours) await notifySettled(await settlePayment(d.reference, d.amount ?? 0, d.channel ?? null, d));
    else if (d.plan?.plan_code) await onSubscriptionEvent('charge.success', d); // a monthly membership renewal
  }
  if (['subscription.create', 'subscription.not_renew', 'subscription.disable', 'invoice.payment_failed'].includes(evt.event)) await onSubscriptionEvent(evt.event, d);
  if (evt.event === 'refund.processed' && d.transaction_reference) {
    await q(`update payments set status = 'refunded', refunded_at = now() where reference = $1`, [d.transaction_reference]);
  }
  return new Response('ok');
}
