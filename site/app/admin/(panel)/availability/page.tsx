import { q } from '@/lib/db';
import { addBlackout, addRule, deleteBlackout, deleteRule } from '../../actions';
import { Flash, Head, TYPE_LABEL } from '@/components/admin/ui';
import { fmtShort, fmtTime, hhmm } from '@/lib/time';

export const metadata = { title: 'Availability' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function Availability(props: PageProps<'/admin/availability'>) {
  const sp = await props.searchParams;
  const [rules, blocks, locs] = await Promise.all([
    q<{ id: number; consult_type: string; location_id: string | null; weekday: number; start_min: number; end_min: number; lname: string | null }>(
      `select r.*, l.name lname from availability_rules r left join locations l on l.id = r.location_id order by r.consult_type, r.location_id, r.weekday, r.start_min`),
    q<{ id: number; starts_at: Date; ends_at: Date; reason: string }>(`select * from blackouts where ends_at > now() order by starts_at`),
    q<{ id: string; name: string; kind: string }>(`select id, name, kind from locations order by sort`),
  ]);
  const groups = Object.entries(rules.reduce<Record<string, typeof rules>>((a, r) => { const k = `${TYPE_LABEL[r.consult_type]} · ${r.lname ?? 'any location'}`; (a[k] ??= []).push(r); return a; }, {}));
  return (
    <>
      <Head eyebrow="Availability" title="Opening hours & time off" />
      <Flash sp={sp} />
      <div className="grid grid-2">
        <div className="card">
          <h2>Weekly opening hours</h2>
          <p className="muted" style={{ marginTop: -6, fontSize: '.88rem' }}>Patients can book inside these windows. Dr Nontu can only be in one place at a time, so a booking anywhere blocks the same time everywhere.</p>
          {groups.map(([g, rs]) => (
            <div key={g} style={{ marginTop: 16 }}>
              <b style={{ fontSize: '.9rem' }}>{g}</b>
              <table className="tbl"><tbody>{rs.map((r) => (
                <tr key={r.id}><td style={{ width: 70 }}>{DAYS[r.weekday]}</td><td className="tnum">{hhmm(r.start_min)} – {r.end_min === 1440 ? '24:00' : hhmm(r.end_min)}</td>
                  <td className="num"><form action={deleteRule.bind(null, r.id)}><button className="b b--ghost b--sm">Remove</button></form></td></tr>
              ))}</tbody></table>
            </div>
          ))}
          <form action={addRule} className="frm" style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
            <b style={{ fontSize: '.9rem' }}>Add opening hours</b>
            <div className="frm-row">
              <label>Type<select className="sel" name="type"><option value="in_person">In person</option><option value="house_call">House call</option><option value="virtual">Virtual</option></select></label>
              <label>Location<select className="sel" name="location">{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
              <label>From<input className="inp" type="time" name="start" defaultValue="09:00" step={900} /></label>
              <label>To<input className="inp" name="end" defaultValue="16:00" pattern="([01]\d|2[0-4]):[0-5]\d" placeholder="HH:MM" /></label>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => <label key={d} style={{ display: 'flex', gap: 6, fontWeight: 400 }}><input type="checkbox" name="day" value={i} defaultChecked={i > 0 && i < 6} />{d}</label>)}
            </div>
            <div><button className="b">Add hours</button></div>
          </form>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h2>Leave & blocked time</h2>
          {blocks.length === 0 ? <p className="empty-s">Nothing blocked. Add leave, lunch or meetings below.</p> : (
            <table className="tbl"><tbody>{blocks.map((x) => (
              <tr key={x.id}><td className="tnum">{fmtShort(new Date(x.starts_at))} {fmtTime(new Date(x.starts_at))} → {fmtShort(new Date(x.ends_at))} {fmtTime(new Date(x.ends_at))}<br /><small className="muted">{x.reason || 'Blocked'}</small></td>
                <td className="num"><form action={deleteBlackout.bind(null, x.id)}><button className="b b--ghost b--sm">Remove</button></form></td></tr>
            ))}</tbody></table>
          )}
          <form action={addBlackout} className="frm" style={{ marginTop: 18 }}>
            <div className="frm-row">
              <label>From<input className="inp" type="date" name="from" required /></label>
              <label>Time <small>blank = all day</small><input className="inp" type="time" name="fromTime" /></label>
            </div>
            <div className="frm-row">
              <label>To<input className="inp" type="date" name="to" /></label>
              <label>Time<input className="inp" type="time" name="toTime" /></label>
            </div>
            <label>Reason <small>only you see this</small><input className="inp" name="reason" placeholder="Leave, conference, lunch…" /></label>
            <div><button className="b">Block this time</button></div>
          </form>
        </div>
      </div>
    </>
  );
}
