'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
const LINKS: [string, string, React.ReactNode][] = [
  ['/admin', 'Overview', I('M3 12h4l2-5 4 10 2-5h6')],
  ['/admin/calendar', 'Calendar', I('M4 6h16v14H4zM4 10h16M9 3v4M15 3v4')],
  ['/admin/bookings', 'Bookings', I('M5 4h14v16H5zM9 9h6M9 13h6M9 17h3')],
  ['/admin/availability', 'Availability', I('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2')],
  ['/admin/fees', 'Fees & lengths', I('M12 3v18M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7')],
  ['/admin/payments', 'Payments', I('M3 7h18v12H3zM3 11h18M7 15h4')],
  ['/admin/financials', 'Financials', I('M4 20V10M10 20V4M16 20v-7M22 20H2')],
  ['/admin/analytics', 'Site stats', I('M3 17l5-5 4 4 8-8M15 8h5v5')],
  ['/admin/seo', 'SEO', I('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-5-5')],
  ['/admin/outbox', 'Emails sent', I('M3 6h18v12H3zM3 7l9 7 9-7')],
  ['/admin/settings', 'Settings', I('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12l2-1-2-4-2 .5-1.5-1.5L16 4l-4-1-1 2H9L8 3 4 5l.5 2L3 8.5 1 9.5v4l2 1 .5 1.5-.5 2 4 2 1-2h2l1 2 4-1-.5-2 1.5-1.5 2 .5Z')],
];

export function AdminNav() {
  const p = usePathname();
  return (
    <nav className="adm-nav">
      {LINKS.map(([href, label, icon], i) => (
        <span key={href} style={{ display: 'contents' }}>
          {(i === 5 || i === 9) && <hr />}
          <Link href={href} aria-current={(href === '/admin' ? p === href : p.startsWith(href)) ? 'page' : undefined}>{icon}<span>{label}</span></Link>
        </span>
      ))}
    </nav>
  );
}
