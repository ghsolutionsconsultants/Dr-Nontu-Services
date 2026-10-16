import Link from 'next/link';
import { Hero } from '@/components/site/Hero';
import { ServicesIndex } from '@/components/site/ServicesIndex';
import { SecHead, Ways, PlansBlock, LocationsBlock } from '@/components/site/Sections';
import { Icon } from '@/components/site/Icon';
import { MessageButton } from '@/components/site/MessageButton';
import { bio, img, photos, practice, services, tel } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/');

export default function Home() {
  return (
    <>
      <Hero>
        <div className="hero-foot">
          <div>
            <div className="ctas rv">
              <Link className="btn" href="/book" data-track="hero_book">Book an appointment <Icon name="arrow" /></Link>
              <MessageButton compact />
              <a className="btn btn--ghost" href={tel(practice.phones[0])}><span>Call <span className="sm-hide">{practice.phones[0].replace('+27 ', '0')}</span><span className="sm-only">us</span></span></a>
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
            <span className="eyebrow">About Dr Nontu</span>
            <p className="about-intro">{bio[0]}</p>
            <Link className="link-u" href="/about">More about Dr Nontu →</Link>
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
