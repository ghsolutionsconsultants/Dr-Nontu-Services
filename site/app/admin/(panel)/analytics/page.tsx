import { analytics } from '@/lib/admin-data';
import { Head } from '@/components/admin/ui';
import { Donut, TrafficChart } from '@/components/admin/Charts';
import { services } from '@/lib/content';

export const metadata = { title: 'Site stats' };
const CTA: Record<string, string> = { whatsapp: 'WhatsApp', call: 'Call', header_book: 'Header “Book”', hero_book: 'Hero “Book”', footer_book: 'Footer “Book”', mbar_book: 'Mobile bar “Book”', mbar_whatsapp: 'Mobile bar WhatsApp', service_book: 'Service page “Book”', housecalls_book: 'House calls “Book”' };

export default async function Analytics(props: PageProps<'/admin/analytics'>) {
  const sp = await props.searchParams;
  const days = Number(sp.days) || 30;
  const a = await analytics(days);
  const visitors = a.daily.reduce((s, d) => s + d.visitors, 0), views = a.daily.reduce((s, d) => s + d.views, 0);
  const f = a.funnel ?? { visitors: 0, started: 0, completed: 0 };
  const pct = (x: number, y: number) => (y ? Math.round((x / y) * 100) : 0);
  // service interest: page views, clicks to book, and actual bookings, side by side
  const rows = services.map((s) => {
    const i = a.interest.find((x) => x.slug === s.slug), b = a.booked.find((x) => x.slug === s.slug);
    return { name: s.name, views: i?.views ?? 0, clicks: i?.clicks ?? 0, booked: b?.c ?? 0 };
  }).sort((x, y) => y.views + y.booked * 5 - (x.views + x.booked * 5));
  const maxV = Math.max(1, ...rows.map((r) => r.views));
  return (
    <>
      <Head eyebrow="Site stats" title="Who visits, and what they want">
        <form className="adm-actions"><select className="sel" name="days" defaultValue={String(days)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select><button className="b b--ghost">Update</button></form>
      </Head>
      <p className="muted" style={{ marginTop: -12, fontSize: '.88rem' }}>Private, first-party analytics: no cookies, no IP addresses, nothing shared with third parties.</p>
      <div className="grid grid-4">
        <div className="card kpi"><small>Visitors</small><b>{visitors}</b><span>unique per day</span></div>
        <div className="card kpi"><small>Page views</small><b>{views}</b><span>{visitors ? (views / visitors).toFixed(1) : 0} per visitor</span></div>
        <div className="card kpi"><small>Started booking</small><b>{pct(f.started, f.visitors)}%</b><span>{f.started} of {f.visitors} visitors</span></div>
        <div className="card kpi"><small>Booked</small><b>{pct(f.completed, f.started)}%</b><span>{f.completed} finished after starting</span></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}><h2>Visits</h2><TrafficChart data={a.daily} /></div>
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Service interest</h2>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Service</th><th style={{ width: '38%' }}>Page views</th><th className="num">Clicked “Book”</th><th className="num">Booked</th><th className="num">Views → bookings</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div className="bar" style={{ flex: 1 }}><i style={{ width: `${r.views / maxV * 100}%` }} /></div><b className="tnum" style={{ width: 36, textAlign: 'right' }}>{r.views}</b></div></td>
              <td className="num">{r.clicks}</td><td className="num">{r.booked}</td><td className="num">{r.views ? pct(r.booked, r.views) + '%' : '–'}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <div className="card"><h2>Top pages</h2>{a.pages.length ? <table className="tbl"><tbody>{a.pages.map((p) => <tr key={p.k}><td>{p.k}</td><td className="num">{p.c}</td></tr>)}</tbody></table> : <p className="empty-s">No visits yet.</p>}</div>
        <div className="card"><h2>Where visitors come from</h2>{a.refs.length ? <table className="tbl"><tbody>{a.refs.map((p) => <tr key={p.k}><td>{p.k}</td><td className="num">{p.c}</td></tr>)}</tbody></table> : <p className="empty-s">No visits yet.</p>}</div>
        <div className="card"><h2>Devices</h2><Donut data={a.devices.map((d) => ({ k: d.k, s: d.c }))} money={false} /></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Buttons people press</h2>
        {a.ctas.length ? <div className="rank">{a.ctas.map((c) => { const m = Math.max(...a.ctas.map((x) => x.c)); return <div className="rank-row" key={c.k}><span>{CTA[c.k] ?? c.k.replace(/_/g, ' ')}</span><b>{c.c}</b><div className="bar"><i style={{ width: `${c.c / m * 100}%` }} /></div></div>; })}</div> : <p className="empty-s">Clicks on Book, WhatsApp and Call will appear here.</p>}
      </div>
    </>
  );
}
