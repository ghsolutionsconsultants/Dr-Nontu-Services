import { z } from 'zod';
import { getMonthAvailability } from '@/lib/booking';
import { fail } from '@/lib/http';

const P = z.object({ type: z.enum(['in_person', 'house_call', 'virtual']), location: z.string().min(1), duration: z.coerce.number().int().positive(), month: z.string().regex(/^\d{4}-\d{2}$/) });

export async function GET(req: Request) {
  try {
    const p = P.parse(Object.fromEntries(new URL(req.url).searchParams));
    return Response.json({ days: await getMonthAvailability(p) });
  } catch (e) { return fail(e); }
}
