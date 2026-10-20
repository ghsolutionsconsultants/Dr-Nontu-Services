import { q } from '@/lib/db';
import { addDuration, addZone, deleteDuration, deleteZone, saveDuration, saveType, saveZone } from '../../actions';
import { clock, lengthLabels } from '@/lib/fees';
import { Flash, Head } from '@/components/admin/ui';

export const metadata = { title: 'Fees & lengths' };

export default async function Fees(props: PageProps<'/admin/fees'>) {
  const sp = await props.searchParams;
  const [types, durs, placeholder, zones] = await Promise.all([
    q<{ id: string; name: string; buffer_minutes: number; requires_prepay: boolean; active: boolean }>(`select * from consult_types order by sort`),
    q<{ id: number; consult_type: string; minutes: number; price_cents: number; active: boolean }>(`select * from consult_durations order by consult_type, minutes`),
    q<{ value: boolean }>(`select value from settings where key = 'fees_are_placeholder'`),
    q<{ id: number; name: string; note: string; price_cents: number | null; evening_price_cents: number | null; evening_from: number | null; active: boolean }>(`select * from house_call_zones order by sort, id`),
  ]);
  return (
    <>
      <Head eyebrow="Fees & lengths" title="What patients can book" />
      <Flash sp={sp} />
      {placeholder[0]?.value === true && <div className="flash flash--warn">These are placeholder fees from setup. Saving any fee clears this notice.</div>}
      <p className="muted" style={{ marginTop: -6 }}>In person and virtual: patients choose a length, and each length has its own fee (shown to patients as “Up to 15 minutes”, “16–30 minutes” and so on). House calls: the fee depends on the area, set below. Changes show on the website and booking page immediately.</p>
      <div className="grid grid-3">
        {types.map((t) => (
          <div className="card" key={t.id}>
            <h2>{t.name}</h2>
            <table className="tbl"><thead><tr><th>Length</th><th>Fee (R)</th><th>On</th><th /></tr></thead><tbody>
              {durs.filter((d) => d.consult_type === t.id).map((d, i, all) => (
                <tr key={d.id}>
                  <td className="tnum">{d.minutes} min{t.id !== 'house_call' && <><br /><small className="muted">{lengthLabels(all.map((x) => x.minutes))[i]}</small></>}</td>
                  <td colSpan={2}>
                    <form action={saveDuration.bind(null, d.id)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {t.id === 'house_call'
                        ? <><input type="hidden" name="price" value={d.price_cents / 100} /><small className="muted" style={{ minWidth: 110 }}>fee by area</small></>
                        : <input className="inp" name="price" type="number" step="0.01" min="0" defaultValue={d.price_cents / 100} style={{ width: 110 }} />}
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
              {t.id === 'house_call' ? <input type="hidden" name="price" value="0" /> : <input className="inp" name="price" type="number" step="0.01" min="0" placeholder="Fee (R)" required />}
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

      <div className="card" style={{ marginTop: 18 }}>
        <h2>House-call fees by area</h2>
        <p className="muted" style={{ margin: '0 0 12px', fontSize: '.88rem' }}>Patients choose their area when booking a house call. Leave the fee empty for “ask for a quote” (they’re sent to WhatsApp instead of booking). An evening fee applies to visits starting at or after its time.</p>
        <div className="zone-list">
          <div className="zone-row zone-head" aria-hidden><span>Area</span><span>Note</span><span>Fee (R)</span><span>Evening fee (R)</span><span>Evening from</span><span>On</span><span /></div>
          {zones.map((z) => (
            <form key={z.id} action={saveZone.bind(null, z.id)} className="zone-row">
              <input className="inp" name="name" defaultValue={z.name} required aria-label="Area" />
              <input className="inp" name="note" defaultValue={z.note} aria-label="Note" placeholder="optional" />
              <input className="inp" name="price" type="number" step="0.01" min="0" defaultValue={z.price_cents == null ? '' : z.price_cents / 100} placeholder="quote" aria-label="Fee" />
              <input className="inp" name="evening_price" type="number" step="0.01" min="0" defaultValue={z.evening_price_cents == null ? '' : z.evening_price_cents / 100} placeholder="–" aria-label="Evening fee" />
              <input className="inp" name="evening_from" type="time" defaultValue={z.evening_from == null ? '19:00' : clock(z.evening_from)} aria-label="Evening fee from" />
              <input type="checkbox" name="active" defaultChecked={z.active} aria-label="Offered" />
              <span className="zone-btns"><button className="b b--ghost b--sm">Save</button><button className="b b--ghost b--sm" formAction={deleteZone.bind(null, z.id)} aria-label={`Remove ${z.name}`}>✕</button></span>
            </form>
          ))}
        </div>
        <form action={addZone} className="zone-row" style={{ marginTop: 14 }}>
          <input className="inp" name="name" placeholder="New area, e.g. More than 15 km" required />
          <input className="inp" name="note" placeholder="Note (optional)" />
          <input className="inp" name="price" type="number" step="0.01" min="0" placeholder="Fee (empty = quote)" />
          <input className="inp" name="evening_price" type="number" step="0.01" min="0" placeholder="Evening fee" />
          <input className="inp" name="evening_from" type="time" defaultValue="19:00" />
          <span />
          <button className="b b--sm">Add area</button>
        </form>
      </div>
    </>
  );
}
