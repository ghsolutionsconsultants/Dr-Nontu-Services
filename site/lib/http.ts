import { BookingError } from './booking';

export const bad = (message: string, status = 400, code?: string) => Response.json({ error: message, code }, { status });

/** Turns domain errors into friendly JSON; anything else is a 500 with a generic message. */
export function fail(e: unknown) {
  if (e instanceof BookingError) return bad(e.message, e.code === 'not_found' ? 404 : 409, e.code);
  if (e && typeof e === 'object' && 'issues' in e) {
    const issue = (e as { issues: { message: string }[] }).issues[0];
    return bad(issue?.message ?? 'Please check your details.', 422, 'invalid');
  }
  console.error(e);
  return bad('Something went wrong on our side. Please try again, or WhatsApp us.', 500);
}
