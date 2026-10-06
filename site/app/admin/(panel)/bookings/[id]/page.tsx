import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bookingById } from '@/lib/booking';
import { paymentsForBooking } from '@/lib/payments';
import { bookingAction } from '../../../actions';
import { Badge, Flash, Head, TYPE_LABEL } from '@/components/admin/ui';
import { dateKey, fmtWhen, hhmm, rands, sastMinutes, fmtShort, fmtTime } from '@/lib/time';
import { practice } from '@/lib/content';

export const metadata = { title: 'Booking' };

function Op({ act, op, label, kind = '' }: { act: (f: FormData) => Promise<void>; op: string; label: string; kind?: string }) {
  return <form action={act}><input type="hidden" name="op" value={op} /><button className={`b ${kind}`}>{label}</button></form>;
}

export default async function BookingDetail(props: PageProps<'/admin/bookings/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const b = await bookingById(id);
  if (!b) notFound();
  const pays = await paymentsForBooking(id);
  const act = bookingAction.bind(null, id);
  const live = ['confirmed', 'pending_payment'].includes(b.status);
  const start = new Date(b.start_at);
  const onlinePaid = pays.some((p) => p.status === 'success' && p.provider !== 'at_visit');
  return (
    <>
      <Head eyebrow={`Booking ${b.ref}`} title={b.patient_name}>
        <Link className="b b--ghost" href="/admin/calendar">← Calendar</Link>
        <a className="b b--ghost" href={`https://wa.me/${b.patient_phone.replace(/\D/g, '').replace(/^0/, '27')}?text=${encodeURIComponent(`Hi ${b.patient_name.split(' ')[0]}, this is ${practice.name} about your booking ${b.ref}.`)}`} target="_blank">WhatsApp patient</a>
      </Head>
      <Flash sp={sp} />
      <div className="grid grid-2">
        <div className="card">
          <h2>Appointment <span><Badge s={b.status} /> <Badge s={b.payment_status} /></span></h2>
          <dl className="dl">
            <dt>When</dt><dd><b>{fmtWhen(start)}</b></dd>
            <dt>Visit</dt><dd>{TYPE_LABEL[b.consult_type]} · {b.duration_minutes} minutes</dd>
            <dt>Where</dt><dd>{b.consult_type === 'house_call' ? b.home_address : `${b.location_name}${b.location_address ? ' · ' + b.location_address : ''}`}</dd>
            <dt>Reason</dt><dd>{b.service_name ?? '–'}{b.reason && <><br /><span className="muted">{b.reason}</span></>}</dd>
            <dt>Fee</dt><dd>{rands(b.price_cents)} · {b.payment_choice === 'online' ? 'paying online' : 'paying at visit'}</dd>
            <dt>Booked</dt><dd>{fmtShort(new Date(b.created_at))} {fmtTime(new Date(b.created_at))} · {b.source === 'admin' ? 'by the practice' : 'online'}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>Patient</h2>
          <dl className="dl">
            <dt>Name</dt><dd>{b.patient_name}</dd>
            <dt>Phone</dt><dd><a href={`tel:${b.patient_phone.replace(/\s/g, '')}`}>{b.patient_phone}</a></dd>
            <dt>Email</dt><dd><a href={`mailto:${b.patient_email}`}>{b.patient_email}</a></dd>
            <dt>Date of birth</dt><dd>{b.patient_dob ? String(b.patient_dob).slice(0, 10) : '–'}</dd>
            <dt>Medical aid</dt><dd>{b.medical_aid ? `${b.medical_aid} ${b.medical_aid_no ?? ''}` : '–'}</dd>
          </dl>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        {live && (
          <div className="card">
            <h2>Visit</h2>
            <div className="adm-actions"><Op act={act} op="complete" label="Mark completed" /><Op act={act} op="no_show" label="No-show" kind="b--ghost" /><Op act={act} op="resend" label="Re-send confirmation" kind="b--ghost" /></div>
          </div>
        )}
        {!live && b.status !== 'cancelled' && b.status !== 'expired' && (
          <div className="card"><h2>Visit</h2><div className="adm-actions"><Op act={act} op="complete" label="Mark completed" kind="b--ghost" /><Op act={act} op="no_show" label="No-show" kind="b--ghost" /></div></div>
        )}
        <div className="card">
          <h2>Payment</h2>
          {b.payment_status === 'unpaid' && b.status !== 'cancelled' && (
            <>
              <form action={act} className="frm">
                <input type="hidden" name="op" value="paid" />
                <div className="frm-row">
                  <label>Paid at the practice by<select className="sel" name="channel"><option value="card_machine">Card machine</option><option value="cash">Cash</option><option value="medical_aid">Medical aid</option></select></label>
                  <label>Amount (R)<input className="inp" name="amount" type="number" step="0.01" defaultValue={b.price_cents / 100} /></label>
                </div>
                <button className="b">Record payment</button>
              </form>
              <div className="adm-actions" style={{ marginTop: 12 }}><Op act={act} op="payment_link" label="Email a payment link" kind="b--ghost" /></div>
            </>
          )}
          {(b.payment_status === 'paid' || b.payment_status === 'refund_pending') && onlinePaid && <Op act={act} op="refund" label={b.payment_status === 'refund_pending' ? 'Issue refund now' : 'Refund online payment'} kind={b.payment_status === 'refund_pending' ? 'b--gold' : 'b--danger'} />}
          {pays.length > 0 && (
            <table className="tbl" style={{ marginTop: 14 }}><tbody>
              {pays.map((p) => <tr key={p.id}><td><small>{p.reference}</small><br /><small className="muted">{p.provider === 'mock' ? 'test checkout' : p.provider.replace('_', ' ')} · {p.channel ?? '–'}</small></td><td className="num">{rands(p.amount_cents)}<br /><Badge s={p.status} /></td></tr>)}
            </tbody></table>
          )}
        </div>
        {live && (
          <div className="card">
            <h2>Move or cancel</h2>
            <form action={act} className="frm">
              <input type="hidden" name="op" value="reschedule" />
              <div className="frm-row">
                <label>Date<input className="inp" type="date" name="date" defaultValue={dateKey(start)} required /></label>
                <label>Time<input className="inp" type="time" name="time" step={300} defaultValue={hhmm(sastMinutes(start))} required /></label>
              </div>
              <label style={{ display: 'flex', gap: 8, fontWeight: 400 }}><input type="checkbox" name="notify" defaultChecked /> Email the patient</label>
              <button className="b b--ghost">Move booking</button>
            </form>
            <form action={act} className="frm" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
              <input type="hidden" name="op" value="cancel" />
              <label>Reason <small>shown to the patient</small><input className="inp" name="reason" placeholder="e.g. Doctor unavailable" /></label>
              <label style={{ display: 'flex', gap: 8, fontWeight: 400 }}><input type="checkbox" name="notify" defaultChecked /> Email the patient</label>
              <button className="b b--danger">Cancel booking</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
