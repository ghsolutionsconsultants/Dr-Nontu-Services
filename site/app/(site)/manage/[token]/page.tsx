import { notFound, redirect } from 'next/navigation';
import { bookingByToken, bookingSettings, isLocked } from '@/lib/booking';
import { startPayment } from '@/lib/payments';
import { ManageBooking } from '@/components/booking/ManageBooking';

export const metadata = { title: 'Manage your booking', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Manage(props: PageProps<'/manage/[token]'>) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const b = await bookingByToken(token);
  if (!b) notFound();
  const s = await bookingSettings();
  const lockedOnline = isLocked(b, s.cancelCutoffHours);
  // payment links from the practice land here with ?pay=1: go straight to checkout
  if (sp.pay === '1' && b.payment_status !== 'paid' && ['pending_payment', 'confirmed', 'expired'].includes(b.status)) redirect(await startPayment(b));
  return (
    <section className="section page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + clamp(48px,7vw,96px))', minHeight: '90vh' }}>
      <div className="wrap">
        <ManageBooking token={token} paymentFailed={sp.payment === 'failed'} cutoffHours={s.cancelCutoffHours} locked={lockedOnline}
          booking={{
            ref: b.ref, name: b.patient_name, status: b.status, payment_status: b.payment_status, payment_choice: b.payment_choice,
            start: new Date(b.start_at).toISOString(), duration: b.duration_minutes, price: b.price_cents, type: b.consult_type, type_name: b.type_name ?? '',
            location: b.location_id, where: b.consult_type === 'house_call' ? b.home_address ?? 'Your home' : b.consult_type === 'virtual' ? 'Video call' : `${b.location_name} · ${b.location_address}`,
          }} />
      </div>
    </section>
  );
}
