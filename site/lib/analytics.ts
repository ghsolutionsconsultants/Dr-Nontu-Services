import { createHash } from 'node:crypto';
import { q } from './db';

const EVENTS = new Set(['page_view', 'service_view', 'cta_click', 'booking_started', 'booking_completed']);

export interface TrackInput {
  event: string; path?: string; service?: string; label?: string; referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string }; sid?: string;
}

const clip = (s: unknown, n: number) => (typeof s === 'string' && s ? s.slice(0, n) : null);

/** First-party, cookie-free analytics. The session id is hashed with a daily salt; no IP is stored. */
export async function track(i: TrackInput, userAgent: string | null) {
  if (!EVENTS.has(i.event)) return;
  const day = new Date().toISOString().slice(0, 10);
  const session = i.sid ? createHash('sha256').update(`${i.sid}:${day}:${process.env.SESSION_SECRET ?? ''}`).digest('hex').slice(0, 24) : null;
  const ua = userAgent ?? '';
  if (/bot|crawl|spider|preview|headless/i.test(ua)) return;
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop';
  let ref = clip(i.referrer, 300);
  try { if (ref) { const u = new URL(ref); ref = u.hostname.replace(/^www\./, ''); } } catch { ref = null; }
  await q(`insert into analytics_events (event, path, service_slug, label, referrer, utm_source, utm_medium, utm_campaign, device, session_hash)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [i.event, clip(i.path, 200) ?? '/', clip(i.service, 80), clip(i.label, 80), ref, clip(i.utm?.source, 80), clip(i.utm?.medium, 80), clip(i.utm?.campaign, 80), device, session]);
}
