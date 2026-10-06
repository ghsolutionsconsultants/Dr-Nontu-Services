import { PageHero } from '@/components/site/Sections';
import { faq, photos } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/faq');

export default function Faq() {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <PageHero eyebrow="Questions" title={<>Answers, <em>when you need them.</em></>} photo={photos.tea} photoAlt="A cup of tea on a sunlit table" shape="round" scene="phone"
        lede="The things patients ask us most. Can't find yours? WhatsApp us; we're happy to help." />
      <section className="section section--rule">
        <div className="wrap g12">
          <div className="c1-8 faq">
            {faq.map((f) => (
              <details key={f.q} className="rv">
                <summary>{f.q}<i aria-hidden /></summary>
                <div className="ans"><div><p>{f.a}</p></div></div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
