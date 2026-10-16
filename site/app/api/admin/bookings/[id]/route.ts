import { adminOr401 } from '@/lib/auth';
import { moveAdminBooking } from '@/lib/admin-bookings';
import { bad, fail } from '@/lib/http';
import { revalidatePath } from 'next/cache';

// Calendar drag (new start) and stretch (new length): { start, end } as ISO times.
export async function PATCH(req: Request, ctx: RouteContext<'/api/admin/bookings/[id]'>) {
  const { res } = await adminOr401(); if (res) return res;
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const start = new Date(body?.start), end = new Date(body?.end);
    if (Number.isNaN(+start) || Number.isNaN(+end)) return bad('A start and end time are needed.');
    const b = await moveAdminBooking(id, start, end);
    revalidatePath('/admin', 'layout');
    return Response.json({ ok: true, start: b?.start_at, end: b?.end_at });
  } catch (e) { return fail(e); }
}
