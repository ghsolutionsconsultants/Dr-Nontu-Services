import { adminOr401 } from '@/lib/auth';
import { bookingsBetween } from '@/lib/booking';
import { q } from '@/lib/db';

// FullCalendar feed: ?start=ISO&end=ISO
export async function GET(req: Request) {
  const { res } = await adminOr401(); if (res) return res;
  const u = new URL(req.url);
  const from = new Date(u.searchParams.get('start') ?? Date.now()), to = new Date(u.searchParams.get('end') ?? Date.now() + 864e5 * 31);
  const [bookings, blocks] = await Promise.all([
    bookingsBetween(from, to),
    q<{ id: number; starts_at: Date; ends_at: Date; reason: string }>(`select * from blackouts where starts_at < $2 and ends_at > $1`, [from, to]),
  ]);
  return Response.json([
    ...bookings.filter((b) => b.status !== 'cancelled').map((b) => ({
      id: b.id, title: `${b.patient_name} · ${b.type_name}`, start: b.start_at, end: b.end_at, url: `/admin/bookings/${b.id}`,
      classNames: [`ev-${b.consult_type}`, `ev-${b.status}`],
      extendedProps: { location: b.location_name, status: b.status, payment: b.payment_status },
    })),
    ...blocks.map((x) => ({ id: `x${x.id}`, title: x.reason || 'Blocked', start: x.starts_at, end: x.ends_at, display: 'background', classNames: ['ev-blackout'] })),
  ]);
}
