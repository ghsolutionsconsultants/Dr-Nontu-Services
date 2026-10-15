import Link from 'next/link';
import { Hero } from '@/components/site/Hero';
import { ServicesIndex } from '@/components/site/ServicesIndex';
import { SecHead, Ways, PlansBlock, LocationsBlock } from '@/components/site/Sections';
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
              <Link className="btn" href="/book" data-track="hero_book">Book an appointment <Icon name="arrow" /></Link>
              <a className="btn btn--ghost" href={waLink()}><WhatsAppIcon /> WhatsApp us</a>
              <a className="btn btn--ghost" href={tel(practice.phones[0])}>Call {practice.phones[0].replace('+27 ', '0')}</a>
            </div>
          </div>
          <div className="creds rv">
            <b>{practice.doctor}</b>
            <span>{practice.credentials}</span><br />
            <span className="muted">{practice.role}</span>
          </div>
        </div>
      </Hero>

      <section className="section">
        <div className="wrap g12 about-row">
          <div className="c1-4"><div className="ph soft about-ph rv"><img src={img(photos.oliveVase, 700)} alt="Olive branches in a white ceramic vase" loading="lazy" /></div></div>
          <div className="c5-12 rv">
            <span className="eyebrow">Healthcare that feels personal</span>
            <p className="statement-q display">Sometimes you don&rsquo;t just need a doctor to treat what&rsquo;s wrong. You need someone who <em>listens</em>, who reassures you, and who makes you feel you&rsquo;re going to be okay.</p>
            <p className="muted" style={{ maxWidth: '56ch' }}>Comprehensive primary healthcare with a focus on prevention, early intervention and personalised treatment, in a warm, welcoming space where every patient is treated as an individual.</p>
            <Link className="link-u" href="/about">About Dr Nontu →</Link>
          </div>
        </div>
      </section>

      <section className="section section--tint" id="consult">
        <div className="wrap">
          <SecHead eyebrow="How to consult" title={<>Three ways to see Dr Nontu, <em>and when.</em></>} />
          <Ways />
        </div>
      </section>

      <section className="section plans"><div className="wrap"><PlansBlock /></div></section>

      <section className="section section--rule">
        <div className="wrap">
          <SecHead eyebrow="Our services" title={<>One doctor, <em>the whole family.</em></>} />
          <ServicesIndex items={services} />
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap">
          <SecHead eyebrow="Practice locations" title={<>Two practices, <em>one standard of care.</em></>} />
          <LocationsBlock />
        </div>
      </section>
    </>
  );
}
