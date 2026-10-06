import Link from 'next/link';
import { Hero } from '@/components/site/Hero';
import { Statement } from '@/components/site/Statement';
import { Hours } from '@/components/site/DayTimeline';
import { ServicesIndex } from '@/components/site/ServicesIndex';
import { Marquee, SecHead, Ways, PlansBlock, LocationsBlock } from '@/components/site/Sections';
import { Scene3D } from '@/components/three/Scene3D';
import { Icon, WhatsAppIcon } from '@/components/site/Icon';
import { img, photos, practice, services, tel, waLink } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/');

export default function Home() {
  return (
    <>
      <Hero>
        <div className="hero-foot">
          <div>
            <p className="lede rv">Meet Dr Nontu: a GP who listens first, explains clearly, and makes sure you leave knowing you&rsquo;ll be okay.</p>
            <div className="ctas rv">
              <Link className="btn magnetic" href="/book" data-track="hero_book">Book an appointment <Icon name="arrow" /></Link>
              <a className="btn btn--ghost magnetic" href={waLink()}><WhatsAppIcon /> WhatsApp us</a>
              <a className="btn btn--ghost magnetic" href={tel(practice.phones[0])}>Call {practice.phones[0].replace('+27 ', '0')}</a>
            </div>
          </div>
          <div className="creds rv">
            <b>{practice.doctor}</b>
            <span>{practice.credentials}</span><br />
            <span className="muted">{practice.role}</span>
          </div>
        </div>
      </Hero>
      <Marquee />

      <section className="section">
        <div className="wrap">
          <Statement aside={<div className="statement-ph ph arch mask-in" data-tilt="10"><img src={img(photos.oliveVase, 700)} alt="Olive branches in a white ceramic vase" loading="lazy" /></div>}>
            Sometimes you don&rsquo;t just need a doctor to treat what&rsquo;s wrong. You need someone who <em>listens.</em> Someone who <em>reassures</em> you. Someone who makes you feel you&rsquo;re going to be <em>okay.</em>
          </Statement>
        </div>
      </section>

      <section className="section section--rule">
        <div className="wrap">
          <SecHead eyebrow="How would you like to consult?" title={<>Care that meets you <em>where you are.</em></>} aside="Come to the practice, have Dr Nontu come to you, or talk from wherever you are. Every option books the same way." />
          <Ways />
        </div>
      </section>

      <section className="section plans"><div className="wrap"><PlansBlock /></div></section>

      <section className="section day"><div className="wrap"><Hours title={<>A day at the practice, <em>beat by beat.</em></>} /></div></section>

      <section className="section">
        <div className="wrap">
          <SecHead eyebrow="Our services" title={<>One doctor, <em>the whole family.</em></>} aside="From a quick script to long-term care, and a referral when you need a specialist." />
          <ServicesIndex items={services} />
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap">
          <SecHead eyebrow="Book an appointment" title={<>Pick a time. <em>We&rsquo;ll take it from there.</em></>}
            aside={<div className="head-3d"><Scene3D kind="calendar" className="book-3d" /><p className="muted">Choose how you&rsquo;d like to be seen, how long you need, and a time. Pay online now, or at your visit.</p></div>} />
          <div className="choice-grid">
            {[['in_person', 'clinic', 'In person', 'Esther Park or Fourways · Mon–Fri'], ['house_call', 'house', 'House call', 'At your home · daily'], ['virtual', 'screen', 'Virtual', 'By video · 24/7']].map(([id, icon, label, sub]) => (
              <Link key={id} className="choice rv" href={`/book?type=${id}`} data-track={`home_book_${id}`}>
                <Icon name={icon} /><b>{label}</b><small>{sub}</small><span className="from">Choose a time →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SecHead eyebrow="Practice locations" title={<>Two rooms, <em>one standard of care.</em></>} />
          <LocationsBlock />
        </div>
      </section>
    </>
  );
}
