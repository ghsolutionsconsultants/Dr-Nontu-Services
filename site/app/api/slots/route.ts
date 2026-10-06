import { z } from 'zod';
import { bookingByToken, getSlots } from '@/lib/booking';
import { fail } from '@/lib/http';

const P = z.object({
  type: z.enum(['in_person', 'house_call', 'virtual']), location: z.string().min(1), duration: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), token: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const p = P.parse(Object.fromEntries(new URL(req.url).searchParams));
    // when rescheduling, the patient's own booking must not block its neighbours
    const excludeId = p.token ? (await bookingByToken(p.token))?.id : undefined;
    const slots = await getSlots({ ...p, excludeId });
    return Response.json({ slots: slots.map((d) => d.toISOString()) });
  } catch (e) { return fail(e); }
}
