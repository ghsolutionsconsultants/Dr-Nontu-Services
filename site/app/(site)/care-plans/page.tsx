import { PlansBlock } from '@/components/site/Sections';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/care-plans');

export default function CarePlans() {
  return (
    <section className="section plans page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + clamp(48px,7vw,96px))' }}>
      <div className="wrap"><PlansBlock heading="h1" /></div>
    </section>
  );
}
