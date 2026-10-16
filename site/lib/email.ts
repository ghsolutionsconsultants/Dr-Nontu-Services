import { q } from './db';
import type { Booking } from './booking';
import { practice, waLink, hasWhatsApp, memberships as PLANS, membershipNote, messageTopics } from './content';
import { ordinal, type Message, type MemberMatch } from './messages';
import type { Membership } from './membership';
import { fmtWhen, rands } from './time';
import { getSetting } from './booking';

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? practice.url;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Mail { to: string; subject: string; html: string; replyTo?: string; attachments?: { filename: string; content: string; content_type?: string }[] }

/** Sends via Resend when RESEND_API_KEY is set. Every message is also kept in the outbox table. */
export async function send(m: Mail) {
  if (!m.to) return; // practice bookings may have no email address (walk-ins, phone patients)
  let sent = false, error: string | null = null;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.MAIL_FROM ?? `Dr Nontu Medical Practice <bookings@drnontu.co.za>`, to: [m.to], subject: m.subject, html: m.html, reply_to: m.replyTo, attachments: m.attachments }),
      });
      sent = r.ok; if (!r.ok) error = await r.text();
    } catch (e) { error = String(e); }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`[mail] → ${m.to} · ${m.subject}`);
  }
  await q(`insert into outbox (to_email, subject, html, sent, error) values ($1,$2,$3,$4,$5)`, [m.to, m.subject, m.html, sent, error]).catch(() => {});
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FDFAF5;font-family:Helvetica,Arial,sans-serif;color:#31310F">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #EAE1CB;border-radius:6px">
  <tr><td style="padding:28px 32px;border-bottom:1px solid #EAE1CB">
    <div style="font-family:Georgia,serif;letter-spacing:3px;font-size:16px">DR NONTU</div>
    <div style="font-size:10px;letter-spacing:4px;color:#8C6119;margin-top:4px">MEDICAL PRACTICE</div></td></tr>
  <tr><td style="padding:32px">
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0 0 16px">${title}</h1>${body}</td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #EAE1CB;font-size:12px;color:#7A5A22">
    ${practice.name} · Practice No. ${practice.practiceNo}<br>${practice.phones.join(' · ')} · ${practice.emails.join(' · ')}</td></tr>
  </table></td></tr></table></body></html>`;
}
const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#31310F;color:#FDFAF5;text-decoration:none;padding:13px 22px;border-radius:999px;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:bold">${label}</a>`;
function details(b: Booking) {
  const row = (k: string, v: string) => `<tr><td style="padding:8px 0;color:#7A5A22;font-size:13px;width:120px">${k}</td><td style="padding:8px 0;font-size:14px">${v}</td></tr>`;
  return `<table role="presentation" width="100%" style="border-top:1px solid #EAE1CB;border-bottom:1px solid #EAE1CB;margin:18px 0">
    ${row('Reference', b.ref)}${row('When', fmtWhen(new Date(b.start_at)))}${row('Length', `${b.duration_minutes} minutes`)}
    ${row('Type', esc(b.type_name ?? b.consult_type))}${row('Where', esc(b.consult_type === 'house_call' ? b.home_address ?? 'Your home' : (b.location_name ?? '') + (b.location_address ? ' · ' + b.location_address : '')))}
    ${row('Fee', rands(b.price_cents) + (b.payment_status === 'paid' ? ' · paid' : b.payment_choice === 'at_visit' ? ' · pay at your visit' : ''))}</table>`;
}

export function ics(b: Booking) {
  const d = (x: Date) => new Date(x).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const where = b.consult_type === 'virtual' ? 'Video consultation' : b.consult_type === 'house_call' ? b.home_address ?? '' : `${b.location_name}, ${b.location_address ?? ''}`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dr Nontu//Bookings//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${b.id}@drnontu.co.za`, `DTSTAMP:${d(new Date())}`, `DTSTART:${d(b.start_at)}`, `DTEND:${d(b.end_at)}`,
    `SUMMARY:Dr Nontu · ${b.type_name ?? 'Consultation'}`, `LOCATION:${where.replace(/,/g, '\\,')}`,
    `DESCRIPTION:Reference ${b.ref}. Manage: ${site()}/manage/${b.manage_token}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

const manage = (b: Booking) => `${site()}/manage/${b.manage_token}`;

export async function mailConfirmed(b: Booking) {
  await send({
    to: b.patient_email, subject: `Booked: ${fmtWhen(new Date(b.start_at))} · ${b.ref}`,
    html: layout(`You're booked, ${esc(b.patient_name.split(' ')[0])}.`,
      `<p style="line-height:1.6">We look forward to seeing you. Here are your details:</p>${details(b)}
       ${b.consult_type === 'virtual' ? '<p style="line-height:1.6">You will receive the video link before your consultation.</p>' : ''}
       <p>${btn(manage(b), 'Manage booking')}</p>
       <p style="font-size:13px;line-height:1.6;color:#7A5A22">Need to talk to us? Call ${practice.phones[0]}${hasWhatsApp ? `, <a href="${waLink()}" style="color:#31310F">WhatsApp us</a>` : ''} or <a href="${site()}/contact?topic=booking#message" style="color:#31310F">send a message</a>.</p>`),
    attachments: [{ filename: 'appointment.ics', content: Buffer.from(ics(b)).toString('base64'), content_type: 'text/calendar' }],
  });
  const notify = await getSetting<string[]>('notify_emails', practice.emails);
  for (const to of notify) await send({ to, subject: `New booking ${b.ref} · ${fmtWhen(new Date(b.start_at))}`,
    html: layout('New booking', `${details(b)}<p style="font-size:14px;line-height:1.6"><b>${esc(b.patient_name)}</b><br>${esc(b.patient_phone)} · ${esc(b.patient_email)}${b.reason ? `<br><br>${esc(b.reason)}` : ''}</p>`) });
}

export async function mailCancelled(b: Booking) {
  await send({ to: b.patient_email, subject: `Cancelled: ${b.ref}`,
    html: layout('Your booking is cancelled', `${details(b)}${b.payment_status === 'refund_pending' ? '<p style="line-height:1.6">Your payment will be refunded to the original payment method.</p>' : ''}<p>${btn(site() + '/book', 'Book another time')}</p>`) });
}

export async function mailRescheduled(b: Booking) {
  await send({ to: b.patient_email, subject: `Moved: ${fmtWhen(new Date(b.start_at))} · ${b.ref}`,
    html: layout('Your booking has moved', `${details(b)}<p>${btn(manage(b), 'Manage booking')}</p>`),
    attachments: [{ filename: 'appointment.ics', content: Buffer.from(ics(b)).toString('base64'), content_type: 'text/calendar' }] });
}

export async function mailPaymentLink(b: Booking) {
  await send({ to: b.patient_email, subject: `Payment for your visit · ${b.ref}`,
    html: layout('Pay for your visit', `<p style="line-height:1.6">You can pay securely online now. It takes a minute.</p>${details(b)}<p>${btn(`${site()}/manage/${b.manage_token}?pay=1`, `Pay ${rands(b.price_cents)}`)}</p>`) });
}

export async function mailReminder(b: Booking) {
  await send({ to: b.patient_email, subject: `Tomorrow: ${fmtWhen(new Date(b.start_at))}`,
    html: layout('See you tomorrow', `${details(b)}<p style="line-height:1.6">Please bring your ID, medical aid card and a list of your current medication.</p><p>${btn(manage(b), 'Manage booking')}</p>`) });
}

/* ── membership ── */

const planOf = (m: Membership) => PLANS.find((p) => p.id === m.plan)!;
function memberDetails(m: Membership) {
  const p = planOf(m);
  return `<table role="presentation" width="100%" style="border-top:1px solid #EAE1CB;border-bottom:1px solid #EAE1CB;margin:18px 0">
    <tr><td style="padding:8px 0;color:#7A5A22;font-size:13px;width:120px">Plan</td><td style="padding:8px 0;font-size:14px">${p.name} · ${p.label}</td></tr>
    <tr><td style="padding:8px 0;color:#7A5A22;font-size:13px">Monthly</td><td style="padding:8px 0;font-size:14px">${rands(m.price_cents)}</td></tr>
    <tr><td style="padding:8px 0;color:#7A5A22;font-size:13px;vertical-align:top">Includes</td><td style="padding:8px 0;font-size:14px;line-height:1.6">${p.benefits.map(esc).join('<br>')}</td></tr></table>`;
}
const memberLink = (m: Membership) => `${site()}/membership/${m.manage_token}`;

export async function mailMembershipWelcome(m: Membership) {
  await send({ to: m.email, subject: `Welcome to ${planOf(m).name} membership`,
    html: layout(`Welcome, ${esc(m.name.split(' ')[0])}.`,
      `<p style="line-height:1.6">Your ${planOf(m).name} membership is active. ${rands(m.price_cents)} is charged to your card every month; you can update your card or cancel at any time.</p>${memberDetails(m)}
       <p style="line-height:1.6">To send a brief, non-urgent medical query, use the <a href="${site()}/contact?topic=member#message" style="color:#31310F">message form</a>${hasWhatsApp ? `, <a href="${waLink('Hi, I am a member and have a brief medical query.')}" style="color:#31310F">WhatsApp us</a>` : ''} or email ${practice.emails.join(' or ')} from this email address, so that we know it&rsquo;s you.</p>
       <p>${btn(memberLink(m), 'Manage membership')}</p><p style="font-size:12px;color:#7A5A22;line-height:1.6">${esc(membershipNote)} In an emergency, call 112 or 10177.</p>`) });
  const notify = await getSetting<string[]>('notify_emails', practice.emails);
  for (const to of notify) await send({ to, subject: `New ${planOf(m).name} member: ${m.name}`,
    html: layout(`New ${planOf(m).name} member`, `${memberDetails(m)}<p style="font-size:14px;line-height:1.6"><b>${esc(m.name)}</b><br>${esc(m.phone)} · ${esc(m.email)}</p>`) });
}

export async function mailMembershipCancelled(m: Membership) {
  await send({ to: m.email, subject: `Your ${planOf(m).name} membership is cancelled`,
    html: layout('Membership cancelled', `<p style="line-height:1.6">No further payments will be taken. Thank you for being a member; you are welcome back any time.</p>${memberDetails(m)}<p>${btn(site() + '/care-plans', 'View plans')}</p>`) });
}

/* ── contact form ── */

const topicLabel = (t: string) => messageTopics.find((x) => x.id === t)?.label ?? t;
function memberLine(member: MemberMatch | null, topic: string) {
  if (!member) return topic === 'member' ? 'No active membership found for this email address.' : '';
  const plan = PLANS.find((p) => p.id === member.plan)!;
  if (topic !== 'member') return `${plan.name} member.`;
  return `${plan.name} member · ${ordinal(member.used)} query this month (plan includes ${member.allowance})${member.used > member.allowance ? ' · over allowance' : ''}.`;
}

/** To the practice: reply goes straight to the patient. */
export async function mailMessage(msg: Message, member: MemberMatch | null) {
  const line = memberLine(member, msg.topic);
  const notify = await getSetting<string[]>('notify_emails', practice.emails);
  const subject = `${msg.topic === 'member' && member ? 'Member query' : topicLabel(msg.topic)} from ${msg.name}`;
  for (const to of notify) await send({ to, replyTo: msg.email, subject,
    html: layout(esc(topicLabel(msg.topic)), `${line ? `<p style="font-size:13px;color:#8C6119;margin:0 0 14px">${esc(line)}</p>` : ''}
      <p style="font-size:14px;line-height:1.6"><b>${esc(msg.name)}</b><br>${esc(msg.phone)} · ${esc(msg.email)}</p>
      <div style="border-top:1px solid #EAE1CB;border-bottom:1px solid #EAE1CB;padding:16px 0;margin:16px 0;font-size:15px;line-height:1.65;white-space:pre-wrap">${esc(msg.body)}</div>
      <p>${btn(`${site()}/admin/messages`, 'Open messages')}</p><p style="font-size:12px;color:#7A5A22">Reply to this email to answer ${esc(msg.name.split(' ')[0])} directly.</p>`) });
}

/** To the patient: a receipt only (their message is not echoed back). */
export async function mailMessageReceived(msg: Message) {
  await send({ to: msg.email, subject: 'We have your message',
    html: layout(`Thank you, ${esc(msg.name.split(' ')[0].slice(0, 40))}.`,
      `<p style="line-height:1.6">Your message has reached the practice and we will get back to you by phone or email.</p>
       <p style="font-size:13px;line-height:1.6;color:#7A5A22">If your symptoms get worse, please call us on ${practice.phones[0]}. In an emergency, call 112 or 10177.</p>`) });
}
