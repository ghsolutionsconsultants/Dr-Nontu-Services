import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/site/Sections';
import { Icon } from '@/components/site/Icon';
import { img, services } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

const MODE: Record<string, [string, string, string]> = { clinic: ['clinic', 'In person', 'in_person'], house: ['house', 'House call', 'house_call'], screen: ['screen', 'Virtual', 'virtual'] };
const SCENE = { clinic: 'chestpiece', house: 'house', screen: 'phone' } as const;

export function generateStaticParams() { return services.map((s) => ({ slug: s.slug })); }

export async function generateMetadata(props: PageProps<'/services/[slug]'>) {
  const { slug } = await props.params;
  const s = services.find((x) => x.slug === slug);
  return s ? pageMeta(`/services/${slug}`, { title: `${s.name} | Dr Nontu Medical Practice`, description: s.summary, image: img(s.image, 1200) }) : {};
}

export default async function Service(props: PageProps<'/services/[slug]'>) {
  const { slug } = await props.params;
  const s = services.find((x) => x.slug === slug);
  if (!s) notFound();
  const i = services.indexOf(s), next = services[(i + 1) % services.length];
  return (
    <>
      <PageHero eyebrow="Service" title={s.name} lede={s.summary} photo={s.image} photoAlt="" scene={SCENE[s.modes[0]]}
        crumbs={[{ href: '/services', label: 'Services' }]}>
        <div className="svc-detail-modes">{s.modes.map((m) => <span className="mode-pill" key={m}><Icon name={MODE[m][0]} />{MODE[m][1]}</span>)}</div>
      </PageHero>
      <section className="section section--rule">
        <div className="wrap g12">
          <div className="c1-8 prose rv">{s.body.map((p) => <p key={p} style={{ fontSize: 'var(--step-1)', lineHeight: 1.6 }}>{p}</p>)}</div>
          <div className="c9-12 stack rv">
            <span className="label">Book this as</span>
            {s.modes.map((m) => (
              <Link key={m} className="contact-card" href={`/book?type=${MODE[m][2]}&service=${s.slug}`} data-track="service_book" data-service={s.slug}>
                <Icon name={MODE[m][0]} /><span><small>{MODE[m][1]}</small><b>Choose a time →</b></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--tint">
        <div className="wrap">
          <Link className="contact-card rv" href={`/services/${next.slug}`} style={{ justifyContent: 'space-between' }}>
            <span><small>Next service</small><b className="h3">{next.name}</b></span><Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
