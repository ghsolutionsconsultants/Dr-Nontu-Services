import { MembershipInput, startMembership } from '@/lib/membership';
import { fail } from '@/lib/http';

// Start a membership: a pending record plus checkout for the first month (recurring monthly on Paystack).
export async function POST(req: Request) {
  try {
    const input = MembershipInput.parse(await req.json());
    return Response.json({ next: await startMembership(input) });
  } catch (e) { return fail(e); }
}
