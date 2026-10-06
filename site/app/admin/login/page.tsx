import { loginAction } from '../actions';
import { LogoMark } from '@/components/site/Icon';

export const metadata = { title: 'Sign in' };

export default async function Login(props: PageProps<'/admin/login'>) {
  const sp = await props.searchParams;
  return (
    <div className="login">
      <form action={loginAction} className="card frm">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
          <LogoMark className="" />
          <div><b style={{ fontFamily: 'var(--display)', letterSpacing: '.12em', fontWeight: 500 }}>DR NONTU</b><br /><small style={{ fontSize: '.62rem', letterSpacing: '.3em', color: 'var(--brass-deep)', fontWeight: 600 }}>PRACTICE ADMIN</small></div>
        </div>
        {sp.err && <div className="flash flash--warn">That email and password don&rsquo;t match. Please try again.</div>}
        <input type="hidden" name="next" value={typeof sp.next === 'string' ? sp.next : ''} />
        <label>Email<input className="inp" name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input className="inp" name="password" type="password" autoComplete="current-password" required /></label>
        <button className="b b--gold" style={{ padding: '12px 14px' }}>Sign in</button>
      </form>
    </div>
  );
}
