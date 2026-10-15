import { q } from '@/lib/db';
import { Flash, Head } from '@/components/admin/ui';
import { fmtShort, fmtTime } from '@/lib/time';
import { memberships as PLANS, messageTopics, tel } from '@/lib/content';
import { ordinal } from '@/lib/messages';
import { messageAction } from '../../actions';

export const metadata = { title: 'Messages' };

const VIEWS = { open: 'Open', handled: 'Handled', all: 'All' } as const;
type View = keyof typeof VIEWS;
const MONTH = `date_trunc('month', now() at time zone 'Africa/Johannesburg')`;

export default async function Messages(props: PageProps<'/admin/messages'>) {
  const sp = await props.searchParams;
  const view: View = typeof sp.view === 'string' && sp.view in VIEWS ? (sp.view as View) : 'open';
  const [rows, [k]] = await Promise.all([
    // nth = which member query of that calendar month this was, counted over every message (not just this view)
    q<{ id: string; topic: string; name: string; email: string; phone: string; body: string; plan: string | null; nth: number; handled_at: Date | null; created_at: Date }>(
      `with x as (
         select m.*, ms.plan, row_number() over (partition by m.membership_id, m.topic, date_trunc('month', m.created_at at time zone 'Africa/Johannesburg') order by m.created_at)::int nth
         from messages m left join memberships ms on ms.id = m.membership_id)
       select id, topic, name, email, phone, body, plan, nth, handled_at, created_at from x
       ${view === 'all' ? '' : `where handled_at is ${view === 'open' ? '' : 'not '}null`} order by created_at desc limit 300`),
    q<{ open: number; month: number; member: number }>(
      `select count(*) filter (where handled_at is null)::int as open,
              count(*) filter (where (created_at at time zone 'Africa/Johannesburg') >= ${MONTH})::int as month,
              count(*) filter (where topic = 'member' and membership_id is not null and (created_at at time zone 'Africa/Johannesburg') >= ${MONTH})::int as member
       from messages`),
  ]);
  const topic = (t: string) => messageTopics.find((x) => x.id === t)?.label ?? t;
  return (
    <>
      <Head eyebrow="Inbox" title="Messages" />
      <Flash sp={sp} />
      <div className="grid grid-3">
        <div className="card kpi"><small>Open</small><b>{k?.open ?? 0}</b><span>waiting for a reply</span></div>
        <div className="card kpi"><small>This month</small><b>{k?.month ?? 0}</b><span>messages received</span></div>
        <div className="card kpi"><small>Member queries</small><b>{k?.member ?? 0}</b><span>this month</span></div>
      </div>
      <form className="filters" style={{ marginTop: 18 }}>
        <select className="sel" name="view" defaultValue={view}>{Object.entries(VIEWS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button className="b b--ghost">Show</button>
      </form>
      <div className="card"><div className="tbl-wrap">
        {rows.length === 0 ? <p className="empty-s">{view === 'open' ? 'Nothing waiting. New messages from the website appear here and are emailed to you.' : 'No messages here yet.'}</p> : (
          <table className="tbl">
            <thead><tr><th>Received</th><th>From</th><th>Message</th><th /></tr></thead>
            <tbody>{rows.map((m) => {
              const plan = PLANS.find((p) => p.id === m.plan);
              const counted = m.topic === 'member' && plan;
              const act = messageAction.bind(null, m.id);
              return (
                <tr key={m.id} className={`msg-row${m.handled_at ? ' done' : ''}`}>
                  <td className="tnum" style={{ whiteSpace: 'nowrap' }}>{fmtShort(new Date(m.created_at))}<br /><small className="muted">{fmtTime(new Date(m.created_at))}</small></td>
                  <td>{m.name}<br /><small className="muted"><a href={tel(m.phone)}>{m.phone}</a> · <a href={`mailto:${m.email}`}>{m.email}</a></small></td>
                  <td>
                    <span className="msg-meta">{topic(m.topic)}
                      {plan && <> · {plan.name} member</>}
                      {counted && <span className={m.nth > plan.queries ? ' msg-over' : ''}> · {ordinal(m.nth)} query this month (includes {plan.queries})</span>}
                      {m.topic === 'member' && !plan && <span className="msg-over"> · no active membership for this email</span>}
                    </span>
                    <p className="msg-body">{m.body}</p>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <a className="b b--ghost" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Dr Nontu Medical Practice')}`}>Reply</a>{' '}
                    <form action={act} style={{ display: 'inline' }}>
                      <input type="hidden" name="op" value={m.handled_at ? 'open' : 'handled'} /><input type="hidden" name="view" value={view} />
                      <button className="b">{m.handled_at ? 'Reopen' : 'Done'}</button>
                    </form>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
