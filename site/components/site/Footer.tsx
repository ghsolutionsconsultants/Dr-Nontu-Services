import Link from 'next/link';
import { practice, tel, waLink, hasWhatsApp, locations } from '@/lib/content';
import { Icon } from './Icon';
import { MessageButton } from './MessageButton';

export function Footer() {
  const follow = ([['Instagram', practice.social.instagram], ['Facebook', practice.social.facebook], ['TikTok', practice.social.tiktok]] as const).filter(([, href]) => href);
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-cta">
          <h2 className="display">Come as a patient. <em>Leave feeling cared&nbsp;for.</em></h2>
          <div className="ctas">
            <Link className="btn btn--light" href="/book" data-track="footer_book">Book an appointment <Icon name="arrow" /></Link>
            <MessageButton className="btn btn--on-dark" />
          </div>
        </div>
        <div className="ftr-cols">
          <div><h5>Visit</h5>{locations.map((l) => <Link key={l.id} href={`/contact#${l.id}`}>{l.name}</Link>)}<Link href="/house-calls">House calls</Link><Link href="/services/virtual-consultations">Virtual consultations</Link></div>
          <div><h5>Practice</h5><Link href="/about">About Dr Nontu</Link><Link href="/services">Services</Link><Link href="/care-plans">Membership</Link><Link href="/fees">Fees &amp; medical aid</Link><Link href="/faq">FAQ</Link></div>
          <div><h5>Talk to us</h5>{practice.phones.map((p) => <a key={p} className="tnum" href={tel(p)}>{p}</a>)}{hasWhatsApp && <a href={waLink()}>WhatsApp</a>}{practice.emails.map((e) => <a key={e} href={`mailto:${e}`}>{e}</a>)}<Link href="/contact#message">Send a message</Link></div>
          {follow.length > 0 && <div><h5>Follow</h5>{follow.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</div>}
        </div>
      </div>
      <p className="ftr-big" aria-hidden>Dr Nontu</p>
      <div className="ftr-legal">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {practice.name} · Practice No. {practice.practiceNo}</span>
          <span><Link href="/privacy">Privacy Policy</Link> · <Link href="/popia">POPIA</Link> · <Link href="/terms">Terms &amp; Conditions</Link></span>
        </div>
      </div>
    </footer>
  );
}
