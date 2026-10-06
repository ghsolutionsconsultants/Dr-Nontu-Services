import { q } from '@/lib/db';
import { bookingById, expireHolds, type Booking } from '@/lib/booking';
import { mailReminder } from '@/lib/email';

// Vercel Cron (vercel.json) calls this hourly with Authorization: Bearer $CRON_SECRET.
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response('Unauthorised', { status: 401 });
  await expireHolds();
  const due = await q<Pick<Booking, 'id'>>(`select id from bookings where status = 'confirmed' and reminder_sent_at is null
    and start_at between now() + interval '20 hours' and now() + interval '28 hours'`);
  for (const { id } of due) {
    const b = await bookingById(id);
    if (!b) continue;
    await mailReminder(b);
    await q(`update bookings set reminder_sent_at = now() where id = $1`, [id]);
  }
  return Response.json({ reminded: due.length });
}
