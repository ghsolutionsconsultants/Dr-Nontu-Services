import Link from 'next/link';
import { PageHero } from '@/components/site/Sections';
import { Icon } from '@/components/site/Icon';
import { getCatalog } from '@/lib/booking';
import { photos, waLink } from '@/lib/content';
import { clock, lengthLabels } from '@/lib/fees';
import { rands } from '@/lib/time';
import { pageMeta } from '@/lib/seo';

// fees come from the database: render per request so admin changes show at once and builds never need the DB
export const dynamic = 'force-dynamic';
export const generateMetadata = () => pageMeta('/fees');
const ICON: Record<string, string> = { in_person: 'clinic', house_call: 'house', virtual: 'screen' };

export default async function Fees() {
  const { types, zones } = await getCatalog();
  return (
    <>
      <PageHero eyebrow="Fees & medical aid" title={<>Clear fees, <em>shown upfront.</em></>} photo={photos.bp} photoAlt="A blood pressure check" shape="arch"
        lede="Consultations are priced by how long you need; house calls by where you are. You see the exact fee before you confirm, and can pay online or at your visit." />
      <section className="section section--rule">
        <div className="wrap g12">
          <div className="c1-8">
            {types.map((t) => {
              const labels = lengthLabels(t.durations.map((d) => d.minutes));
              return (
                <div className="fee-block rv" key={t.id}>
                  <h3><Icon name={ICON[t.id]} />{t.name}</h3>
                  <p className="muted" style={{ margin: '0 0 12px' }}>{t.description}{t.requires_prepay ? ' Paid online when you book.' : ''}</p>
                  {t.id === 'house_call' ? (
                    <table className="fees-table">
                      <thead><tr><th>Where you are</th><th>Fee</th></tr></thead>
                      <tbody>{zones.flatMap((z) => z.price_cents == null ? [
                        <tr key={z.id}><td>{z.name}</td><td><a className="link-u" href={waLink(`Hi, I'd like a quote for a house call (${z.name.toLowerCase()}).`)} target="_blank" rel="noopener">WhatsApp for a quote</a></td></tr>,
                      ] : z.evening_price_cents != null && z.evening_from != null ? [
                        <tr key={z.id}><td>{z.name}{z.note && <small className="muted"> · {z.note}</small>}<br /><small className="muted">before {clock(z.evening_from)}</small></td><td><b>{rands(z.price_cents)}</b></td></tr>,
                        <tr key={`${z.id}e`}><td>{z.name}{z.note && <small className="muted"> · {z.note}</small>}<br /><small className="muted">{clock(z.evening_from)} – 22:00</small></td><td><b>{rands(z.evening_price_cents)}</b></td></tr>,
                      ] : [
                        <tr key={z.id}><td>{z.name}{z.note && <small className="muted"> · {z.note}</small>}</td><td><b>{rands(z.price_cents)}</b></td></tr>,
                      ])}</tbody>
                    </table>
                  ) : (
                    <table className="fees-table">
                      <thead><tr><th>Length</th><th>Fee</th></tr></thead>
                      <tbody>{t.durations.map((d, i) => (
                        <tr key={d.id}><td>{labels[i]}</td><td><b>{rands(d.price_cents)}</b> <Link className="link-u" style={{ marginLeft: 14, fontSize: '.86rem' }} href={`/book?type=${t.id}&duration=${d.minutes}`}>Book</Link></td></tr>
                      ))}</tbody>
                    </table>
                  )}
                  {t.id === 'house_call' && <p className="muted" style={{ fontSize: '.88rem', margin: '10px 0 0' }}>We confirm your address and fee before the visit. <Link className="link-u" href="/book?type=house_call">Book a house call</Link></p>}
                </div>
              );
            })}
          </div>
          <aside className="c9-12 stack rv">
            <span className="label">Ways to pay</span>
            <div className="contact-card"><Icon name="card" /><span><small>Online</small><b>Card, Instant EFT, Apple Pay</b></span></div>
            <div className="contact-card"><Icon name="clinic" /><span><small>At your visit</small><b>Cash, card or medical aid</b></span></div>
            <span className="label" style={{ marginTop: 18 }}>Medical aid</span>
            <p className="muted" style={{ margin: 0 }}>Please contact the practice to confirm your medical aid before your visit. You can also pay and claim back from your scheme. We provide a detailed invoice.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
