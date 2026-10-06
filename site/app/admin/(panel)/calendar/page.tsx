import Link from 'next/link';
import { Head } from '@/components/admin/ui';
import { AdminCalendar } from '@/components/admin/Calendar';

export const metadata = { title: 'Calendar' };

export default function CalendarPage() {
  return (
    <>
      <Head eyebrow="Calendar" title="Appointments">
        <div className="legend">
          <span><i style={{ background: 'var(--ink)' }} />In person</span>
          <span><i style={{ background: 'var(--brass)' }} />House call</span>
          <span><i style={{ background: 'var(--moss)' }} />Virtual</span>
          <span><i style={{ background: 'repeating-linear-gradient(45deg,var(--linen-2) 0 4px,#fff 4px 8px)', border: '1px dashed var(--rule-strong)' }} />Blocked</span>
        </div>
        <Link className="b b--ghost" href="/admin/availability">Block time</Link>
        <Link className="b" href="/admin/bookings/new">New booking</Link>
      </Head>
      <p className="muted" style={{ marginTop: -12, marginBottom: 18, fontSize: '.88rem' }}>Click an appointment to open it, or click an empty time to book someone in. Striped appointments are waiting for online payment.</p>
      <AdminCalendar />
    </>
  );
}
