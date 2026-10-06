import { legal } from '@/lib/legal';
import { PageHero } from '@/components/site/Sections';

const doc = legal.popia;
export const metadata = { title: doc.title };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} />
      <section className="section section--rule" style={{ paddingTop: 48 }}><div className="wrap"><div className="prose">{doc.body}</div></div></section>
    </>
  );
}
