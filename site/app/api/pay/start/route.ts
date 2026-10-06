import { z } from 'zod';
import { bookingByToken } from '@/lib/booking';
import { bad, fail } from '@/lib/http';
import { startPayment } from '@/lib/payments';

// Pay on demand: a patient (or a payment link from the practice) pays for an existing booking.
export async function POST(req: Request) {
  try {
    const { token } = z.object({ token: z.string().min(10) }).parse(await req.json());
    const b = await bookingByToken(token);
    if (!b) return bad('Booking not found.', 404);
    if (b.payment_status === 'paid') return bad('This booking is already paid.', 409);
    if (!['pending_payment', 'confirmed', 'expired'].includes(b.status)) return bad('This booking can no longer be paid.', 409);
    return Response.json({ url: await startPayment(b) });
  } catch (e) { return fail(e); }
}
