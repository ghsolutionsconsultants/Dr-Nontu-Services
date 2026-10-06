import Link from 'next/link';
import { practice, tel, waLink, locations } from '@/lib/content';
import { Scene3D } from '../three/Scene3D';
import { Icon, WhatsAppIcon } from './Icon';

export function Footer() {
  return (
    <footer className="ftr">
      <Scene3D kind="field" className="ftr-3d" />
      <div className="wrap">
        <div className="ftr-cta">
          <h2 className="display">Come as a patient. <em>Leave feeling cared&nbsp;for.</em></h2>
          <div className="ctas">
            <Link className="btn btn--light magnetic" href="/book" data-track="footer_book">Book an appointment <Icon name="arrow" /></Link>
            <a className="btn btn--on-dark magnetic" href={waLink()}><WhatsAppIcon /> WhatsApp us</a>
          </div>
        </div>
        <div className="ecg ecg--dark ftr-ecg" aria-hidden>
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none"><path d="M0 60 H980 Q992 52 1004 60 H1012 L1018 66 L1028 14 L1038 76 L1044 60 H1056 Q1072 44 1088 60 H1440" /></svg>
        </div>
        <div className="ftr-cols">
          <div><h5>Visit</h5>{locations.map((l) => <Link key={l.id} href="/contact">{l.name}</Link>)}<Link href="/house-calls">House calls</Link><Link href="/services/virtual-consultations">Virtual consultations</Link></div>
          <div><h5>Practice</h5><Link href="/about">About Dr Nontu</Link><Link href="/services">Services</Link><Link href="/care-plans">Care plans</Link><Link href="/fees">Fees &amp; medical aid</Link><Link href="/faq">FAQ</Link></div>
          <div><h5>Talk to us</h5>{practice.phones.map((p) => <a key={p} className="tnum" href={tel(p)}>{p}</a>)}<a href={`mailto:${practice.email}`}>{practice.email}</a></div>
          <div><h5>Follow</h5>
            {practice.social.instagram && <a href={practice.social.instagram}>Instagram</a>}
            {practice.social.facebook && <a href={practice.social.facebook}>Facebook</a>}
            <a href={waLink()}>WhatsApp</a>
          </div>
        </div>
      </div>
      <p className="ftr-big" aria-hidden>{'Dr Nontu'.split('').map((c, i) => (c === ' ' ? ' ' : <span key={i}>{c}</span>))}</p>
      <div className="ftr-legal">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {practice.name} · Practice No. {practice.practiceNo}</span>
          <span><Link href="/privacy">Privacy Policy</Link> · <Link href="/popia">POPIA</Link> · <Link href="/terms">Terms &amp; Conditions</Link></span>
        </div>
      </div>
    </footer>
  );
}
