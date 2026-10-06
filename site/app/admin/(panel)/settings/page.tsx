import { getSetting, bookingSettings } from '@/lib/booking';
import { changePassword, saveSettings } from '../../actions';
import { Flash, Head } from '@/components/admin/ui';
import { paymentMode } from '@/lib/payments';
import { practice } from '@/lib/content';

export const metadata = { title: 'Settings' };

export default async function Settings(props: PageProps<'/admin/settings'>) {
  const sp = await props.searchParams;
  const [b, notify, areas] = await Promise.all([bookingSettings(), getSetting<string[]>('notify_emails', [practice.email]), getSetting<string[]>('house_call_areas', [])]);
  const svc = [
    ['Database', process.env.DATABASE_URL ? 'Supabase / Postgres' : 'Local (PGlite)', !!process.env.DATABASE_URL],
    ['Payments', paymentMode() === 'paystack' ? 'Paystack' : 'Test checkout', paymentMode() === 'paystack'],
    ['Email', process.env.RESEND_API_KEY ? 'Resend' : 'Outbox only', !!process.env.RESEND_API_KEY],
  ] as const;
  return (
    <>
      <Head eyebrow="Settings" title="Practice settings" />
      <Flash sp={sp} />
      <div className="grid grid-2">
        <form action={saveSettings} className="card frm">
          <h2>Booking rules</h2>
          <div className="frm-row">
            <label>Online cancel / move cut-off <small>hours before</small><input className="inp" type="number" name="cutoff" min={0} defaultValue={b.cancelCutoffHours} /></label>
            <label>Earliest booking <small>minutes from now</small><input className="inp" type="number" name="lead" min={0} step={15} defaultValue={b.leadMinutes} /></label>
          </div>
          <div className="frm-row">
            <label>Payment hold <small>minutes</small><input className="inp" type="number" name="hold" min={5} max={60} defaultValue={b.holdMinutes} /></label>
            <label>Start times every <small>minutes</small><select className="sel" name="step" defaultValue={String(b.slotStepMinutes)}>{[5, 10, 15, 20, 30, 60].map((m) => <option key={m}>{m}</option>)}</select></label>
            <label>Book up to <small>days ahead</small><input className="inp" type="number" name="ahead" min={7} max={365} defaultValue={b.maxDaysAhead} /></label>
          </div>
          <label>New-booking alerts go to <small>comma-separated emails</small><input className="inp" name="notify" defaultValue={notify.join(', ')} /></label>
          <label>House-call areas <small>one suburb per line; leave empty to accept any address</small><textarea className="ta" name="areas" defaultValue={areas.join('\n')} /></label>
          <div><button className="b">Save settings</button></div>
        </form>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <h2>Connections</h2>
            <dl className="dl">{svc.map(([k, v, ok]) => <span key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd><span className={`badge-s ${ok ? 's-paid' : 's-pending_payment'}`}>{v}</span></dd></span>)}</dl>
            <p className="muted" style={{ fontSize: '.84rem', marginBottom: 0 }}>Keys are set as environment variables on the server (see <code>.env.example</code>), never in the browser.</p>
          </div>
          <form action={changePassword} className="card frm">
            <h2>Change password</h2>
            <label>Current password<input className="inp" type="password" name="current" autoComplete="current-password" required /></label>
            <label>New password <small>10+ characters</small><input className="inp" type="password" name="next" autoComplete="new-password" minLength={10} required /></label>
            <div><button className="b b--ghost">Change password</button></div>
          </form>
        </div>
      </div>
    </>
  );
}
