import { BookingWizard } from '@/components/booking/BookingWizard';
import { getCatalog } from '@/lib/booking';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/book');
export const dynamic = 'force-dynamic';

export default async function Book(props: PageProps<'/book'>) {
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const { types, locations, services } = await getCatalog();
  return (
    <section className="section section--tint page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + clamp(40px,6vw,80px))', minHeight: '100vh' }}>
      <div className="wrap">
        <div className="sec-head">
          <div><span className="eyebrow">Book an appointment</span><h1 className="display" style={{ fontSize: 'var(--step-3)', margin: '16px 0 0' }}>Pick a time. <em>We&rsquo;ll take it from there.</em></h1></div>
          <p className="muted">Takes about a minute. You&rsquo;ll get an email confirmation with a link to move or cancel your booking.</p>
        </div>
        <BookingWizard catalog={{ types, locations, services }} initial={{ type: one(sp.type), service: one(sp.service), duration: Number(one(sp.duration)) || undefined }} />
      </div>
    </section>
  );
}
