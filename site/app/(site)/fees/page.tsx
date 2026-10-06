import Link from 'next/link';
import { PageHero } from '@/components/site/Sections';
import { Icon } from '@/components/site/Icon';
import { getCatalog } from '@/lib/booking';
import { photos } from '@/lib/content';
import { rands } from '@/lib/time';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/fees');
const ICON: Record<string, string> = { in_person: 'clinic', house_call: 'house', virtual: 'screen' };

export default async function Fees() {
  const { types } = await getCatalog();
  return (
    <>
      <PageHero eyebrow="Fees & medical aid" title={<>Clear fees, <em>chosen by you.</em></>} photo={photos.bp} photoAlt="A blood pressure check" shape="arch" scene="calendar"
        lede="You choose how long you need. Each length has a set fee, shown before you confirm. Pay online now, or at your visit." />
      <section className="section section--rule">
        <div className="wrap g12">
          <div className="c1-8">
            {types.map((t) => (
              <div className="fee-block rv" key={t.id}>
                <h3><Icon name={ICON[t.id]} />{t.name}</h3>
                <p className="muted" style={{ margin: '0 0 12px' }}>{t.description}{t.requires_prepay ? ' Paid online when you book.' : ''}</p>
                <table className="fees-table">
                  <thead><tr><th>Length</th><th>Fee</th></tr></thead>
                  <tbody>{t.durations.map((d) => (
                    <tr key={d.id}><td>{d.minutes} minutes</td><td><b>{rands(d.price_cents)}</b> <Link className="link-u" style={{ marginLeft: 14, fontSize: '.86rem' }} href={`/book?type=${t.id}&duration=${d.minutes}`}>Book</Link></td></tr>
                  ))}</tbody>
                </table>
              </div>
            ))}
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
