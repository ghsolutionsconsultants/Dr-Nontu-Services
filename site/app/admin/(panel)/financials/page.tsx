import { financials } from '@/lib/admin-data';
import { Head } from '@/components/admin/ui';
import { Donut, RevenueChart } from '@/components/admin/Charts';
import { rands } from '@/lib/time';

export const metadata = { title: 'Financials' };

export default async function Financials(props: PageProps<'/admin/financials'>) {
  const sp = await props.searchParams;
  const months = Number(sp.months) || 12;
  const f = await financials(months);
  const net = f.totals.revenue;
  return (
    <>
      <Head eyebrow="Financials" title="Revenue & outstanding">
        <form className="adm-actions"><select className="sel" name="months" defaultValue={String(months)}><option value="1">Last month</option><option value="3">Last 3 months</option><option value="12">Last 12 months</option><option value="36">Last 3 years</option></select><button className="b b--ghost">Update</button></form>
        <a className="b b--ghost" href="/api/admin/export/payments">Export CSV</a>
      </Head>
      <div className="grid grid-4">
        <div className="card kpi"><small>Revenue</small><b>{rands(net)}</b><span>{f.totals.count} payments</span></div>
        <div className="card kpi"><small>Refunded</small><b>{rands(f.totals.refunded)}</b><span>returned to patients</span></div>
        <div className="card kpi"><small>Outstanding</small><b>{rands(f.outstanding.s)}</b><span>{f.outstanding.c} past visit{f.outstanding.c === 1 ? '' : 's'} unpaid</span></div>
        <div className="card kpi"><small>Average fee</small><b>{rands(f.avgFee)}</b><span>per booking</span></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}><h2>Revenue by month</h2><RevenueChart data={f.byMonth} /></div>
      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <div className="card"><h2>By consultation type</h2><Donut data={f.byType} /></div>
        <div className="card"><h2>By location</h2><Donut data={f.byLocation} /></div>
        <div className="card"><h2>By payment method</h2><Donut data={f.byChannel.map((c) => ({ ...c, k: ({ card: 'Card', eft: 'Instant EFT', apple_pay: 'Apple Pay', cash: 'Cash', card_machine: 'Card machine', medical_aid: 'Medical aid', bank_transfer: 'Bank transfer' } as Record<string, string>)[c.k] ?? c.k }))} /></div>
      </div>
    </>
  );
}
