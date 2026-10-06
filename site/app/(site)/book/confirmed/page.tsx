import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bookingByToken } from '@/lib/booking';
import { fmtWhen, rands } from '@/lib/time';
import { practice, waLink } from '@/lib/content';
import { Icon, WhatsAppIcon } from '@/components/site/Icon';

export const metadata = { title: 'Booking confirmed', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Confirmed(props: PageProps<'/book/confirmed'>) {
  const { t } = await props.searchParams;
  const b = typeof t === 'string' ? await bookingByToken(t) : undefined;
  if (!b) notFound();
  const where = b.consult_type === 'house_call' ? b.home_address : b.consult_type === 'virtual' ? 'Video call (link sent before your visit)' : `${b.location_name} · ${b.location_address}`;
  return (
    <section className="section page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + clamp(48px,7vw,96px))' }}>
      <div className="wrap g12">
        <div className="c1-8">
          <svg className="confirm-mark" viewBox="0 0 88 88" aria-hidden><path pathLength={1} d="M4 50 H22 L28 40 L36 62 L44 26 L52 56 L58 44 H64 L72 34 L84 22" /></svg>
          <span className="eyebrow" style={{ marginTop: 20 }}>Booking {b.ref}</span>
          <h1 className="display" style={{ fontSize: 'var(--step-4)', margin: '18px 0 0' }}>You&rsquo;re booked, <em>{b.patient_name.split(' ')[0]}.</em></h1>
          <p className="lede" style={{ marginTop: 20 }}>We&rsquo;ve emailed your confirmation to {b.patient_email}, with a calendar invite and a link to manage your booking.</p>
          <div className="ctas">
            <Link className="btn" href={`/manage/${b.manage_token}`}>Manage booking <Icon name="arrow" /></Link>
            <a className="btn btn--ghost" href={waLink(`Hi, about my booking ${b.ref}`)}><WhatsAppIcon /> WhatsApp us</a>
          </div>
        </div>
        <aside className="c9-12">
          <div className="summary soft" style={{ borderRadius: 6 }}>
            <h4>Your visit</h4>
            <div className="sum-row"><span>When</span><span>{fmtWhen(new Date(b.start_at))}</span></div>
            <div className="sum-row"><span>Type</span><span>{b.type_name}</span></div>
            <div className="sum-row"><span>Length</span><span>{b.duration_minutes} minutes</span></div>
            <div className="sum-row"><span>Where</span><span>{where}</span></div>
            <div className="sum-total"><span>{b.payment_status === 'paid' ? 'Paid' : 'Pay at visit'}</span><b>{rands(b.price_cents)}</b></div>
            <p style={{ fontSize: '.82rem', margin: '12px 0 0', color: 'color-mix(in srgb,var(--linen) 60%,var(--ink))' }}>Please bring your ID, medical aid card and a list of your medication. Questions? {practice.phones[0]}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
