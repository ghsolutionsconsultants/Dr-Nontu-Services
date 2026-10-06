import { BookingInput, createBooking } from '@/lib/booking';
import { fail } from '@/lib/http';
import { startPayment } from '@/lib/payments';
import { notifyConfirmed } from '@/lib/notify';

export async function POST(req: Request) {
  try {
    const input = BookingInput.parse(await req.json());
    const b = await createBooking(input);
    if (b.status === 'pending_payment') {
      const url = await startPayment(b);
      return Response.json({ ref: b.ref, next: url });
    }
    await notifyConfirmed(b.id);
    return Response.json({ ref: b.ref, next: `/book/confirmed?t=${b.manage_token}` });
  } catch (e) { return fail(e); }
}
