import Link from 'next/link';
import { PageHero, SecHead } from '@/components/site/Sections';
import { Icon } from '@/components/site/Icon';
import { img, photos, waLink } from '@/lib/content';
import { clock } from '@/lib/fees';
import { getCatalog } from '@/lib/booking';
import { rands } from '@/lib/time';
import { pageMeta } from '@/lib/seo';

// fees come from the database: render per request so admin changes show at once and builds never need the DB
export const dynamic = 'force-dynamic';
export const generateMetadata = () => pageMeta('/house-calls');

export default async function HouseCalls() {
  const { zones } = await getCatalog();
  return (
    <>
      <PageHero eyebrow="House calls" title={<>Healthcare, <em>wherever you are.</em></>} photo={photos.door} photoAlt="A green front door framed by climbing plants" shape="pill"
        lede="When getting to the practice is hard, Dr Nontu comes to you. House calls are available daily from 09:00 to 16:00, subject to availability and service area.">
        <div className="ctas"><Link className="btn" href="/book?type=house_call" data-track="housecalls_book">Book a house call <Icon name="arrow" /></Link></div>
      </PageHero>
      <section className="section section--rule">
        <div className="wrap">
          <SecHead eyebrow="How it works" title={<>Three steps <em>to your door.</em></>} />
          <ol className="steps">
            <li className="rv"><h3>Tell us where</h3><p>Choose your area to see the fee, then add your address and anything we should know, like gate codes or parking.</p></li>
            <li className="rv"><h3>Book a time</h3><p>Pick a time between 09:00 and 16:00, any day of the week. We confirm your address and fee.</p></li>
            <li className="rv"><h3>We come to you</h3><p>Dr Nontu arrives with everything needed for a full consultation, at home.</p></li>
          </ol>
        </div>
      </section>
      <section className="section section--tint">
        <div className="wrap g12">
          <div className="c1-6 rv">
            <span className="eyebrow">Good for</span>
            <h2 className="display" style={{ fontSize: 'var(--step-3)', margin: '16px 0 18px' }}>When leaving home <em>is the hard part.</em></h2>
            <ul className="prose" style={{ paddingLeft: '1.1em' }}>
              <li>Feeling too unwell to travel</li><li>Elderly or less mobile family members</li><li>Parents with sick little ones</li><li>Chronic care reviews in the comfort of home</li><li>Wound care and follow-ups</li>
            </ul>
          </div>
          <div className="c7-12 rv">
            <table className="fees-table">
              <thead><tr><th>Where you are</th><th>Fee</th></tr></thead>
              <tbody>{zones.flatMap((z) => z.price_cents == null
                ? [<tr key={z.id}><td>{z.name}</td><td><a className="link-u" href={waLink(`Hi, I'd like a quote for a house call (${z.name.toLowerCase()}).`)} target="_blank" rel="noopener">WhatsApp for a quote</a></td></tr>]
                : z.evening_price_cents != null && z.evening_from != null
                  ? [<tr key={z.id}><td>{z.name}<br /><small className="muted">before {clock(z.evening_from)}</small></td><td><b>{rands(z.price_cents)}</b></td></tr>,
                     <tr key={`${z.id}e`}><td>{z.name}<br /><small className="muted">{clock(z.evening_from)} – 22:00</small></td><td><b>{rands(z.evening_price_cents)}</b></td></tr>]
                  : [<tr key={z.id}><td>{z.name}</td><td><b>{rands(z.price_cents)}</b></td></tr>])}</tbody>
            </table>
            <p className="muted" style={{ fontSize: '.9rem' }}>Travel is included. Pay online when you book, or at the visit.</p>
            <div className="ph soft rv" style={{ aspectRatio: '16/10', marginTop: 24 }}>
              
              <img src={img(photos.armchairs, 900)} alt="Two cream armchairs beside a plant" loading="lazy" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
