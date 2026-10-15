import { notFound } from 'next/navigation';
import { membershipByToken, planById } from '@/lib/membership';
import { MemberActions } from '@/components/membership/MemberActions';
import { fmtDate, rands } from '@/lib/time';
import { membershipNote, waLink } from '@/lib/content';
import { WhatsAppIcon } from '@/components/site/Icon';

export const metadata = { title: 'Your membership', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { pending: 'Awaiting first payment', active: 'Active', non_renewing: 'Ends at the end of this month', past_due: 'Payment failed: please update your card', cancelled: 'Cancelled' };

export default async function MembershipPage(props: PageProps<'/membership/[token]'>) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const m = await membershipByToken(token);
  if (!m) notFound();
  const p = planById(m.plan)!;
  const live = ['active', 'past_due', 'non_renewing'].includes(m.status);
  return (
    <section className="section page-fade" style={{ paddingTop: 'calc(var(--hdr-h) + clamp(48px,7vw,96px))', minHeight: '90vh' }}>
      <div className="wrap g12">
        <div className="c1-8">
          <span className="eyebrow">{p.name} membership · {STATUS[m.status] ?? m.status}</span>
          <h1 className="display" style={{ fontSize: 'var(--step-4)', margin: '18px 0 0' }}>
            {sp.welcome && m.status === 'active' ? <>Welcome, <em>{m.name.split(' ')[0]}.</em></> : <>Hello, <em>{m.name.split(' ')[0]}.</em></>}
          </h1>
          {sp.payment === 'failed' && <p className="notice notice--error" style={{ marginTop: 24 }}>Your payment didn&rsquo;t go through, so the membership hasn&rsquo;t started. You can try again from the plans page.</p>}
          <p className="lede" style={{ marginTop: 18 }}>
            {m.status === 'active' ? <>Your membership is active. Have a brief, non-urgent medical query? Send it on WhatsApp or by email; that&rsquo;s what your membership is for.</> :
              m.status === 'cancelled' ? <>This membership is cancelled and no further payments will be taken.</> : <>{STATUS[m.status]}.</>}
          </p>
          <div className="ctas">
            {m.status === 'active' && <a className="btn" href={waLink('Hi, I am a member and have a brief medical query.')}><WhatsAppIcon /> Send a query</a>}
            <MemberActions token={token} live={live} />
          </div>
        </div>
        <aside className="c9-12">
          <div className="summary" style={{ borderRadius: 8 }}>
            <h4>{p.name} · {p.label}</h4>
            <div className="sum-row"><span>Monthly</span><span className="tnum">{rands(m.price_cents)}</span></div>
            {m.started_at && <div className="sum-row"><span>Member since</span><span>{fmtDate(new Date(m.started_at))}</span></div>}
            {live && m.next_payment_at && <div className="sum-row"><span>Next payment</span><span>{fmtDate(new Date(m.next_payment_at))}</span></div>}
            <p style={{ fontSize: '.8rem', margin: '14px 0 0', color: 'color-mix(in srgb,var(--linen) 60%,var(--ink))' }}>{membershipNote}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
