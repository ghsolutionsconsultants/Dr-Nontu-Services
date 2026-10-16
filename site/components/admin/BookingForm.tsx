'use client';
import { useActionState, useState } from 'react';
import type { FormState } from '@/app/admin/actions';

type TypeId = 'in_person' | 'house_call' | 'virtual';
export interface FormCatalog {
  types: { id: TypeId; name: string; durations: { minutes: number; price_cents: number }[] }[];
  locations: { id: string; name: string; kind: string }[];
  services: { id: number; name: string; modes: string[] }[];
}
export interface FormValues {
  id?: string; type: TypeId; location?: string; serviceId?: number | null; duration: number; price: number; date: string; time: string;
  status: string; paymentChoice: 'online' | 'at_visit'; name?: string; email?: string; phone?: string; dob?: string;
  medicalAid?: string | null; medicalAidNo?: string | null; address?: string | null; reason?: string; allowOverlap?: boolean;
}

const MODE: Record<TypeId, string> = { in_person: 'clinic', house_call: 'house', virtual: 'screen' };
const STATUS: [string, string][] = [['confirmed', 'Confirmed'], ['completed', 'Completed (already seen)'], ['no_show', 'No-show'], ['cancelled', 'Cancelled']];
const rand = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, '');

export function BookingForm({ catalog, initial, action }: {
  catalog: FormCatalog; initial: FormValues; action: (prev: FormState, f: FormData) => Promise<FormState>;
}) {
  const edit = !!initial.id;
  const [state, run, pending] = useActionState(action, null);
  const [type, setType] = useState<TypeId>(initial.type);
  const [duration, setDuration] = useState(String(initial.duration));
  const [price, setPrice] = useState(String(initial.price));
  const [status, setStatus] = useState(initial.status);
  const [pay, setPay] = useState<'at_visit' | 'paid' | 'link'>('at_visit');
  const [repeat, setRepeat] = useState('none');
  const [email, setEmail] = useState(initial.email ?? '');

  const t = catalog.types.find((x) => x.id === type)!;
  const presets = t?.durations ?? [];
  const clinics = catalog.locations.filter((l) => l.kind === 'clinic');
  const services = catalog.services.filter((s) => s.modes.includes(MODE[type]));
  const pick = (minutes: number, cents: number) => { setDuration(String(minutes)); setPrice(rand(cents)); };
  const chooseType = (id: TypeId) => {
    setType(id);
    const same = catalog.types.find((x) => x.id === id)?.durations.find((d) => d.minutes === Number(duration));
    if (same) setPrice(rand(same.price_cents));
  };
  const statuses = STATUS.some(([v]) => v === initial.status) ? STATUS : [[initial.status, initial.status.replace('_', ' ')] as [string, string], ...STATUS];

  return (
    <form action={run} className="bk-form">
      {edit && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <div className="flash flash--warn" role="alert">{state.error}</div>}

      <section className="card frm">
        <h2>Appointment</h2>
        <div className="seg" role="radiogroup" aria-label="Type">
          {catalog.types.map((x) => (
            <label key={x.id}><input type="radio" name="type" value={x.id} checked={type === x.id} onChange={() => chooseType(x.id)} /><span>{x.name}</span></label>
          ))}
        </div>
        <div className="frm-row">
          {type === 'in_person' && (
            <label>Practice<select className="sel" name="location" defaultValue={initial.location && clinics.some((c) => c.id === initial.location) ? initial.location : clinics[0]?.id}>
              {clinics.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></label>
          )}
          <label>Reason for visit<select className="sel" name="service" defaultValue={initial.serviceId ?? ''}>
            <option value="">Not specified</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        </div>
        {type === 'house_call' && <label>Home address<input className="inp" name="address" defaultValue={initial.address ?? ''} placeholder="Street, suburb, city" required /></label>}

        <div className="frm-group">
          <span className="frm-label">Length</span>
          <div className="chips-a">
            {presets.map((d) => (
              <button type="button" key={d.minutes} aria-pressed={Number(duration) === d.minutes} onClick={() => pick(d.minutes, d.price_cents)}>
                {d.minutes} min <small>R{rand(d.price_cents)}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="frm-row">
          <label>Minutes <small>any length</small><input className="inp" name="duration" type="number" min={5} max={720} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} required /></label>
          <label>Fee (R) <small>edit for a discount or no charge</small><input className="inp" name="price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
          <label>Date <small>past dates are fine</small><input className="inp" name="date" type="date" defaultValue={initial.date} required /></label>
          <label>Time <small>any time</small><input className="inp" name="time" type="time" step={60} defaultValue={initial.time} required /></label>
        </div>
        <div className="frm-row">
          <label>Status<select className="sel" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></label>
          {edit && (
            <label>Paying<select className="sel" name="paymentChoice" defaultValue={initial.paymentChoice}>
              <option value="at_visit">At the visit</option><option value="online">Online</option>
            </select></label>
          )}
        </div>
        <label className="frm-check"><input type="checkbox" name="allowOverlap" defaultChecked={initial.allowOverlap} />
          <span>Allow double-booking <small>This booking may overlap other appointments. Online patients still can’t book this time.</small></span></label>
      </section>

      <section className="card frm">
        <h2>Patient</h2>
        <div className="frm-row">
          <label>Full name<input className="inp" name="name" defaultValue={initial.name} autoComplete="off" required /></label>
          <label>Mobile <small>optional</small><input className="inp" name="phone" type="tel" defaultValue={initial.phone} autoComplete="off" /></label>
          <label>Email <small>optional</small><input className="inp" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
        </div>
        <div className="frm-row">
          <label>Date of birth <small>optional</small><input className="inp" name="dob" type="date" defaultValue={initial.dob ?? ''} /></label>
          <label>Medical aid <small>optional</small><input className="inp" name="medicalAid" defaultValue={initial.medicalAid ?? ''} placeholder="Scheme and plan" /></label>
          <label>Medical aid number <small>optional</small><input className="inp" name="medicalAidNo" defaultValue={initial.medicalAidNo ?? ''} /></label>
        </div>
        <label>Notes <small>symptoms, access notes, anything useful</small><textarea className="ta" name="reason" defaultValue={initial.reason} /></label>
      </section>

      {!edit && (
        <section className="card frm">
          <h2>Payment</h2>
          <div className="seg seg--wrap" role="radiogroup" aria-label="Payment">
            <label><input type="radio" name="pay" value="at_visit" checked={pay === 'at_visit'} onChange={() => setPay('at_visit')} /><span>Pays at the visit</span></label>
            <label><input type="radio" name="pay" value="paid" checked={pay === 'paid'} onChange={() => setPay('paid')} /><span>Already paid</span></label>
            <label><input type="radio" name="pay" value="link" checked={pay === 'link'} onChange={() => setPay('link')} disabled={!email} /><span>Email a payment link{!email && <small> (needs an email)</small>}</span></label>
          </div>
          {pay === 'paid' && (
            <div className="frm-row">
              <label>Paid by<select className="sel" name="channel"><option value="cash">Cash</option><option value="card_machine">Card machine</option><option value="eft">EFT / bank transfer</option><option value="medical_aid">Medical aid</option></select></label>
              <label>Amount (R)<input className="inp" name="amount" type="number" min={0} step="0.01" defaultValue={price} key={price} /></label>
            </div>
          )}
        </section>
      )}

      {!edit && (
        <section className="card frm">
          <h2>Repeat</h2>
          <div className="frm-row">
            <label>Repeat this booking<select className="sel" name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
              <option value="none">No, just once</option><option value="1w">Every week</option><option value="2w">Every 2 weeks</option><option value="4w">Every 4 weeks</option>
            </select></label>
            {repeat !== 'none' && <label>Number of appointments<input className="inp" name="repeatCount" type="number" min={2} max={26} defaultValue={4} /></label>}
          </div>
          {repeat !== 'none' && <small className="muted">Same day and time each time. If any date clashes, nothing is booked and you’ll see which one.{pay === 'paid' ? ' “Already paid” applies to the first appointment.' : ''}</small>}
        </section>
      )}

      <div className="bk-submit">
        <label className="frm-check"><input type="checkbox" name="notify" defaultChecked={!edit} disabled={!email || pay === 'link'} />
          <span>{edit ? 'Email the patient about these changes' : 'Email the patient a confirmation'}{!email && <small> (no email address)</small>}</span></label>
        <button className="b" disabled={pending}>{pending ? 'Saving…' : edit ? 'Save changes' : 'Create booking'}</button>
      </div>
    </form>
  );
}
