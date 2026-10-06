'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateTimePicker } from './DateTimePicker';
import { Icon, WhatsAppIcon } from '../site/Icon';

interface B { ref: string; name: string; status: string; payment_status: string; payment_choice: string; start: string; duration: number; price: number; type: string; type_name: string; location: string; where: string }

const fmt = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false });
const rands = (c: number) => 'R' + Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const STATUS: Record<string, string> = { pending_payment: 'Awaiting payment', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Missed', expired: 'Expired: payment not received' };
const WA = process.env.NEXT_PUBLIC_WHATSAPP ?? '27820503345';

export function ManageBooking({ token, booking: b, paymentFailed, cutoffHours, locked }: { token: string; booking: B; paymentFailed?: boolean; cutoffHours: number; locked: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'move' | 'cancel'>('view');
  const [start, setStart] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(paymentFailed ? { kind: 'err', text: 'Your payment didn’t go through. Your booking is held for a few minutes: try again below.' } : null);
  const live = ['pending_payment', 'confirmed'].includes(b.status);
  const canPay = b.payment_status !== 'paid' && ['pending_payment', 'confirmed', 'expired'].includes(b.status);

  const pay = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/pay/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const j = await r.json();
    if (r.ok) window.location.assign(j.url); else { setMsg({ kind: 'err', text: j.error }); setBusy(false); }
  };

  const act = async (body: object, ok: string) => {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/manage/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg({ kind: 'err', text: j.error }); return; }
    setMsg({ kind: 'ok', text: ok }); setMode('view'); setStart(null); router.refresh();
  };

  return (
    <div className="g12">
      <div className="c1-8">
        <span className="eyebrow">Booking {b.ref} · {STATUS[b.status] ?? b.status}</span>
        <h1 className="display" style={{ fontSize: 'var(--step-4)', margin: '18px 0 0' }}>
          {b.status === 'cancelled' ? <>This booking is <em>cancelled.</em></> : <>Hello, <em>{b.name.split(' ')[0]}.</em></>}
        </h1>
        <p className="lede" style={{ marginTop: 18 }}>{fmt.format(new Date(b.start))} · {b.duration} min · {b.type_name}</p>
        {msg && <p className={`notice${msg.kind === 'err' ? ' notice--error' : ''}`} role="status" style={{ marginTop: 24 }}>{msg.text}</p>}

        {mode === 'view' && (
          <div className="ctas">
            {canPay && <button className="btn magnetic" disabled={busy} onClick={pay}>Pay {rands(b.price)} now <Icon name="arrow" /></button>}
            {live && !locked && <button className="btn btn--ghost" onClick={() => setMode('move')}>Change date or time</button>}
            {live && !locked && <button className="btn btn--ghost" onClick={() => setMode('cancel')}>Cancel booking</button>}
            <a className="btn btn--ghost" href={`https://wa.me/${WA}?text=${encodeURIComponent('Hi, about my booking ' + b.ref)}`}><WhatsAppIcon /> WhatsApp us</a>
          </div>
        )}
        {live && locked && mode === 'view' && <p className="muted" style={{ marginTop: 18 }}>Your visit is less than {cutoffHours} hours away, so changes are made with us directly. Please WhatsApp or call.</p>}

        {mode === 'move' && (
          <div className="book-card" style={{ padding: 'clamp(20px,3vw,36px)', marginTop: 28 }}>
            <h3 className="h3" style={{ marginBottom: 18 }}>Choose a new time</h3>
            <DateTimePicker query={{ type: b.type, location: b.location, duration: b.duration, token }} value={start} onChange={setStart} />
            <div className="book-nav">
              <button className="link-u" onClick={() => setMode('view')}>← Keep my current time</button>
              <button className="btn" disabled={!start || busy} onClick={() => act({ action: 'reschedule', start }, 'Done. Your booking has moved and we’ve emailed the new details.')}>Move booking <Icon name="arrow" /></button>
            </div>
          </div>
        )}
        {mode === 'cancel' && (
          <div className="book-card" style={{ padding: 'clamp(20px,3vw,36px)', marginTop: 28 }}>
            <h3 className="h3">Cancel this booking?</h3>
            <p className="muted">{b.payment_status === 'paid' ? 'Your payment will be refunded to the original payment method.' : 'Your time will be released for someone else.'}</p>
            <div className="book-nav">
              <button className="link-u" onClick={() => setMode('view')}>← Keep my booking</button>
              <button className="btn" disabled={busy} onClick={() => act({ action: 'cancel' }, 'Your booking is cancelled. We’ve emailed you a confirmation.')}>Yes, cancel</button>
            </div>
          </div>
        )}
      </div>
      <aside className="c9-12">
        <div className="summary" style={{ borderRadius: 6 }}>
          <h4>Your visit</h4>
          <div className="sum-row"><span>Type</span><span>{b.type_name}</span></div>
          <div className="sum-row"><span>Where</span><span>{b.where}</span></div>
          <div className="sum-row"><span>Length</span><span>{b.duration} minutes</span></div>
          <div className="sum-total"><span>{b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'refund_pending' ? 'Refund pending' : b.payment_status === 'refunded' ? 'Refunded' : 'To pay'}</span><b>{rands(b.price)}</b></div>
        </div>
      </aside>
    </div>
  );
}
