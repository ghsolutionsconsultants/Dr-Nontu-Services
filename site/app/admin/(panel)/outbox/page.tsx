import Link from 'next/link';
import { q } from '@/lib/db';
import { Head } from '@/components/admin/ui';
import { fmtShort, fmtTime } from '@/lib/time';

export const metadata = { title: 'Emails sent' };

export default async function Outbox(props: PageProps<'/admin/outbox'>) {
  const sp = await props.searchParams;
  const rows = await q<{ id: number; to_email: string; subject: string; html: string; sent: boolean; error: string | null; created_at: Date }>(`select * from outbox order by id desc limit 100`);
  const sel = rows.find((r) => String(r.id) === sp.id) ?? rows[0];
  return (
    <>
      <Head eyebrow="Emails" title="Emails sent by the system" />
      {!process.env.RESEND_API_KEY && <div className="flash">No email provider is connected yet, so messages are kept here instead of being delivered. Add a Resend API key to send them.</div>}
      <div className="grid grid-2">
        <div className="card"><div className="tbl-wrap">
          {rows.length === 0 ? <p className="empty-s">No emails yet.</p> : <table className="tbl"><tbody>{rows.map((r) => (
            <tr key={r.id} style={r.id === sel?.id ? { background: 'var(--linen)' } : undefined}>
              <td><Link href={`/admin/outbox?id=${r.id}`}>{r.subject}</Link><br /><small className="muted">{r.to_email}</small></td>
              <td className="num tnum"><small>{fmtShort(new Date(r.created_at))} {fmtTime(new Date(r.created_at))}</small><br /><span className={`badge-s ${r.sent ? 's-paid' : r.error ? 's-failed' : 's-pending_payment'}`}>{r.sent ? 'Delivered' : r.error ? 'Failed' : 'Not sent'}</span></td>
            </tr>
          ))}</tbody></table>}
        </div></div>
        {sel && <div className="card"><h2>{sel.subject}</h2><iframe className="mail-frame" srcDoc={sel.html} title="Email preview" sandbox="" /></div>}
      </div>
    </>
  );
}
