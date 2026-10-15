import { notFound } from 'next/navigation';
import { SubscribeForm } from '@/components/membership/SubscribeForm';
import { memberships, membershipNote } from '@/lib/content';
import { rands } from '@/lib/time';

export const metadata = { title: 'Subscribe', robots: { index: false } };

export default async function Subscribe(props: PageProps<'/care-plans/subscribe'>) {
  const { plan } = await props.searchParams;
  const p = memberships.find((m) => m.id === plan);
  if (!p) notFound();
  return (
    <section className="section section--tint page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + clamp(40px,6vw,80px))', minHeight: '90vh' }}>
      <div className="wrap g12">
        <div className="c1-6">
          <span className="eyebrow">Membership</span>
          <h1 className="display" style={{ fontSize: 'var(--step-3)', margin: '16px 0 0' }}>Join {p.name}. <em>{p.label}.</em></h1>
          <p className="lede" style={{ marginTop: 18 }}>{rands(p.priceCents)} a month, charged to your card. Cancel any time from your membership page.</p>
          <SubscribeForm plan={p.id} price={rands(p.priceCents)} />
        </div>
        <aside className="c7-12">
          <article className={`plan plan--${p.id}`}>
            <header><h3><i className={`dot-${p.id}`} />{p.name}</h3><span className="plan-label">{p.label}</span></header>
            <p className="plan-price"><b className="tnum">{rands(p.priceCents)}</b> / month</p>
            <ul>{p.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
          </article>
          <p className="plan-note muted">{membershipNote} In an emergency, call 112 or 10177.</p>
        </aside>
      </div>
    </section>
  );
}
