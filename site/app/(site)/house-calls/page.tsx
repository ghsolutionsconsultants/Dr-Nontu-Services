import Link from 'next/link';
import { PageHero, SecHead } from '@/components/site/Sections';
import { Icon } from '@/components/site/Icon';
import { img, photos } from '@/lib/content';
import { getCatalog } from '@/lib/booking';
import { rands } from '@/lib/time';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/house-calls');

export default async function HouseCalls() {
  const { types } = await getCatalog();
  const hc = types.find((t) => t.id === 'house_call');
  return (
    <>
      <PageHero eyebrow="House calls" title={<>Healthcare, <em>wherever you are.</em></>} photo={photos.door} photoAlt="A green front door framed by climbing plants" shape="pill" scene="house"
        lede="When getting to the practice is hard, Dr Nontu comes to you. House calls are available daily from 09:00 to 16:00, subject to availability and service area.">
        <div className="ctas"><Link className="btn magnetic" href="/book?type=house_call" data-track="housecalls_book">Book a house call <Icon name="arrow" /></Link></div>
      </PageHero>
      <section className="section section--rule">
        <div className="wrap">
          <SecHead eyebrow="How it works" title={<>Three steps <em>to your door.</em></>} />
          <ol className="steps">
            <li className="rv"><h3>Book a time</h3><p>Choose how long you need and a time between 09:00 and 16:00, any day of the week.</p></li>
            <li className="rv"><h3>Tell us where</h3><p>Add your address and anything we should know, like gate codes or parking. We confirm your area.</p></li>
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
            {hc && (
              <table className="fees-table">
                <thead><tr><th>House call length</th><th>Fee</th></tr></thead>
                <tbody>{hc.durations.map((d) => <tr key={d.id}><td>{d.minutes} minutes</td><td><b>{rands(d.price_cents)}</b></td></tr>)}</tbody>
              </table>
            )}
            <p className="muted" style={{ fontSize: '.9rem' }}>Includes travel within our service area. Pay online when you book, or at the visit.</p>
            <div className="ph soft mask-in" style={{ aspectRatio: '16/10', marginTop: 24 }} data-tilt="6">
              
              <img src={img(photos.armchairs, 900)} alt="Two cream armchairs beside a plant" loading="lazy" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
