'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DateTimePicker } from './DateTimePicker';
import { Icon } from '../site/Icon';
import { track } from '../site/Tracker';
import { scrollToTop } from '../site/Effects';

export interface Catalog {
  types: { id: 'in_person' | 'house_call' | 'virtual'; name: string; description: string; requires_prepay: boolean; buffer_minutes: number; durations: { id: number; minutes: number; price_cents: number }[] }[];
  locations: { id: string; name: string; kind: string; address: string | null }[];
  services: { id: number; slug: string; name: string; summary: string; modes: string[] }[];
}
type TypeId = Catalog['types'][number]['id'];

const ICON: Record<TypeId, string> = { in_person: 'clinic', house_call: 'house', virtual: 'screen' };
const SUB: Record<TypeId, string> = { in_person: 'Esther Park or Fourways · Mon–Fri 09:00–16:00', house_call: 'At your home · daily 09:00–16:00', virtual: 'By video, from anywhere · 24/7' };
const KIND: Record<TypeId, string> = { in_person: 'clinic', house_call: 'home', virtual: 'virtual' };
const MODE: Record<TypeId, string> = { in_person: 'clinic', house_call: 'house', virtual: 'screen' };
const STEPS = ['Consultation', 'Where & why', 'Length', 'Date & time', 'Your details', 'Confirm'];

const rands = (c: number) => 'R' + Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (c % 100 ? '.' + String(c % 100).padStart(2, '0') : '');
const fmtWhen = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

interface Details { name: string; email: string; phone: string; dob: string; medicalAid: string; medicalAidNo: string; address: string; reason: string; consent: boolean }
const EMPTY: Details = { name: '', email: '', phone: '', dob: '', medicalAid: '', medicalAidNo: '', address: '', reason: '', consent: false };

export function BookingWizard({ catalog, initial }: { catalog: Catalog; initial: { type?: string; service?: string; duration?: number } }) {
  const types = catalog.types;
  const initType = types.find((t) => t.id === initial.type)?.id ?? null;
  const [step, setStep] = useState(initType ? 1 : 0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [type, setType] = useState<TypeId | null>(initType);
  const [location, setLocation] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(catalog.services.find((s) => s.slug === initial.service)?.id ?? null);
  const [duration, setDuration] = useState<number | null>(initial.duration ?? null);
  const [start, setStart] = useState<string | null>(null);
  const [d, setD] = useState<Details>(EMPTY);
  const [payment, setPayment] = useState<'online' | 'at_visit'>('online');
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const started = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const t = types.find((x) => x.id === type);
  const locs = catalog.locations.filter((l) => type && l.kind === KIND[type]);
  const dur = t?.durations.find((x) => x.minutes === duration);
  const svc = catalog.services.find((s) => s.id === serviceId);
  const loc = catalog.locations.find((l) => l.id === location);
  const servicesForType = useMemo(() => catalog.services.filter((s) => !type || s.modes.includes(MODE[type])), [catalog.services, type]);

  // choosing a type settles what depends on it: the implied location, a valid length, prepayment
  const chooseType = (id: TypeId) => {
    const nt = types.find((x) => x.id === id)!, nl = catalog.locations.filter((l) => l.kind === KIND[id]);
    setType(id);
    setLocation(nl.length === 1 ? nl[0].id : nl.some((l) => l.id === location) ? location : null);
    if (duration && !nt.durations.some((x) => x.minutes === duration)) setDuration(null);
    if (nt.requires_prepay) setPayment('online');
    setStart(null);
  };
  // arriving from a link (/book?type=…) counts as choosing it
  const [primed, setPrimed] = useState(false);
  if (!primed && initType) { setPrimed(true); chooseType(initType); }

  useEffect(() => {
    if (!started.current && step > 0) { started.current = true; track('booking_started', { label: type ?? undefined }); }
  }, [step, type]);

  // keep a draft of the details so a refresh doesn't lose the patient's typing
  useEffect(() => { try { const { consent: _c, ...rest } = d; void _c; if (rest.name || rest.email) sessionStorage.setItem('dn-book-details', JSON.stringify(rest)); } catch {} }, [d]);
  const restoreDraft = () => { if (d.name || d.email) return; try { const s = sessionStorage.getItem('dn-book-details'); if (s) setD({ ...EMPTY, ...JSON.parse(s), consent: false }); } catch {} };

  const canNext = [
    !!type,
    !!location && (type !== 'house_call' || d.address.trim().length > 5),
    !!duration,
    !!start,
    true,
    true,
  ];
  const go = (n: number) => {
    if (n === 4) restoreDraft();
    setDir(n > step ? 'fwd' : 'back'); setStep(n); setServerError(null);
    const top = bodyRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 60 || top > innerHeight * .5) scrollTo({ top: scrollY + top - 100, behavior: 'smooth' });
  };

  const validate = () => {
    const e: typeof errors = {};
    if (d.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) e.email = 'Please enter a valid email address';
    if (!/^[+0-9 ()-]{9,20}$/.test(d.phone.trim())) e.phone = 'Please enter a valid phone number';
    if (!d.consent) e.consent = 'Please accept the privacy notice to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) { go(4); return; }
    setSubmitting(true); setServerError(null);
    try {
      const r = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, location, serviceId, duration, start, payment, ...d, consent: d.consent === true }),
      });
      const j = await r.json();
      if (!r.ok) {
        setServerError(j.error ?? 'Something went wrong.');
        if (j.code === 'slot_taken') { setStart(null); go(3); }
        setSubmitting(false); return;
      }
      track('booking_completed', { label: type ?? undefined, service: svc?.slug });
      try { sessionStorage.removeItem('dn-book-details'); } catch {}
      location_assign(j.next);
    } catch {
      setServerError('We could not reach the server. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setD((x) => ({ ...x, [k]: v })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const primary = step < 5
    ? <button className="btn btn--light" disabled={!canNext[step]} onClick={() => (step === 4 ? validate() && go(5) : go(step + 1))}>Continue <Icon name="arrow" /></button>
    : <button className="btn btn--light" disabled={submitting} onClick={submit}>
        {submitting ? 'One moment…' : payment === 'online' ? <>Pay {dur ? rands(dur.price_cents) : ''} &amp; book <Icon name="arrow" /></> : <>Confirm booking <Icon name="arrow" /></>}
      </button>;

  return (
    <div className="book-card rv" ref={bodyRef}>
      <ol className="stepper">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'cur' : ''} aria-current={i === step ? 'step' : undefined}>
            {i < step ? <button onClick={() => go(i)}><b>{i + 1}</b> {s}</button> : <><b>{i + 1}</b> {s}</>}
          </li>
        ))}
      </ol>
      <div className="book-body">
        <div className="book-main">
          <div key={step} className={`step-enter${dir === 'back' ? ' back' : ''}`}>
            {step === 0 && <>
              <h3>How would you like to consult?</h3>
              <p className="muted">Every option books the same way. You can pay online or, for in-person and house calls, at your visit.</p>
              <div className="choice-grid">
                {types.map((x) => (
                  <button key={x.id} className="choice" aria-pressed={type === x.id} onClick={() => { chooseType(x.id); setDir('fwd'); setStep(1); }}>
                    <Icon name={ICON[x.id]} /><b>{x.name}</b><small>{SUB[x.id]}</small>
                    {x.durations[0] && <span className="from">From {rands(x.durations[0].price_cents)}</span>}
                  </button>
                ))}
              </div>
            </>}

            {step === 1 && t && <>
              <h3>{type === 'in_person' ? 'Which practice?' : type === 'house_call' ? 'Where should we come?' : 'What can we help with?'}</h3>
              <p className="muted">{type === 'virtual' ? 'Choose a service if you know it. It helps Dr Nontu prepare.' : type === 'house_call' ? 'House calls are subject to availability and service area. We confirm your address.' : 'Choose the room that suits you.'}</p>
              {type === 'in_person' && (
                <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
                  {locs.map((l) => (
                    <button key={l.id} className="choice" aria-pressed={location === l.id} onClick={() => setLocation(l.id)}>
                      <Icon name="pin" /><b>{l.name}</b><small>{l.address}</small>
                    </button>
                  ))}
                </div>
              )}
              {type === 'house_call' && (
                <div className="field">
                  <label htmlFor="addr">Home address <small>street, suburb, city</small></label>
                  <textarea id="addr" rows={2} value={d.address} onChange={set('address')} placeholder="e.g. 12 Example Street, Esther Park, Kempton Park" autoComplete="street-address" />
                </div>
              )}
              <div className="field-group">
                <h4>Reason for visit <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></h4>
                <div className="chips">
                  {servicesForType.map((s) => <button key={s.id} className="chip" aria-pressed={serviceId === s.id} onClick={() => setServiceId(serviceId === s.id ? null : s.id)}>{s.name}</button>)}
                </div>
              </div>
            </>}

            {step === 2 && t && <>
              <h3>How long do you need?</h3>
              <p className="muted">Choose the length that fits. A quick script or follow-up suits a shorter visit; a new or complex concern, a longer one.</p>
              <div className="dur-grid">
                {t.durations.map((x) => (
                  <button key={x.id} className="dur" aria-pressed={duration === x.minutes} onClick={() => { setDuration(x.minutes); }}>
                    <b>{x.minutes} min</b><span>{rands(x.price_cents)}</span>
                  </button>
                ))}
              </div>
              {t.buffer_minutes >= 15 && <p className="muted" style={{ fontSize: '.88rem', marginTop: 16 }}>Travel time is added between house calls automatically. It doesn&rsquo;t change your fee.</p>}
            </>}

            {step === 3 && type && location && duration && <>
              <h3>Pick a date and time</h3>
              <p className="muted">Times shown are South African time and fit a {duration}-minute {t?.name.toLowerCase()} consultation.</p>
              <DateTimePicker query={{ type, location, duration }} value={start} onChange={setStart} />
              {serverError && <p className="notice notice--error" style={{ marginTop: 18 }}>{serverError}</p>}
            </>}

            {step === 4 && <>
              <h3>Your details</h3>
              <p className="muted">So we can confirm your booking and prepare for your visit.</p>
              <div className="form-grid">
                <F id="name" label="Full name" value={d.name} onChange={set('name')} err={errors.name} autoComplete="name" />
                <F id="phone" label="Mobile number" value={d.phone} onChange={set('phone')} err={errors.phone} type="tel" autoComplete="tel" placeholder="082 000 0000" />
                <F id="email" label="Email" value={d.email} onChange={set('email')} err={errors.email} type="email" autoComplete="email" />
                <F id="dob" label="Date of birth" hint="optional" value={d.dob} onChange={set('dob')} type="date" autoComplete="bday" />
                <F id="aid" label="Medical aid" hint="optional" value={d.medicalAid} onChange={set('medicalAid')} placeholder="Scheme and plan" />
                <F id="aidno" label="Medical aid number" hint="optional" value={d.medicalAidNo} onChange={set('medicalAidNo')} />
                <div className="field full">
                  <label htmlFor="reason">Anything we should know? <small>optional</small></label>
                  <textarea id="reason" value={d.reason} onChange={set('reason')} placeholder="Symptoms, questions, or access notes for a house call" />
                </div>
                <div className="full">
                  <label className="check"><input type="checkbox" checked={d.consent} onChange={set('consent')} />
                    <span>I agree that Dr Nontu Medical Practice may use these details to manage my appointment, as described in the <Link href="/privacy" target="_blank">privacy notice</Link> and <Link href="/popia" target="_blank">POPIA notice</Link>.</span></label>
                  {errors.consent && <p className="field err" style={{ margin: '6px 0 0' }}>{errors.consent}</p>}
                </div>
              </div>
            </>}

            {step === 5 && <>
              <h3>Confirm and pay</h3>
              <p className="muted">Please check your booking. You can change any step by tapping it above.</p>
              <dl className="hours-list" style={{ margin: 0 }}>
                <div><dt>Name</dt><dd style={{ margin: 0 }}>{d.name}</dd></div>
                <div><dt>Contact</dt><dd style={{ margin: 0 }}>{d.phone} · {d.email}</dd></div>
                {svc && <div><dt>Reason</dt><dd style={{ margin: 0 }}>{svc.name}</dd></div>}
                {d.medicalAid && <div><dt>Medical aid</dt><dd style={{ margin: 0 }}>{d.medicalAid} {d.medicalAidNo}</dd></div>}
              </dl>
              {serverError && <p className="notice notice--error" style={{ marginTop: 18 }}>{serverError}</p>}
              <p className="muted" style={{ fontSize: '.86rem', marginTop: 18 }}>
                {payment === 'online' ? 'You’ll be taken to Paystack’s secure checkout. Your time is held for 15 minutes while you pay.' : 'Your booking is confirmed straight away. Pay with cash, card or medical aid at your visit.'}
              </p>
            </>}
          </div>
          <div className="book-nav">
            {step > 0 ? <button className="link-u" onClick={() => go(step - 1)}>← Back</button> : <span />}
            <span className="muted" style={{ fontSize: '.84rem' }}>Step {step + 1} of {STEPS.length}</span>
          </div>
        </div>

        <aside className="summary" aria-live="polite">
          <h4>Your visit</h4>
          <div className="sum-row"><span>Type</span><span>{t?.name ?? '—'}</span></div>
          <div className="sum-row"><span>Where</span><span>{type === 'house_call' ? (d.address ? d.address.split(',')[0] : 'Your home') : loc?.name ?? (type === 'virtual' ? 'Video call' : '—')}</span></div>
          <div className="sum-row"><span>Length</span><span className="tnum">{duration ? `${duration} minutes` : '—'}</span></div>
          <div className="sum-row"><span>When</span><span className="tnum">{start ? fmtWhen.format(new Date(start)) : '—'}</span></div>
          <div className="sum-total"><span>Fee</span><b>{dur ? rands(dur.price_cents) : '—'}</b></div>
          {step >= 4 && t && (
            <div className="pay" role="radiogroup" aria-label="Payment">
              <label><input type="radio" name="pay" checked={payment === 'online'} onChange={() => setPayment('online')} /><span>Pay now, securely<small>Card, Instant EFT or Apple Pay via Paystack</small></span></label>
              {!t.requires_prepay && <label><input type="radio" name="pay" checked={payment === 'at_visit'} onChange={() => setPayment('at_visit')} /><span>Pay at my visit<small>Cash, card or medical aid on the day</small></span></label>}
              {t.requires_prepay && <small style={{ color: 'color-mix(in srgb,var(--linen) 58%,var(--ink))', fontSize: '.8rem' }}>Virtual consultations are paid when you book.</small>}
            </div>
          )}
          <div style={{ marginTop: step >= 4 ? 0 : 24 }}>{primary}</div>
        </aside>
      </div>
    </div>
  );
}

function F({ id, label, hint, err, ...p }: { id: string; label: string; hint?: string; err?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} {hint && <small>{hint}</small>}</label>
      <input id={id} aria-invalid={!!err} aria-describedby={err ? id + '-err' : undefined} {...p} />
      {err && <span className="err" id={id + '-err'}>{err}</span>}
    </div>
  );
}

function location_assign(url: string) {
  scrollToTop();
  window.location.assign(url);
}
