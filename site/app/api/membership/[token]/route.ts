import { z } from 'zod';
import { cancelMembership, cardUpdateLink, membershipByToken } from '@/lib/membership';
import { mailMembershipCancelled } from '@/lib/email';
import { bad, fail } from '@/lib/http';

export async function POST(req: Request, ctx: RouteContext<'/api/membership/[token]'>) {
  try {
    const { token } = await ctx.params;
    const m = await membershipByToken(token);
    if (!m) return bad('Membership not found.', 404);
    const { action } = z.object({ action: z.enum(['cancel', 'card']) }).parse(await req.json());
    if (action === 'card') {
      const url = await cardUpdateLink(m);
      return url ? Response.json({ url }) : bad('Card updates are available once your first payment has been processed by Paystack.', 409);
    }
    const u = await cancelMembership(m);
    await mailMembershipCancelled(u);
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
