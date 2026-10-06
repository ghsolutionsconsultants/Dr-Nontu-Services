import { adminOr401 } from '@/lib/auth';
import { q } from '@/lib/db';

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => { const s = v instanceof Date ? v.toISOString() : v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
};

export async function GET(_req: Request, ctx: RouteContext<'/api/admin/export/[kind]'>) {
  const { res } = await adminOr401(); if (res) return res;
  const { kind } = await ctx.params;
  const rows = kind === 'payments'
    ? await q(`select p.paid_at, p.created_at, b.ref booking, b.patient_name, p.provider, p.channel, p.reference, round(p.amount_cents / 100.0, 2) amount_zar, p.status from payments p join bookings b on b.id = p.booking_id order by p.created_at desc`)
    : kind === 'bookings'
      ? await q(`select b.ref, b.start_at, b.consult_type, l.name location, b.duration_minutes, round(b.price_cents / 100.0, 2) fee_zar, b.status, b.payment_choice, b.payment_status, b.patient_name, b.patient_email, b.patient_phone, b.medical_aid, s.name service, b.created_at from bookings b join locations l on l.id = b.location_id left join services s on s.id = b.service_id where b.status <> 'expired' order by b.start_at desc`)
      : null;
  if (!rows) return new Response('Not found', { status: 404 });
  return new Response('﻿' + csv(rows as Record<string, unknown>[]), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="drnontu-${kind}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
