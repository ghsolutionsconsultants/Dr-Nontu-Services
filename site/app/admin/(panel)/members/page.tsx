import { q } from '@/lib/db';
import { Flash, Head } from '@/components/admin/ui';
import { fmtShort, rands } from '@/lib/time';
import { memberships as PLANS } from '@/lib/content';
import { paymentMode } from '@/lib/payments';

export const metadata = { title: 'Members' };

export default async function Members(props: PageProps<'/admin/members'>) {
  const sp = await props.searchParams;
  const status = typeof sp.status === 'string' ? sp.status : '';
  const [rows, totals] = await Promise.all([
    q<{ id: string; plan: string; name: string; email: string; phone: string; status: string; price_cents: number; started_at: Date | null; next_payment_at: Date | null; created_at: Date }>(
      `select id, plan, name, email, phone, status, price_cents, started_at, next_payment_at, created_at from memberships
       ${status ? 'where status = $1' : `where status <> 'pending' or created_at > now() - interval '2 days'`} order by created_at desc limit 500`, status ? [status] : []),
    q<{ plan: string; n: number; mrr: number }>(`select plan, count(*)::int n, coalesce(sum(price_cents),0)::int mrr from memberships where status in ('active','non_renewing','past_due') group by plan`),
  ]);
  const by = (id: string) => totals.find((t) => t.plan === id) ?? { n: 0, mrr: 0 };
  const mrr = totals.reduce((a, t) => a + t.mrr, 0);
  return (
    <>
      <Head eyebrow="Members" title="Membership" />
      <Flash sp={sp} />
      {paymentMode() === 'mock' && <div className="flash">Paystack isn&rsquo;t connected yet: subscriptions use the built-in test checkout and won&rsquo;t renew. Add your Paystack secret key to take real monthly payments.</div>}
      <div className="grid grid-4">
        <div className="card kpi"><small>Monthly income</small><b>{rands(mrr)}</b><span>from memberships</span></div>
        {PLANS.map((p) => <div className="card kpi" key={p.id}><small>{p.name} members</small><b>{by(p.id).n}</b><span>{rands(p.priceCents)} / month</span></div>)}
        <div className="card kpi"><small>Total members</small><b>{totals.reduce((a, t) => a + t.n, 0)}</b><span>active or ending</span></div>
      </div>
      <form className="filters" style={{ marginTop: 18 }}>
        <select className="sel" name="status" defaultValue={status}><option value="">Current</option>{['active', 'past_due', 'non_renewing', 'cancelled', 'pending'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <button className="b b--ghost">Filter</button>
      </form>
      <div className="card"><div className="tbl-wrap">
        {rows.length === 0 ? <p className="empty-s">No members yet. They appear here as soon as someone subscribes.</p> : (
          <table className="tbl">
            <thead><tr><th>Member</th><th>Plan</th><th>Status</th><th>Since</th><th>Next payment</th><th className="num">Monthly</th></tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.id}>
                <td>{m.name}<br /><small className="muted">{m.phone} · <a href={`mailto:${m.email}`}>{m.email}</a></small></td>
                <td style={{ textTransform: 'capitalize' }}>{m.plan}</td>
                <td><span className={`badge-s s-${m.status === 'active' ? 'paid' : m.status === 'past_due' ? 'refund_pending' : m.status === 'pending' ? 'pending_payment' : 'cancelled'}`}>{m.status.replace('_', ' ')}</span></td>
                <td className="tnum">{m.started_at ? fmtShort(new Date(m.started_at)) : '–'}</td>
                <td className="tnum">{m.next_payment_at && m.status !== 'cancelled' ? fmtShort(new Date(m.next_payment_at)) : '–'}</td>
                <td className="num">{rands(m.price_cents)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
