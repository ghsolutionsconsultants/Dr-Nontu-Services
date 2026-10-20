import Link from 'next/link';
import { getCatalog } from '@/lib/booking';
import { saveBooking } from '../../../actions';
import { Head } from '@/components/admin/ui';
import { BookingForm, type FormValues } from '@/components/admin/BookingForm';
import { todayKey } from '@/lib/time';

export const metadata = { title: 'New booking' };

export default async function NewBooking(props: PageProps<'/admin/bookings/new'>) {
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const { types, locations, services, zones } = await getCatalog();
  const type = (types.find((t) => t.id === one('type'))?.id ?? types[0].id) as FormValues['type'];
  const presets = types.find((t) => t.id === type)!.durations;
  // from the calendar: a click gives a start time, a drag across time gives the length too
  const minutes = Number(one('duration')) || presets[0]?.minutes || 30;
  const preset = type === 'house_call' ? undefined : presets.find((d) => d.minutes === minutes);
  const initial: FormValues = {
    type, duration: minutes, price: (preset?.price_cents ?? 0) / 100,
    date: /^\d{4}-\d{2}-\d{2}$/.test(one('date')) ? one('date') : todayKey(),
    time: /^\d{2}:\d{2}$/.test(one('time')) ? one('time') : '09:00',
    status: 'confirmed', paymentChoice: 'at_visit', reason: '',
  };
  return (
    <>
      <Head eyebrow="Bookings" title="New booking"><Link className="b b--ghost" href="/admin/bookings">← All bookings</Link></Head>
      <p className="muted" style={{ marginTop: -10, maxWidth: '70ch' }}>For phone, WhatsApp and walk-in patients, or to record a visit afterwards. Any length, fee, date or time works, including outside your opening hours.</p>
      <BookingForm catalog={{ types, locations, services, zones }} initial={initial} action={saveBooking} />
    </>
  );
}
