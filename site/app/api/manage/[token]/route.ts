import { z } from 'zod';
import { bookingByToken, bookingById, cancelBooking, rescheduleBooking } from '@/lib/booking';
import { mailCancelled, mailRescheduled } from '@/lib/email';
import { bad, fail } from '@/lib/http';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel'), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal('reschedule'), start: z.string().datetime({ offset: true }) }),
]);

export async function POST(req: Request, ctx: RouteContext<'/api/manage/[token]'>) {
  try {
    const { token } = await ctx.params;
    const b = await bookingByToken(token);
    if (!b) return bad('Booking not found.', 404);
    const body = Body.parse(await req.json());
    if (body.action === 'cancel') {
      await cancelBooking(b, { by: 'patient', reason: body.reason });
      const full = await bookingById(b.id);
      if (full) await mailCancelled(full);
    } else {
      await rescheduleBooking(b, body.start);
      const full = await bookingById(b.id);
      if (full) await mailRescheduled(full);
    }
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
