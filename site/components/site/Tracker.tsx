'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const sid = () => {
  try {
    let s = sessionStorage.getItem('dn-sid');
    if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('dn-sid', s); }
    return s;
  } catch { return undefined; }
};
export function track(event: string, data: Record<string, unknown> = {}) {
  const u = new URL(location.href);
  const body = JSON.stringify({
    event, path: location.pathname, sid: sid(), referrer: document.referrer,
    utm: { source: u.searchParams.get('utm_source') ?? undefined, medium: u.searchParams.get('utm_medium') ?? undefined, campaign: u.searchParams.get('utm_campaign') ?? undefined },
    ...data,
  });
  if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
  else fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
}

/** Page views, service interest and CTA clicks: first-party, no cookies. */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    track('page_view');
    const m = pathname.match(/^\/services\/([^/]+)/);
    if (m) track('service_view', { service: m[1] });
  }, [pathname]);
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLElement>('[data-track], a[href^="tel:"], a[href*="wa.me"]');
      if (!a) return;
      const label = a.dataset.track ?? (a.getAttribute('href')!.startsWith('tel:') ? 'call' : 'whatsapp');
      track('cta_click', { label, service: a.dataset.service });
    };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, []);
  return null;
}
