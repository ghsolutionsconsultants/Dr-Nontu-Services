'use client';
import Link from 'next/link';
import { useState } from 'react';
import { messageTopics, type MessageTopic } from '@/lib/content';
import { Icon } from './Icon';
import { track } from './Tracker';

// the form is taller than the thank-you note, so bring the note into view (and focus) once it replaces the form
const showSent = (el: HTMLDivElement | null) => { el?.focus({ preventScroll: true }); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

export function ContactForm({ topic: initial = 'general' }: { topic?: MessageTopic }) {
  const [f, setF] = useState({ topic: initial, name: '', phone: '', email: '', message: '', consent: false, website: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!f.consent) { setErr('Please agree to the privacy notice so that we can reply.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error ?? 'Something went wrong. Please try again, or call us.'); return; }
      track('cta_click', { label: `message_${f.topic}` });
      setSent(f.name.split(' ')[0]);
    } catch { setErr('We could not send that. Please check your connection and try again.'); }
    finally { setBusy(false); }
  };

  if (sent) return (
    <div className="msg-sent" role="status" tabIndex={-1} ref={showSent}>
      <h3 className="display">Thank you, <em>{sent}.</em></h3>
      <p>Your message is with the practice. We&rsquo;ll get back to you by phone or email, and we&rsquo;ve emailed you a receipt.</p>
    </div>
  );

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <fieldset className="full msg-topic">
        <legend className="label">What is it about?</legend>
        <div className="chips">
          {messageTopics.map((t) => <button type="button" key={t.id} className="chip" aria-pressed={f.topic === t.id} onClick={() => setF((x) => ({ ...x, topic: t.id }))}>{t.label}</button>)}
        </div>
        {f.topic === 'member' && <p className="muted msg-hint">Please use the email address your membership is under, so that we know it&rsquo;s you.</p>}
      </fieldset>
      <div className="field full"><label htmlFor="c-name">Full name</label><input id="c-name" value={f.name} onChange={set('name')} autoComplete="name" required /></div>
      <div className="field"><label htmlFor="c-phone">Mobile number</label><input id="c-phone" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" required /></div>
      <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></div>
      <div className="field full"><label htmlFor="c-msg">Your message</label><textarea id="c-msg" rows={5} value={f.message} onChange={set('message')} maxLength={4000} required /></div>
      <div className="hp" aria-hidden><label htmlFor="c-web">Website</label><input id="c-web" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></div>
      <label className="check full"><input type="checkbox" checked={f.consent} onChange={set('consent')} />
        <span>I agree that the practice may use these details, including any health information I share, to reply to me (<Link href="/privacy" target="_blank">privacy notice</Link>).</span></label>
      {err && <p className="notice notice--error full" role="alert">{err}</p>}
      <div className="full"><button className="btn" disabled={busy}>{busy ? 'Sending…' : <>Send message <Icon name="arrow" /></>}</button></div>
    </form>
  );
}
