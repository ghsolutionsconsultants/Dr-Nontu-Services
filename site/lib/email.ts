import { q } from './db';
import type { Booking } from './booking';
import { practice, waLink } from './content';
import { fmtWhen, rands } from './time';
import { getSetting } from './booking';

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? practice.url;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Mail { to: string; subject: string; html: string; attachments?: { filename: string; content: string; content_type?: string }[] }

/** Sends via Resend when RESEND_API_KEY is set. Every message is also kept in the outbox table. */
export async function send(m: Mail) {
  let sent = false, error: string | null = null;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.MAIL_FROM ?? `Dr Nontu Medical Practice <bookings@drnontu.co.za>`, to: [m.to], subject: m.subject, html: m.html, attachments: m.attachments }),
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
    ${practice.name} · Practice No. ${practice.practiceNo}<br>${practice.phones.join(' · ')} · ${practice.email}</td></tr>
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
       <p style="font-size:13px;line-height:1.6;color:#7A5A22">Need to talk to us? <a href="${waLink()}" style="color:#31310F">WhatsApp</a> or call ${practice.phones[0]}.</p>`),
    attachments: [{ filename: 'appointment.ics', content: Buffer.from(ics(b)).toString('base64'), content_type: 'text/calendar' }],
  });
  const notify = await getSetting<string[]>('notify_emails', [practice.email]);
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
