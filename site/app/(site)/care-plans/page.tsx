import { PlansBlock, SecHead } from '@/components/site/Sections';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/care-plans');

export default function CarePlans() {
  return (
    <>
      <section className="section plans page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + clamp(48px,7vw,96px))' }}><div className="wrap"><PlansBlock heading="h1" /></div></section>
      <section className="section section--rule">
        <div className="wrap">
          <SecHead eyebrow="Also coming" title={<>Ask a doctor, <em>month to month.</em></>} aside="A monthly subscription for online medical questions: quick, written answers from Dr Nontu when something is on your mind." />
          <div className="notice rv">Care plan benefits and pricing are being finalised. WhatsApp or call us to be told first when they launch.</div>
        </div>
      </section>
    </>
  );
}
