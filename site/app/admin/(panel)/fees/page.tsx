import { q } from '@/lib/db';
import { addDuration, deleteDuration, saveDuration, saveType } from '../../actions';
import { Flash, Head } from '@/components/admin/ui';

export const metadata = { title: 'Fees & lengths' };

export default async function Fees(props: PageProps<'/admin/fees'>) {
  const sp = await props.searchParams;
  const [types, durs, placeholder] = await Promise.all([
    q<{ id: string; name: string; buffer_minutes: number; requires_prepay: boolean; active: boolean }>(`select * from consult_types order by sort`),
    q<{ id: number; consult_type: string; minutes: number; price_cents: number; active: boolean }>(`select * from consult_durations order by consult_type, minutes`),
    q<{ value: boolean }>(`select value from settings where key = 'fees_are_placeholder'`),
  ]);
  return (
    <>
      <Head eyebrow="Fees & lengths" title="What patients can book" />
      <Flash sp={sp} />
      {placeholder[0]?.value === true && <div className="flash flash--warn">These are placeholder fees from setup. Saving any fee clears this notice.</div>}
      <p className="muted" style={{ marginTop: -6 }}>Patients choose the length of their appointment; each length has its own fee. Changes show on the website and booking page immediately.</p>
      <div className="grid grid-3">
        {types.map((t) => (
          <div className="card" key={t.id}>
            <h2>{t.name}</h2>
            <table className="tbl"><thead><tr><th>Length</th><th>Fee (R)</th><th>On</th><th /></tr></thead><tbody>
              {durs.filter((d) => d.consult_type === t.id).map((d) => (
                <tr key={d.id}>
                  <td className="tnum">{d.minutes} min</td>
                  <td colSpan={2}>
                    <form action={saveDuration.bind(null, d.id)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input className="inp" name="price" type="number" step="0.01" min="0" defaultValue={d.price_cents / 100} style={{ width: 110 }} />
                      <input type="checkbox" name="active" defaultChecked={d.active} aria-label="Bookable" />
                      <button className="b b--ghost b--sm">Save</button>
                    </form>
                  </td>
                  <td className="num"><form action={deleteDuration.bind(null, d.id)}><button className="b b--ghost b--sm" aria-label={`Remove ${d.minutes} minutes`}>✕</button></form></td>
                </tr>
              ))}
            </tbody></table>
            <form action={addDuration} className="frm-row" style={{ marginTop: 14 }}>
              <input type="hidden" name="type" value={t.id} />
              <input className="inp" name="minutes" type="number" min={5} max={240} step={5} placeholder="Minutes" required />
              <input className="inp" name="price" type="number" step="0.01" min="0" placeholder="Fee (R)" required />
              <button className="b b--sm">Add length</button>
            </form>
            <form action={saveType.bind(null, t.id)} className="frm" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
              <label>Gap after each visit <small>minutes, e.g. travel time</small><input className="inp" name="buffer" type="number" min={0} max={180} step={5} defaultValue={t.buffer_minutes} /></label>
              <label style={{ display: 'flex', gap: 8, fontWeight: 400 }}><input type="checkbox" name="prepay" defaultChecked={t.requires_prepay} /> Patients must pay online when booking</label>
              <label style={{ display: 'flex', gap: 8, fontWeight: 400 }}><input type="checkbox" name="active" defaultChecked={t.active} /> Offer this type online</label>
              <div><button className="b b--ghost b--sm">Save {t.name.toLowerCase()} settings</button></div>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
