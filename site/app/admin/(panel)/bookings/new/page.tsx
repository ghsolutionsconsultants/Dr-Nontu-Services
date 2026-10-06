import { getCatalog } from '@/lib/booking';
import { createManualBooking } from '../../../actions';
import { Flash, Head } from '@/components/admin/ui';
import { rands, todayKey } from '@/lib/time';

export const metadata = { title: 'New booking' };

export default async function NewBooking(props: PageProps<'/admin/bookings/new'>) {
  const sp = await props.searchParams;
  const { types, locations, services } = await getCatalog();
  const today = todayKey();
  return (
    <>
      <Head eyebrow="Bookings" title="New booking" />
      <Flash sp={sp} />
      <p className="muted" style={{ marginTop: -10 }}>For phone, WhatsApp and walk-in patients. Practice bookings skip the online lead time but can never overlap another appointment.</p>
      <form action={createManualBooking} className="card frm" style={{ maxWidth: 820 }}>
        <div className="frm-row">
          <label>Type<select className="sel" name="type" required>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label>Location<select className="sel" name="location" required>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <label>Length<select className="sel" name="duration" required>{[...new Set(types.flatMap((t) => t.durations.map((d) => d.minutes)))].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
        </div>
        <small className="muted">Fees: {types.map((t) => `${t.name} ${t.durations.map((d) => `${d.minutes}′ ${rands(d.price_cents)}`).join(', ')}`).join(' · ')}</small>
        <div className="frm-row">
          <label>Date<input className="inp" type="date" name="date" required defaultValue={typeof sp.date === 'string' ? sp.date : today} /></label>
          <label>Time<input className="inp" type="time" name="time" step={300} required defaultValue={typeof sp.time === 'string' ? sp.time : '09:00'} /></label>
          <label>Reason<select className="sel" name="service"><option value="">Not specified</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        </div>
        <div className="frm-row">
          <label>Patient name<input className="inp" name="name" required /></label>
          <label>Mobile<input className="inp" name="phone" type="tel" required /></label>
          <label>Email<input className="inp" name="email" type="email" required /></label>
        </div>
        <label>Home address <small>house calls only</small><input className="inp" name="address" /></label>
        <label>Notes<textarea className="ta" name="reason" /></label>
        <label style={{ display: 'flex', gap: 8, fontWeight: 400 }}><input type="checkbox" name="notify" defaultChecked /> Email the patient a confirmation</label>
        <div><button className="b">Create booking</button></div>
      </form>
    </>
  );
}
