import { MessageInput, saveMessage } from '@/lib/messages';
import { mailMessage, mailMessageReceived } from '@/lib/email';
import { fail } from '@/lib/http';

// Contact form: saved for the admin inbox, emailed to the practice, and a receipt to the sender.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // hidden field that people never see; bots fill it in
    if (typeof body?.website === 'string' && body.website.trim()) return Response.json({ ok: true });
    const { message, member } = await saveMessage(MessageInput.parse(body));
    await Promise.all([mailMessage(message, member), mailMessageReceived(message)]);
    // membership details stay with the practice: anyone can type any email address into this form
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
