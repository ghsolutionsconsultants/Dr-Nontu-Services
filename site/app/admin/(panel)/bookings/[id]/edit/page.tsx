import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bookingById, getCatalog } from '@/lib/booking';
import { saveBooking } from '../../../../actions';
import { Head } from '@/components/admin/ui';
import { BookingForm } from '@/components/admin/BookingForm';
import { dateKey, hhmm, sastMinutes } from '@/lib/time';

export const metadata = { title: 'Edit booking' };

export default async function EditBooking(props: PageProps<'/admin/bookings/[id]/edit'>) {
  const { id } = await props.params;
  const [b, { types, locations, services, zones }] = await Promise.all([bookingById(id), getCatalog()]);
  if (!b) notFound();
  const start = new Date(b.start_at);
  return (
    <>
      <Head eyebrow={`Booking ${b.ref}`} title={`Edit ${b.patient_name}`}><Link className="b b--ghost" href={`/admin/bookings/${b.id}`}>← Back to booking</Link></Head>
      <BookingForm catalog={{ types, locations, services, zones }} action={saveBooking} initial={{
        id: b.id, type: b.consult_type, location: b.location_id, serviceId: b.service_id, duration: b.duration_minutes, price: b.price_cents / 100,
        date: dateKey(start), time: hhmm(sastMinutes(start)), status: b.status, paymentChoice: b.payment_choice,
        name: b.patient_name, email: b.patient_email, phone: b.patient_phone, dob: b.patient_dob ? String(b.patient_dob).slice(0, 10) : '',
        medicalAid: b.medical_aid, medicalAidNo: b.medical_aid_no, address: b.home_address, reason: b.reason, allowOverlap: b.allow_overlap, zone: b.house_zone,
      }} />
    </>
  );
}
