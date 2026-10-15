'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '../site/Icon';
import { track } from '../site/Tracker';

export function SubscribeForm({ plan, price }: { plan: string; price: string }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', consent: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!f.consent) { setErr('Please accept the membership terms to continue.'); return; }
    setBusy(true);
    const r = await fetch('/api/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, ...f }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error ?? 'Something went wrong.'); setBusy(false); return; }
    track('cta_click', { label: `subscribe_${plan}_checkout` });
    window.location.assign(j.next);
  };
  return (
    <form className="form-grid" onSubmit={submit} style={{ marginTop: 28 }} noValidate>
      <div className="field full"><label htmlFor="m-name">Full name</label><input id="m-name" value={f.name} onChange={set('name')} autoComplete="name" required /></div>
      <div className="field"><label htmlFor="m-phone">Mobile number</label><input id="m-phone" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" required /></div>
      <div className="field"><label htmlFor="m-email">Email</label><input id="m-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></div>
      <label className="check full"><input type="checkbox" checked={f.consent} onChange={set('consent')} />
        <span>I agree to be charged {price} every month until I cancel, and to the <Link href="/terms" target="_blank">membership terms</Link> and <Link href="/privacy" target="_blank">privacy notice</Link>.</span></label>
      {err && <p className="notice notice--error full" role="alert">{err}</p>}
      <div className="full"><button className="btn" disabled={busy}>{busy ? 'One moment…' : <>Continue to secure payment <Icon name="arrow" /></>}</button></div>
      <p className="muted full" style={{ fontSize: '.84rem', margin: 0 }}>Payments are processed by Paystack. Monthly memberships are paid by card.</p>
    </form>
  );
}
