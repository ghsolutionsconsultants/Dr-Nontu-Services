import { notFound } from 'next/navigation';
import { one } from '@/lib/db';
import { paymentMode } from '@/lib/payments';
import { rands } from '@/lib/time';

export const metadata = { title: 'Test checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

// Stand-in for Paystack while no PAYSTACK_SECRET_KEY is configured.
export default async function TestCheckout(props: PageProps<'/pay/test'>) {
  if (paymentMode() !== 'mock') notFound();
  const { reference } = await props.searchParams;
  const p = typeof reference === 'string' ? await one<{ amount_cents: number; ref: string; patient_email: string }>(
    `select p.amount_cents, b.ref, b.patient_email from payments p join bookings b on b.id = p.booking_id where p.reference = $1`, [reference]) : undefined;
  if (!p) notFound();
  return (
    <section className="section page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + 64px)', minHeight: '90vh' }}>
      <div className="wrap" style={{ maxWidth: 560 }}>
        <div className="notice" style={{ marginBottom: 24 }}><b>Test checkout.</b> Paystack isn&rsquo;t connected yet, so no money moves. Add <code>PAYSTACK_SECRET_KEY</code> to switch to real payments.</div>
        <div className="book-card" style={{ padding: 32 }}>
          <span className="eyebrow">Booking {p.ref}</span>
          <h1 className="display" style={{ fontSize: 'var(--step-3)', margin: '14px 0 6px' }}>Pay {rands(p.amount_cents)}</h1>
          <p className="muted" style={{ marginTop: 0 }}>{p.patient_email}</p>
          <form action="/api/pay/test" method="post" className="stack" style={{ marginTop: 24 }}>
            <input type="hidden" name="reference" value={reference as string} />
            <div className="chips">
              {['card', 'eft', 'apple_pay'].map((c, i) => <label key={c} className="chip"><input type="radio" name="channel" value={c} defaultChecked={i === 0} style={{ accentColor: 'var(--moss)' }} /> {c === 'eft' ? 'Instant EFT' : c === 'apple_pay' ? 'Apple Pay' : 'Card'}</label>)}
            </div>
            <button className="btn" name="outcome" value="success">Simulate successful payment</button>
            <button className="btn btn--ghost" name="outcome" value="failed">Simulate failed payment</button>
          </form>
        </div>
      </div>
    </section>
  );
}
