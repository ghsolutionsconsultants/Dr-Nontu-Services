import Link from 'next/link';
import { overview } from '@/lib/admin-data';
import { requireAdmin } from '@/lib/auth';
import { Badge, Head, TYPE_LABEL } from '@/components/admin/ui';
import { fmtShort, fmtTime, rands } from '@/lib/time';
import { services } from '@/lib/content';

export const metadata = { title: 'Overview' };

export default async function Overview() {
  const me = await requireAdmin();
  const o = await overview();
  const name = (slug: string) => services.find((s) => s.slug === slug)?.name ?? slug;
  const maxS = Math.max(1, ...o.services.map((x) => x.c)), maxI = Math.max(1, ...o.interest.map((x) => x.c));
  const hour = Number(new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: 'numeric', hour12: false }).format(new Date()));
  return (
    <>
      <Head eyebrow="Overview" title={`Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, ${me.name.replace(/^Dr\s+/, 'Dr ')}`}>
        <Link className="b b--ghost" href="/admin/calendar">Open calendar</Link>
        <Link className="b" href="/admin/bookings/new">New booking</Link>
      </Head>
      {o.feesPlaceholder && <div className="flash flash--warn">Fees are still the placeholder values from setup. <Link href="/admin/fees">Set your real fees →</Link></div>}
      {o.refunds > 0 && <div className="flash flash--warn">{o.refunds} cancelled booking{o.refunds > 1 ? 's need' : ' needs'} a refund. <Link href="/admin/bookings?payment=refund_pending">Review →</Link></div>}
      <div className="grid grid-4">
        <div className="card kpi"><small>Today</small><b>{o.today}</b><span>appointments</span></div>
        <div className="card kpi"><small>Booked this week</small><b>{o.week}</b><span>new confirmed bookings</span></div>
        <div className="card kpi"><small>Revenue this month</small><b>{rands(o.mtd)}</b><span>online + at the practice</span></div>
        <div className="card kpi"><small>Unpaid</small><b>{rands(o.unpaid)}</b><span>{o.unpaidCount} booking{o.unpaidCount === 1 ? '' : 's'} to collect</span></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>Coming up <Link href="/admin/bookings">All bookings →</Link></h2>
          {o.upcoming.length === 0 ? <p className="empty-s">No upcoming appointments yet.</p> : (
            <div className="tbl-wrap"><table className="tbl"><tbody>
              {o.upcoming.map((b) => (
                <tr key={b.id}>
                  <td className="tnum" style={{ whiteSpace: 'nowrap' }}>{fmtShort(new Date(b.start_at))}<br /><b>{fmtTime(new Date(b.start_at))}</b></td>
                  <td><Link href={`/admin/bookings/${b.id}`}>{b.patient_name}</Link><br /><small className="muted">{TYPE_LABEL[b.consult_type]} · {b.duration_minutes} min · {b.location_name}</small></td>
                  <td className="num"><Badge s={b.status} /><br /><Badge s={b.payment_status} /></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <h2>Most booked · 30 days <Link href="/admin/financials">Financials →</Link></h2>
            {o.services.length === 0 ? <p className="empty-s">Bookings will appear here.</p> : <div className="rank">
              {o.services.map((s) => <div className="rank-row" key={s.name}><span>{s.name}</span><b>{s.c}</b><div className="bar"><i style={{ width: `${s.c / maxS * 100}%` }} /></div></div>)}
            </div>}
          </div>
          <div className="card">
            <h2>Most interest · 30 days <Link href="/admin/analytics">Site stats →</Link></h2>
            {o.interest.length === 0 ? <p className="empty-s">Service page views will appear here.</p> : <div className="rank">
              {o.interest.map((s) => <div className="rank-row" key={s.slug}><span>{name(s.slug)}</span><b>{s.c} views</b><div className="bar"><i style={{ width: `${s.c / maxI * 100}%` }} /></div></div>)}
            </div>}
          </div>
        </div>
      </div>
    </>
  );
}
