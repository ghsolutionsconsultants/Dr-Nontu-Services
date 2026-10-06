import { PageHero, SecHead, Ways } from '@/components/site/Sections';
import { ServicesIndex } from '@/components/site/ServicesIndex';
import { photos, services } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/services');

export default function Services() {
  return (
    <>
      <PageHero eyebrow="Our services" title={<>One doctor, <em>the whole family.</em></>} photo={photos.babyFeet} photoAlt="A baby's feet wrapped in a soft white blanket" shape="pill" scene="chestpiece"
        lede="Comprehensive primary care with a focus on prevention, early intervention and treatment that fits your life." />
      <section className="section section--rule"><div className="wrap"><ServicesIndex items={services} /></div></section>
      <section className="section section--tint">
        <div className="wrap">
          <SecHead eyebrow="Three ways to be seen" title={<>Care that meets you <em>where you are.</em></>} />
          <Ways />
        </div>
      </section>
    </>
  );
}
