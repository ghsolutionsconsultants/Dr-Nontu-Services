import Link from 'next/link';
import { q } from '@/lib/db';
import { Badge, Flash, Head, TYPE_LABEL } from '@/components/admin/ui';
import { fmtShort, fmtTime, rands } from '@/lib/time';

export const metadata = { title: 'Bookings' };

export default async function Bookings(props: PageProps<'/admin/bookings'>) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const when = str('when') || 'upcoming', status = str('status'), payment = str('payment'), search = str('q'), type = str('type');
  const where: string[] = [], args: unknown[] = [];
  const add = (sql: string, v: unknown) => { args.push(v); where.push(sql.replace('?', `$${args.length}`)); };
  if (when === 'upcoming') where.push(`b.start_at >= now() - interval '1 hour'`);
  if (when === 'past') where.push(`b.start_at < now()`);
  if (status) add(`b.status = ?`, status); else where.push(`b.status <> 'expired'`);
  if (payment) add(`b.payment_status = ?`, payment);
  if (type) add(`b.consult_type = ?`, type);
  if (search) { args.push(`%${search}%`); const i = args.length; where.push(`(b.patient_name ilike $${i} or b.patient_email ilike $${i} or b.patient_phone ilike $${i} or b.ref ilike $${i})`); }
  const rows = await q<{ id: string; ref: string; start_at: Date; patient_name: string; patient_phone: string; consult_type: string; duration_minutes: number; price_cents: number; status: string; payment_status: string; payment_choice: string; location_name: string; service_name: string | null }>(
    `select b.id, b.ref, b.start_at, b.patient_name, b.patient_phone, b.consult_type, b.duration_minutes, b.price_cents, b.status, b.payment_status, b.payment_choice, l.name location_name, s.name service_name
     from bookings b join locations l on l.id = b.location_id left join services s on s.id = b.service_id
     ${where.length ? 'where ' + where.join(' and ') : ''} order by b.start_at ${when === 'past' ? 'desc' : 'asc'} limit 300`, args);
  return (
    <>
      <Head eyebrow="Bookings" title="All bookings">
        <a className="b b--ghost" href="/api/admin/export/bookings">Export CSV</a>
        <Link className="b" href="/admin/bookings/new">New booking</Link>
      </Head>
      <Flash sp={sp} />
      <form className="filters">
        <select className="sel" name="when" defaultValue={when}><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All dates</option></select>
        <select className="sel" name="type" defaultValue={type}><option value="">All types</option><option value="in_person">In person</option><option value="house_call">House call</option><option value="virtual">Virtual</option></select>
        <select className="sel" name="status" defaultValue={status}><option value="">Any status</option>{['confirmed', 'pending_payment', 'completed', 'cancelled', 'no_show', 'expired'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <select className="sel" name="payment" defaultValue={payment}><option value="">Any payment</option>{['unpaid', 'paid', 'refund_pending', 'refunded'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <input className="inp" name="q" defaultValue={search} placeholder="Name, phone, email or ref" style={{ minWidth: 220 }} />
        <button className="b b--ghost">Filter</button>
      </form>
      <div className="card"><div className="tbl-wrap">
        {rows.length === 0 ? <p className="empty-s">No bookings match these filters.</p> : (
          <table className="tbl">
            <thead><tr><th>When</th><th>Patient</th><th>Visit</th><th>Reason</th><th className="num">Fee</th><th>Status</th><th>Payment</th></tr></thead>
            <tbody>{rows.map((b) => (
              <tr key={b.id}>
                <td className="tnum" style={{ whiteSpace: 'nowrap' }}>{fmtShort(new Date(b.start_at))} · <b>{fmtTime(new Date(b.start_at))}</b></td>
                <td><Link href={`/admin/bookings/${b.id}`}>{b.patient_name}</Link><br /><small className="muted">{b.ref} · {b.patient_phone}</small></td>
                <td>{TYPE_LABEL[b.consult_type]} · {b.duration_minutes} min<br /><small className="muted">{b.location_name}</small></td>
                <td>{b.service_name ?? <span className="muted">–</span>}</td>
                <td className="num">{rands(b.price_cents)}</td>
                <td><Badge s={b.status} /></td>
                <td><Badge s={b.payment_status} />{b.payment_status === 'unpaid' && <><br /><small className="muted">{b.payment_choice === 'at_visit' ? 'at visit' : 'online'}</small></>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
