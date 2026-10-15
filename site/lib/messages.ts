import { z } from 'zod';
import { one } from './db';
import { memberships as PLANS, type MessageTopic } from './content';
import { BookingError } from './booking';
import type { PlanId } from './membership';

export const MessageInput = z.object({
  topic: z.enum(['general', 'booking', 'member']),
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().regex(/^[+0-9 ()-]{9,20}$/, 'Please enter a valid phone number'),
  message: z.string().trim().min(5, 'Please write your message').max(4000, 'Please keep your message under 4,000 characters'),
  consent: z.literal(true, { message: 'Please agree to the privacy notice so that we can reply' }),
});

export interface Message {
  id: string; topic: MessageTopic; name: string; email: string; phone: string; body: string;
  membership_id: string | null; handled_at: Date | null; created_at: Date;
}
/** The sender's current membership, and how many member queries they have sent this calendar month (SAST). */
export interface MemberMatch { id: string; plan: PlanId; allowance: number; used: number }

const PER_HOUR = 5;
const LIVE = `status in ('active','non_renewing','past_due')`;
const THIS_MONTH = `(created_at at time zone 'Africa/Johannesburg') >= date_trunc('month', now() at time zone 'Africa/Johannesburg')`;

export async function memberFor(email: string): Promise<Omit<MemberMatch, 'used'> | null> {
  const m = await one<{ id: string; plan: PlanId }>(
    `select id, plan from memberships where lower(email) = lower($1) and ${LIVE} order by started_at desc nulls last limit 1`, [email]);
  return m ? { ...m, allowance: PLANS.find((p) => p.id === m.plan)?.queries ?? 0 } : null;
}

/** Saves a contact-form message, linked to the sender's membership when their email matches one. */
export async function saveMessage(input: z.infer<typeof MessageInput>): Promise<{ message: Message; member: MemberMatch | null }> {
  const recent = await one<{ n: number }>(`select count(*)::int n from messages where lower(email) = lower($1) and created_at > now() - interval '1 hour'`, [input.email]);
  if ((recent?.n ?? 0) >= PER_HOUR) throw new BookingError('too_many', 'You have sent several messages in the last hour. We have them all and will be in touch soon.');
  const m = await memberFor(input.email);
  const message = (await one<Message>(
    `insert into messages (topic, name, email, phone, body, membership_id, consent_at) values ($1,$2,$3,$4,$5,$6, now()) returning *`,
    [input.topic, input.name, input.email, input.phone, input.message, m?.id ?? null]))!;
  if (!m) return { message, member: null };
  const used = await one<{ n: number }>(`select count(*)::int n from messages where membership_id = $1 and topic = 'member' and ${THIS_MONTH}`, [m.id]);
  return { message, member: { ...m, used: used?.n ?? 0 } };
}

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
