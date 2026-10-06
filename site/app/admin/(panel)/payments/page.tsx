import Link from 'next/link';
import { q } from '@/lib/db';
import { Badge, Flash, Head } from '@/components/admin/ui';
import { fmtShort, fmtTime, rands } from '@/lib/time';
import { paymentMode } from '@/lib/payments';

export const metadata = { title: 'Payments' };

export default async function Payments(props: PageProps<'/admin/payments'>) {
  const sp = await props.searchParams;
  const status = typeof sp.status === 'string' ? sp.status : '';
  const rows = await q<{ id: number; booking_id: string; reference: string; provider: string; amount_cents: number; status: string; channel: string | null; paid_at: Date | null; created_at: Date; patient_name: string; ref: string }>(
    `select p.*, b.patient_name, b.ref from payments p join bookings b on b.id = p.booking_id ${status ? 'where p.status = $1' : ''} order by p.created_at desc limit 300`, status ? [status] : []);
  const due = await q<{ id: string; ref: string; patient_name: string; price_cents: number }>(`select id, ref, patient_name, price_cents from bookings where payment_status = 'refund_pending' order by updated_at desc`);
  return (
    <>
      <Head eyebrow="Payments" title="Transactions"><a className="b b--ghost" href="/api/admin/export/payments">Export CSV</a></Head>
      <Flash sp={sp} />
      {paymentMode() === 'mock' && <div className="flash">Paystack isn&rsquo;t connected yet: online payments use the built-in test checkout. Add your Paystack secret key to go live.</div>}
      {due.length > 0 && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(154,52,18,.35)' }}>
          <h2>Refunds due</h2>
          <table className="tbl"><tbody>{due.map((b) => <tr key={b.id}><td><Link href={`/admin/bookings/${b.id}`}>{b.patient_name}</Link> · {b.ref}</td><td className="num">{rands(b.price_cents)}</td><td className="num"><Link className="b b--gold b--sm" href={`/admin/bookings/${b.id}`}>Review & refund</Link></td></tr>)}</tbody></table>
        </div>
      )}
      <form className="filters">
        <select className="sel" name="status" defaultValue={status}><option value="">All</option><option value="success">Paid</option><option value="initialized">Started, not completed</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select>
        <button className="b b--ghost">Filter</button>
      </form>
      <div className="card"><div className="tbl-wrap">
        {rows.length === 0 ? <p className="empty-s">No payments yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Date</th><th>Patient</th><th>Reference</th><th>Method</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}>
                <td className="tnum">{fmtShort(new Date(p.paid_at ?? p.created_at))} {fmtTime(new Date(p.paid_at ?? p.created_at))}</td>
                <td><Link href={`/admin/bookings/${p.booking_id}`}>{p.patient_name}</Link><br /><small className="muted">{p.ref}</small></td>
                <td><small>{p.reference}</small></td>
                <td>{p.provider === 'at_visit' ? 'At practice' : p.provider === 'mock' ? 'Test checkout' : 'Paystack'}<br /><small className="muted">{(p.channel ?? '–').replace('_', ' ')}</small></td>
                <td className="num">{rands(p.amount_cents)}</td>
                <td><Badge s={p.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
