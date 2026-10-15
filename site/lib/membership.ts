import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { one, q } from './db';
import { memberships as PLANS } from './content';
import { getSetting } from './booking';
import { paymentMode, paystack, siteUrl } from './payments';

export type PlanId = 'silver' | 'gold';
export interface Membership {
  id: string; plan: PlanId; price_cents: number; name: string; email: string; phone: string;
  status: 'pending' | 'active' | 'non_renewing' | 'past_due' | 'cancelled'; provider: string;
  paystack_customer: string | null; paystack_subscription: string | null; paystack_email_token: string | null;
  manage_token: string; started_at: Date | null; next_payment_at: Date | null; cancelled_at: Date | null; created_at: Date;
}
export const planById = (id: string) => PLANS.find((p) => p.id === id);

export const MembershipInput = z.object({
  plan: z.enum(['silver', 'gold']),
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().regex(/^[+0-9 ()-]{9,20}$/, 'Please enter a valid phone number'),
  consent: z.literal(true, { message: 'Please accept the membership terms to continue' }),
});

/** The Paystack plan for Silver/Gold, created on first use and remembered (amount changes create a new plan). */
async function paystackPlanCode(plan: PlanId) {
  const p = planById(plan)!;
  const key = `paystack_plan_${plan}_${p.priceCents}`;
  const saved = await getSetting<string | null>(key, null);
  if (saved) return saved;
  const d = await paystack<{ plan_code: string }>('/plan', {
    method: 'POST',
    body: JSON.stringify({ name: `Dr Nontu ${p.name} membership`, interval: 'monthly', amount: p.priceCents, currency: 'ZAR', description: p.label }),
  });
  await q(`insert into settings (key, value) values ($1, $2::text::jsonb) on conflict (key) do update set value = excluded.value`, [key, JSON.stringify(d.plan_code)]);
  return d.plan_code;
}

/** Creates a pending membership and returns the checkout URL for its first month. */
export async function startMembership(input: z.infer<typeof MembershipInput>) {
  const p = planById(input.plan)!;
  const mode = paymentMode();
  const [m] = await q<Membership>(
    `insert into memberships (plan, price_cents, name, email, phone, provider, manage_token, consent_at) values ($1,$2,$3,$4,$5,$6,$7, now()) returning *`,
    [p.id, p.priceCents, input.name, input.email.toLowerCase(), input.phone, mode, randomBytes(24).toString('base64url')]);
  const reference = `MB-${p.id.toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  await q(`insert into payments (membership_id, provider, reference, amount_cents, status) values ($1,$2,$3,$4,'initialized')`, [m.id, mode, reference, p.priceCents]);
  if (mode === 'mock') return `/pay/test?reference=${encodeURIComponent(reference)}`;
  const d = await paystack<{ authorization_url: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: m.email, amount: p.priceCents, currency: 'ZAR', reference, plan: await paystackPlanCode(p.id),
      callback_url: `${siteUrl()}/api/pay/callback`, metadata: { membership_id: m.id, plan: p.id },
    }),
  });
  return d.authorization_url;
}

export const membershipByToken = (t: string) => one<Membership>(`select * from memberships where manage_token = $1`, [t]);
export const membershipById = (id: string) => one<Membership>(`select * from memberships where id = $1`, [id]);

/** Paystack subscription events keep each membership's status and renewal date current. */
export async function onSubscriptionEvent(event: string, d: {
  subscription_code?: string; email_token?: string; next_payment_date?: string | null; status?: string;
  customer?: { email?: string; customer_code?: string }; plan?: { plan_code?: string; amount?: number } | null;
  amount?: number; reference?: string; channel?: string; paid_at?: string;
}) {
  const email = d.customer?.email?.toLowerCase();
  const bySub = d.subscription_code ? await one<Membership>(`select * from memberships where paystack_subscription = $1`, [d.subscription_code]) : undefined;
  const latest = async () => email ? one<Membership>(`select * from memberships where email = $1 and status in ('pending','active','past_due','non_renewing') order by created_at desc limit 1`, [email]) : undefined;
  const m = bySub ?? (await latest());
  if (!m) return;
  if (event === 'subscription.create') {
    await q(`update memberships set paystack_subscription = $2, paystack_email_token = $3, paystack_customer = $4, next_payment_at = coalesce($5::timestamptz, next_payment_at), updated_at = now() where id = $1`,
      [m.id, d.subscription_code ?? null, d.email_token ?? null, d.customer?.customer_code ?? null, d.next_payment_date ?? null]);
  } else if (event === 'charge.success' && d.plan?.plan_code) {
    // a monthly renewal: Paystack's own reference, not one we created
    if (d.reference && !(await one(`select 1 from payments where reference = $1`, [d.reference]))) {
      await q(`insert into payments (membership_id, provider, reference, amount_cents, status, channel, paid_at, raw) values ($1,'paystack',$2,$3,'success',$4, coalesce($5::timestamptz, now()), $6::text::jsonb)`,
        [m.id, d.reference, d.amount ?? m.price_cents, d.channel ?? 'card', d.paid_at ?? null, JSON.stringify(d)]);
    }
    await q(`update memberships set status = 'active', next_payment_at = now() + interval '1 month', updated_at = now() where id = $1`, [m.id]);
  } else if (event === 'invoice.payment_failed') {
    await q(`update memberships set status = 'past_due', updated_at = now() where id = $1`, [m.id]);
  } else if (event === 'subscription.not_renew') {
    await q(`update memberships set status = 'non_renewing', updated_at = now() where id = $1`, [m.id]);
  } else if (event === 'subscription.disable') {
    await q(`update memberships set status = 'cancelled', cancelled_at = coalesce(cancelled_at, now()), updated_at = now() where id = $1`, [m.id]);
  }
}

/** Members update their card on Paystack's own secure page. */
export async function cardUpdateLink(m: Membership) {
  if (paymentMode() !== 'paystack' || !m.paystack_subscription) return null;
  const d = await paystack<{ link: string }>(`/subscription/${m.paystack_subscription}/manage/link`);
  return d.link;
}

/** Stops future charges. The member keeps their benefits until the end of the month already paid. */
export async function cancelMembership(m: Membership) {
  if (!['active', 'past_due', 'pending', 'non_renewing'].includes(m.status)) return m;
  if (paymentMode() === 'paystack' && m.paystack_subscription && m.paystack_email_token) {
    await paystack('/subscription/disable', { method: 'POST', body: JSON.stringify({ code: m.paystack_subscription, token: m.paystack_email_token }) });
  }
  const [u] = await q<Membership>(`update memberships set status = 'cancelled', cancelled_at = now(), updated_at = now() where id = $1 returning *`, [m.id]);
  return u;
}
