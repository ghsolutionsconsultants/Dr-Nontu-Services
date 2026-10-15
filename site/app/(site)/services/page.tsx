import { PageHero } from '@/components/site/Sections';
import { ServicesIndex } from '@/components/site/ServicesIndex';
import { photos, services } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/services');

export default function Services() {
  return (
    <>
      <PageHero eyebrow="Our services" title={<>One doctor, <em>the whole family.</em></>} photo={photos.babyFeet} photoAlt="A baby's feet wrapped in a soft white blanket" shape="pill"
        lede="Comprehensive primary care with a focus on prevention, early intervention and treatment that fits your life." />
      <section className="section section--rule"><div className="wrap"><ServicesIndex items={services} /></div></section>
    </>
  );
}
