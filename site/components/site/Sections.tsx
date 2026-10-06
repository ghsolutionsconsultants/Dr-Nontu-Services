// Server-rendered building blocks shared by the home page and inner pages.
import Link from 'next/link';
import { img, photos, locations, practice, waLink } from '@/lib/content';
import { Scene3D } from '../three/Scene3D';
import { Icon, WhatsAppIcon } from './Icon';

export function Marquee() {
  const beat = <svg viewBox="0 0 56 22"><path d="M0 11h18l3-7 4 14 3-7h28" fill="none" stroke="#E8C988" strokeWidth="1.5" /></svg>;
  const row = <span>In-person consultations {beat} House calls, <i>daily</i> {beat} Virtual care, <i>any hour</i> {beat} Esther Park {beat} Fourways {beat}</span>;
  return <div className="marquee" aria-hidden><div className="marquee-track">{row}{row}</div></div>;
}

export function SecHead({ eyebrow, title, aside, as: H = 'h2' }: { eyebrow: string; title: React.ReactNode; aside?: React.ReactNode; as?: 'h1' | 'h2' }) {
  return (
    <div className="sec-head">
      <div><span className="eyebrow">{eyebrow}</span><H className="display">{title}</H></div>
      {aside && (typeof aside === 'string' ? <p className="muted">{aside}</p> : aside)}
    </div>
  );
}

export function PageHero({ eyebrow, title, lede, photo, photoAlt, shape = 'arch', scene, crumbs, children }: {
  eyebrow: string; title: React.ReactNode; lede?: React.ReactNode; photo?: string; photoAlt?: string; shape?: 'arch' | 'pill' | 'soft' | 'round';
  scene?: React.ComponentProps<typeof Scene3D>['kind']; crumbs?: { href: string; label: string }[]; children?: React.ReactNode;
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
        {photo && (
          <div className="page-hero-visual rv">
            
            <div className={`ph ${shape}`} data-tilt="6"><img src={img(photo, 900)} alt={photoAlt ?? ''} data-par=".08" /></div>
            {scene && <Scene3D kind={scene} className="page-hero-3d" />}
          </div>
        )}
      </div>
    </section>
  );
}

export function Ways() {
  const ways = [
    { tag: 'In person', icon: 'clinic', scene: 'chestpiece' as const, photo: photos.hallway, alt: 'A calm hallway with botanical prints', shape: 'arch', h: 'At the practice', hrs: 'Mon–Fri · 09:00–16:00', p: 'A private, face-to-face consultation in Esther Park or Fourways.', cta: 'Book in person', href: '/book?type=in_person' },
    { tag: 'House call', icon: 'house', scene: 'house' as const, photo: photos.door, alt: 'A green front door framed by climbing plants', shape: 'pill', h: 'At your home', hrs: 'Daily · 09:00–16:00', p: 'Professional medical care in the comfort of your home, subject to availability and service area.', cta: 'Book a house call', href: '/book?type=house_call' },
    { tag: 'Virtual', icon: 'screen', scene: 'phone' as const, photo: photos.laptop, alt: 'A laptop on a desk beside houseplants', shape: 'soft', h: 'Wherever you are', hrs: 'Any time · 24/7', p: 'Consult remotely by video, day or night. Ideal for follow-ups, scripts and quick questions.', cta: 'Book a virtual consult', href: '/book?type=virtual' },
  ];
  return (
    <div className="ways-grid">
      {ways.map((w) => (
        <article className="way rv" key={w.tag}>
          <Scene3D kind={w.scene} className="way-3d" />
          <div className={`ph ${w.shape}`} data-tilt="8">
            <span className="way-tag"><Icon name={w.icon} />{w.tag}</span>
            
            <img data-par=".12" src={img(w.photo, 900)} alt={w.alt} loading="lazy" />
          </div>
          <div className="way-meta"><h3>{w.h}</h3><span className="hrs tnum">{w.hrs}</span></div>
          <p className="muted">{w.p}</p>
          <Link className="link-u" href={w.href}>{w.cta} →</Link>
        </article>
      ))}
    </div>
  );
}

export function PlansBlock({ heading = 'h2' }: { heading?: 'h1' | 'h2' }) {
  const H = heading;
  return (
    <div className="plans-grid">
      <div>
        <span className="eyebrow">Care plans</span>
        <H className="display">Healthcare, <em>made simpler.</em></H>
        <p className="lede">One monthly plan covers your check&#8209;ins, follow&#8209;ups and quick questions, so you never hesitate to reach out.</p>
        <div className="plan-cards">
          <div className="plan rv" data-tilt="10"><h3><i className="dot-silver" />Silver</h3><p className="muted">Essential cover for everyday care and online questions.</p><span className="soon">Benefits &amp; price soon</span></div>
          <div className="plan rv" data-tilt="10" style={{ transitionDelay: '.12s' }}><h3><i className="dot-gold" />Gold</h3><p className="muted">Fuller cover, including house calls and chronic care.</p><span className="soon">Benefits &amp; price soon</span></div>
        </div>
      </div>
      <Scene3D kind="capsules" className="plans-3d" />
    </div>
  );
}

export function LocationsBlock() {
  const [a, b] = locations;
  return (
    <div className="locs-grid">
      <div className="loc rv">
        <span className="eyebrow">{a.region}</span><h3>{a.name}</h3>
        <address>{a.address.map((l) => <span key={l}>{l}<br /></span>)}</address>
        <a className="link-u" href={a.map} target="_blank" rel="noopener">Get directions →</a>
      </div>
      <Scene3D kind="map" className="map-3d" />
      <div className="loc rv" style={{ transitionDelay: '.15s' }}>
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
        <Link className="btn btn--light magnetic" href="/book">Book an appointment <Icon name="arrow" /></Link>
        <a className="btn btn--on-dark magnetic" href={waLink()}><WhatsAppIcon /> WhatsApp us</a>
      </div>
    </div>
  );
}

export { practice };
