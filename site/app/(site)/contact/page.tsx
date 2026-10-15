import { PageHero } from '@/components/site/Sections';
import { ContactForm } from '@/components/site/ContactForm';
import { Icon, WhatsAppIcon } from '@/components/site/Icon';
import { hasWhatsApp, locations, messageTopics, photos, practice, tel, waLink, type MessageTopic } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/contact');

export default async function Contact(props: PageProps<'/contact'>) {
  // ?topic=member or ?topic=booking (links from the membership page, booking pages and emails)
  const t = (await props.searchParams).topic;
  const topic = messageTopics.find((x) => x.id === t)?.id ?? 'general';
  return (
    <>
      <PageHero eyebrow="Locations & contact" title={<>Two rooms, <em>one standard of care.</em></>} photo={photos.hallway} photoAlt="The practice hallway"
        lede={`Bookings and enquiries by phone, ${hasWhatsApp ? 'WhatsApp, ' : ''}email or the message form below. Practice No. ${practice.practiceNo}.`}>
        <div className="contact-cards" style={{ marginTop: 28, maxWidth: 520 }}>
          {hasWhatsApp && <a className="contact-card" href={waLink()}><WhatsAppIcon className="" /><span><small>WhatsApp</small><b>Message us</b></span></a>}
          {practice.phones.map((p) => <a key={p} className="contact-card" href={tel(p)}><Icon name="phone" /><span><small>Call</small><b>{p}</b></span></a>)}
          {practice.emails.map((e) => <a key={e} className="contact-card" href={`mailto:${e}`}><Icon name="mail" /><span><small>Email</small><b>{e}</b></span></a>)}
        </div>
      </PageHero>
      <section className="section section--rule msg-section" id="message">
        <div className="wrap g12">
          <div className="c1-4 rv">
            <span className="eyebrow">Send a message</span>
            <h2 className="display" style={{ fontSize: 'var(--step-3)', margin: '16px 0 14px' }}>Ask us <em>anything.</em></h2>
            <p className="muted">General enquiries, questions about a booking, and members&rsquo; brief, non-urgent medical queries.</p>
            <p className="notice" style={{ marginTop: 20 }}>Not for emergencies. In an emergency, call 112 from a cellphone or 10177.</p>
          </div>
          <div className="c5-12"><ContactForm key={topic} topic={topic as MessageTopic} /></div>
        </div>
      </section>
      {locations.map((l, i) => (
        <section className={`section${i % 2 ? '' : ' section--tint'}`} key={l.id} id={l.id}>
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
    </>
  );
}
