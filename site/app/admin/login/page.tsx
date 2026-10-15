import { loginAction } from '../actions';

export const metadata = { title: 'Sign in' };

export default async function Login(props: PageProps<'/admin/login'>) {
  const sp = await props.searchParams;
  return (
    <div className="login">
      <form action={loginAction} className="card frm">
        <img src="/brand/logo.webp" alt="Dr Nontu Medical Practice" width={1167} height={369} style={{ width: 220, height: 'auto', margin: '0 auto 4px' }} />
        <p className="muted" style={{ textAlign: 'center', margin: '0 0 6px', fontSize: '.78rem', letterSpacing: '.2em', textTransform: 'uppercase' }}>Practice admin</p>
        {sp.err && <div className="flash flash--warn">That email and password don&rsquo;t match. Please try again.</div>}
        <input type="hidden" name="next" value={typeof sp.next === 'string' ? sp.next : ''} />
        <label>Email<input className="inp" name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input className="inp" name="password" type="password" autoComplete="current-password" required /></label>
        <button className="b b--gold" style={{ padding: '12px 14px' }}>Sign in</button>
      </form>
    </div>
  );
}
