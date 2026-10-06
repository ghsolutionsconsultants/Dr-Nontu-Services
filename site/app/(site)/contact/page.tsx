import { PageHero, LocationsBlock } from '@/components/site/Sections';
import { Hours } from '@/components/site/DayTimeline';
import { Icon, WhatsAppIcon } from '@/components/site/Icon';
import { locations, photos, practice, tel, waLink } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/contact');

export default function Contact() {
  return (
    <>
      <PageHero eyebrow="Locations & contact" title={<>Two rooms, <em>one standard of care.</em></>} photo={photos.hallway} photoAlt="The practice hallway" scene="map"
        lede="Visit us in Esther Park or Fourways, book a house call, or reach us any time on WhatsApp.">
        <div className="contact-cards" style={{ marginTop: 28, maxWidth: 520 }}>
          <a className="contact-card" href={waLink()}><WhatsAppIcon className="" /><span><small>WhatsApp</small><b>Message us</b></span></a>
          {practice.phones.map((p) => <a key={p} className="contact-card" href={tel(p)}><Icon name="phone" /><span><small>Call</small><b>{p}</b></span></a>)}
          <a className="contact-card" href={`mailto:${practice.email}`}><Icon name="mail" /><span><small>Email</small><b>{practice.email}</b></span></a>
        </div>
      </PageHero>
      <section className="section section--rule"><div className="wrap"><LocationsBlock /></div></section>
      {locations.map((l, i) => (
        <section className={`section${i % 2 ? '' : ' section--tint'}`} key={l.id}>
          <div className="wrap g12">
            <div className="c1-4 rv">
              <span className="eyebrow">Location {i + 1}</span>
              <h2 className="display" style={{ fontSize: 'var(--step-3)', margin: '16px 0 14px' }}>{l.name}</h2>
              <address style={{ fontStyle: 'normal', lineHeight: 1.7 }}>{l.address.map((a) => <span key={a}>{a}<br /></span>)}</address>
              <p className="muted"><b>Parking.</b> {l.parking}</p>
              <a className="btn btn--ghost btn--sm" href={l.map} target="_blank" rel="noopener"><Icon name="pin" /> Get directions</a>
            </div>
            <div className="c5-12 rv"><iframe className="map-embed" src={l.embed} title={`Map of ${l.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
          </div>
        </section>
      ))}
      <section className="section day"><div className="wrap"><Hours title={<>Opening hours, <em>beat by beat.</em></>} /></div></section>
    </>
  );
}
