import { q, one } from './db';
import { dateKey, fromSast, addDays } from './time';

// Dates are grouped in SAST (UTC+2, no DST) with plain offset arithmetic, so results match on PGlite and Supabase.
const SAST = `interval '2 hours'`;
const n = (v: unknown) => Number(v ?? 0);

export async function overview() {
  const today = dateKey(new Date());
  const [t0, t1] = [fromSast(today, 0), fromSast(addDays(today, 1), 0)];
  const weekStart = fromSast(addDays(today, -((new Date(today).getUTCDay() + 6) % 7)), 0);
  const monthStart = fromSast(today.slice(0, 8) + '01', 0);
  const [todayRows, week, mtd, unpaid, refunds, upcoming, services, interest, placeholder] = await Promise.all([
    q<{ c: number }>(`select count(*)::int c from bookings where status in ('confirmed','completed','pending_payment') and start_at >= $1 and start_at < $2`, [t0, t1]),
    q<{ c: number }>(`select count(*)::int c from bookings where status in ('confirmed','completed') and created_at >= $1`, [weekStart]),
    q<{ s: number }>(`select coalesce(sum(amount_cents),0)::int s from payments where status = 'success' and paid_at >= $1`, [monthStart]),
    q<{ s: number; c: number }>(`select coalesce(sum(price_cents),0)::int s, count(*)::int c from bookings where status in ('confirmed','completed') and payment_status = 'unpaid'`),
    q<{ c: number }>(`select count(*)::int c from bookings where payment_status = 'refund_pending'`),
    q<{ id: string; ref: string; start_at: Date; patient_name: string; consult_type: string; duration_minutes: number; status: string; payment_status: string; location_name: string }>(
      `select b.id, b.ref, b.start_at, b.patient_name, b.consult_type, b.duration_minutes, b.status, b.payment_status, l.name location_name
       from bookings b join locations l on l.id = b.location_id where b.status in ('confirmed','pending_payment') and b.start_at >= now() order by b.start_at limit 8`),
    q<{ name: string; c: number }>(`select coalesce(s.name, 'Not specified') name, count(*)::int c from bookings b left join services s on s.id = b.service_id
       where b.created_at > now() - interval '30 days' and b.status not in ('expired') group by 1 order by 2 desc limit 6`),
    q<{ slug: string; c: number }>(`select service_slug slug, count(*)::int c from analytics_events where event = 'service_view' and ts > now() - interval '30 days' and service_slug is not null group by 1 order by 2 desc limit 6`),
    one<{ value: boolean }>(`select value from settings where key = 'fees_are_placeholder'`),
  ]);
  return {
    today: n(todayRows[0]?.c), week: n(week[0]?.c), mtd: n(mtd[0]?.s), unpaid: n(unpaid[0]?.s), unpaidCount: n(unpaid[0]?.c), refunds: n(refunds[0]?.c),
    upcoming, services, interest, feesPlaceholder: placeholder?.value === true,
  };
}

export async function financials(months = 12) {
  const since = `now() - interval '${Math.max(1, Math.min(36, months))} months'`;
  const [byMonth, byType, byLocation, byChannel, totals, outstanding, avg] = await Promise.all([
    q<{ m: string; online: number; visit: number; refunded: number }>(
      `select to_char(date_trunc('month', p.paid_at + ${SAST}), 'YYYY-MM') m,
        coalesce(sum(case when p.status = 'success' and p.provider <> 'at_visit' then p.amount_cents end),0)::int online,
        coalesce(sum(case when p.status = 'success' and p.provider = 'at_visit' then p.amount_cents end),0)::int visit,
        coalesce(sum(case when p.status = 'refunded' then p.amount_cents end),0)::int refunded
       from payments p where p.paid_at > ${since} group by 1 order by 1`),
    q<{ k: string; s: number; c: number }>(`select ct.name k, coalesce(sum(p.amount_cents),0)::int s, count(distinct b.id)::int c from payments p join bookings b on b.id = p.booking_id join consult_types ct on ct.id = b.consult_type where p.status = 'success' and p.paid_at > ${since} group by 1 order by 2 desc`),
    q<{ k: string; s: number }>(`select l.name k, coalesce(sum(p.amount_cents),0)::int s from payments p join bookings b on b.id = p.booking_id join locations l on l.id = b.location_id where p.status = 'success' and p.paid_at > ${since} group by 1 order by 2 desc`),
    q<{ k: string; s: number }>(`select coalesce(p.channel, p.provider) k, coalesce(sum(p.amount_cents),0)::int s from payments p where p.status = 'success' and p.paid_at > ${since} group by 1 order by 2 desc`),
    q<{ revenue: number; refunded: number; count: number }>(`select coalesce(sum(case when status='success' then amount_cents end),0)::int revenue, coalesce(sum(case when status='refunded' then amount_cents end),0)::int refunded, count(*) filter (where status='success')::int count from payments where paid_at > ${since}`),
    q<{ s: number; c: number }>(`select coalesce(sum(price_cents),0)::int s, count(*)::int c from bookings where status in ('confirmed','completed') and payment_status = 'unpaid' and start_at < now()`),
    q<{ a: number }>(`select coalesce(avg(price_cents),0)::int a from bookings where status in ('confirmed','completed') and created_at > ${since}`),
  ]);
  return { byMonth, byType, byLocation, byChannel, totals: totals[0], outstanding: outstanding[0], avgFee: n(avg[0]?.a) };
}

export async function analytics(days = 30) {
  const d = Math.max(1, Math.min(365, days));
  const since = `now() - interval '${d} days'`;
  const [daily, pages, refs, devices, ctas, funnel, interest, booked] = await Promise.all([
    q<{ day: string; views: number; visitors: number }>(`select to_char((ts + ${SAST})::date, 'YYYY-MM-DD') as day, count(*) filter (where event='page_view')::int views, count(distinct session_hash) filter (where event='page_view')::int visitors from analytics_events where ts > ${since} group by 1 order by 1`),
    q<{ k: string; c: number }>(`select path k, count(*)::int c from analytics_events where event='page_view' and ts > ${since} group by 1 order by 2 desc limit 10`),
    q<{ k: string; c: number }>(`select coalesce(utm_source, referrer, 'Direct') k, count(distinct session_hash)::int c from analytics_events where event='page_view' and ts > ${since} group by 1 order by 2 desc limit 8`),
    q<{ k: string; c: number }>(`select coalesce(device,'unknown') k, count(distinct session_hash)::int c from analytics_events where event='page_view' and ts > ${since} group by 1 order by 2 desc`),
    q<{ k: string; c: number }>(`select coalesce(label,'other') k, count(*)::int c from analytics_events where event='cta_click' and ts > ${since} group by 1 order by 2 desc limit 10`),
    q<{ visitors: number; started: number; completed: number }>(`select count(distinct session_hash) filter (where event='page_view')::int visitors, count(distinct session_hash) filter (where event='booking_started')::int started, count(distinct session_hash) filter (where event='booking_completed')::int completed from analytics_events where ts > ${since}`),
    q<{ slug: string; views: number; clicks: number }>(`select service_slug slug, count(*) filter (where event='service_view')::int views, count(*) filter (where event='cta_click')::int clicks from analytics_events where service_slug is not null and ts > ${since} group by 1`),
    q<{ slug: string; c: number }>(`select s.slug, count(*)::int c from bookings b join services s on s.id = b.service_id where b.created_at > ${since} and b.status not in ('expired') group by 1`),
  ]);
  return { daily, pages, refs, devices, ctas, funnel: funnel[0], interest, booked };
}

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show', expired: 'Expired',
  unpaid: 'Unpaid', paid: 'Paid', refund_pending: 'Refund due', refunded: 'Refunded', success: 'Paid', initialized: 'Started', failed: 'Failed',
};
