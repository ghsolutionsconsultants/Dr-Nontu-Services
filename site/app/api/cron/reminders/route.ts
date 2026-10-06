import { q } from '@/lib/db';
import { bookingById, expireHolds, type Booking } from '@/lib/booking';
import { mailReminder } from '@/lib/email';
import { addDays, dateKey, fromSast } from '@/lib/time';

// Vercel Cron (vercel.json) calls this daily at 06:00 UTC (08:00 SAST) with Authorization: Bearer $CRON_SECRET,
// and reminds everyone booked for tomorrow (SAST). Works on Vercel's Hobby plan (daily crons only).
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response('Unauthorised', { status: 401 });
  await expireHolds();
  const tomorrow = addDays(dateKey(new Date()), 1);
  const due = await q<Pick<Booking, 'id'>>(`select id from bookings where status = 'confirmed' and reminder_sent_at is null
    and start_at >= $1 and start_at < $2`, [fromSast(tomorrow, 0), fromSast(addDays(tomorrow, 1), 0)]);
  for (const { id } of due) {
    const b = await bookingById(id);
    if (!b) continue;
    await mailReminder(b);
    await q(`update bookings set reminder_sent_at = now() where id = $1`, [id]);
  }
  return Response.json({ reminded: due.length });
}
