import { bookingById } from './booking';
import { mailConfirmed } from './email';

export async function notifyConfirmed(bookingId: string) {
  const b = await bookingById(bookingId);
  if (b) await mailConfirmed(b);
}
