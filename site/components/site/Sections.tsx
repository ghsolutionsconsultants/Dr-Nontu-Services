// Server-rendered building blocks shared by the home page and inner pages.
import Link from 'next/link';
import { img, photos, locations, practice, memberships, membershipNote } from '@/lib/content';
import { Scene3D } from '../three/Scene3D';
import { Icon } from './Icon';
import { MessageButton } from './MessageButton';
import { rands } from '@/lib/time';

export function SecHead({ eyebrow, title, aside, as: H = 'h2' }: { eyebrow: string; title: React.ReactNode; aside?: React.ReactNode; as?: 'h1' | 'h2' }) {
  return (
    <div className="sec-head">
      <div><span className="eyebrow">{eyebrow}</span><H className="display">{title}</H></div>
      {aside && (typeof aside === 'string' ? <p className="muted">{aside}</p> : aside)}
    </div>
  );
}

export function PageHero({ eyebrow, title, lede, photo, photoAlt, shape = 'arch', crumbs, children }: {
  eyebrow: string; title: React.ReactNode; lede?: React.ReactNode; photo?: string; photoAlt?: string; shape?: 'arch' | 'pill' | 'soft' | 'round';
  crumbs?: { href: string; label: string }[]; children?: React.ReactNode;
}) {
  return (
    <section className="page-hero page-fade">
      <div className="wrap page-hero-grid">
        <div>
          {crumbs && <nav className="crumbs" aria-label="Breadcrumb">{crumbs.map((c) => <span key={c.href}><Link href={c.href}>{c.label}</Link> /</span>)}</nav>}
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="display">{title}</h1>
          {lede && <p className="lede">{lede}</p>}
          {children}
        </div>
        {photo && <div className="page-hero-visual rv"><div className={`ph ${shape}`}><img src={img(photo, 900)} alt={photoAlt ?? ''} /></div></div>}
      </div>
    </section>
  );
}

/** How to consult: the three ways, each with its own hours. Shown once, on the home page. */
export const WAYS = [
  { id: 'in_person', icon: 'clinic', tag: 'In person', photo: photos.hallway, alt: 'A calm hallway with botanical prints', h: 'At the practice',
    hours: [['Monday – Friday', '09:00 – 16:00']], p: 'A private, face-to-face consultation in Esther Park or Fourways.', cta: 'Book in person' },
  { id: 'house_call', icon: 'house', tag: 'House call', photo: photos.door, alt: 'A green front door framed by climbing plants', h: 'At your home',
    hours: [['Every day', '09:00 – 16:00']], p: 'Medical care in the comfort of your home, subject to availability and service area.', cta: 'Book a house call' },
  { id: 'virtual', icon: 'screen', tag: 'Virtual', photo: photos.laptop, alt: 'A laptop on a desk beside houseplants', h: 'Wherever you are',
    hours: [['Every day', 'Available 24/7']], p: 'Consult by video, day or night. Ideal for follow-ups, scripts and quick questions.', cta: 'Book a virtual consult' },
] as const;

export function Ways() {
  return (
    <div className="ways-grid">
      {WAYS.map((w) => (
        <article className="way rv" key={w.id}>
          <div className="ph soft"><img src={img(w.photo, 900)} alt={w.alt} loading="lazy" /></div>
          <div className="way-body">
            <span className="way-tag"><Icon name={w.icon} />{w.tag}</span>
            <h3>{w.h}</h3>
            <p className="muted">{w.p}</p>
            <dl className="way-hours">{w.hours.map(([d, t]) => <div key={d}><dt>{d}</dt><dd className="tnum">{t}</dd></div>)}</dl>
            <Link className="link-u" href={`/book?type=${w.id}`}>{w.cta} →</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Membership: Silver and Gold with subscribe buttons; the capsules are a small still picture. */
export function PlansBlock({ heading = 'h2' }: { heading?: 'h1' | 'h2' }) {
  const H = heading;
  return (
    <div className="plans-wrap">
      <div className="plans-head">
        <div>
          <span className="eyebrow">Membership</span>
          <H className="display">Not sure if you need a consultation? <em>Ask first.</em></H>
          <p className="lede">That&rsquo;s exactly what your brief medical queries are for. Simple access. Practical support. Ongoing care.</p>
        </div>
        <Scene3D kind="capsules" className="plans-3d" still />
      </div>
      <div className="plan-cards">
        {memberships.map((m) => (
          <article key={m.id} className={`plan plan--${m.id} rv`}>
            <header>
              <h3><i className={`dot-${m.id}`} />{m.name}</h3>
              <span className="plan-label">{m.label}</span>
            </header>
            <p className="plan-price"><b className="tnum">{rands(m.priceCents)}</b> / month</p>
            <ul>{m.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
            <Link className={`btn${m.id === 'gold' ? '' : ' btn--ghost'}`} href={`/care-plans/subscribe?plan=${m.id}`} data-track={`subscribe_${m.id}`}>Subscribe to {m.name} <Icon name="arrow" /></Link>
          </article>
        ))}
      </div>
      <p className="plan-note muted">{membershipNote}</p>
    </div>
  );
}

/** Two locations with a quiet, static map between them. */
export function LocationsBlock() {
  const [a, b] = locations;
  return (
    <div className="locs-grid">
      <div className="loc rv">
        <span className="eyebrow">{a.region}</span><h3>{a.name}</h3>
        <address>{a.address.map((l) => <span key={l}>{l}<br /></span>)}</address>
        <a className="link-u" href={a.map} target="_blank" rel="noopener">Get directions →</a>
      </div>
      <svg className="map-static" viewBox="0 0 400 300" role="img" aria-label="Esther Park in Kempton Park and Fourways, north of Johannesburg">
        <path className="road" d="M0 70 C120 80 260 50 400 60M0 190 C140 170 240 220 400 200M60 0 C80 110 50 220 90 300M300 0 C280 100 330 210 300 300M170 0 C190 130 160 210 200 300" />
        <path className="route" d="M92 214 C150 170 190 150 230 132 S300 96 318 84" />
        <circle className="pin" cx="318" cy="84" r="7" /><circle className="pin" cx="92" cy="214" r="7" />
        <text x="306" y="60" textAnchor="end">Esther Park</text><text x="106" y="246">Fourways</text>
      </svg>
      <div className="loc rv">
        <span className="eyebrow">{b.region}</span><h3>{b.name}</h3>
        <address>{b.address.map((l) => <span key={l}>{l}<br /></span>)}</address>
        <a className="link-u" href={b.map} target="_blank" rel="noopener">Get directions →</a>
      </div>
    </div>
  );
}

export function CtaBand({ title = <>Ready when <em>you are.</em></> }: { title?: React.ReactNode }) {
  return (
    <div className="cta-band rv">
      <h2 className="display">{title}</h2>
      <div className="ctas" style={{ marginTop: 0 }}>
        <Link className="btn btn--light" href="/book">Book an appointment <Icon name="arrow" /></Link>
        <MessageButton className="btn btn--on-dark" />
      </div>
    </div>
  );
}

export { practice };
