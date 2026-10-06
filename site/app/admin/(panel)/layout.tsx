import { requireAdmin } from '@/lib/auth';
import { logoutAction } from '../actions';
import { AdminNav } from '@/components/admin/AdminNav';
import { LogoMark } from '@/components/site/Icon';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Panel({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link className="adm-brand" href="/admin"><LogoMark /><span><b>DR NONTU</b><small>ADMIN</small></span></Link>
        <AdminNav />
        <div className="who">Signed in as<br /><b style={{ color: 'var(--linen)' }}>{me.email}</b><br />
          <form action={logoutAction}><button>Sign out</button></form>
          <Link href="/" style={{ color: 'var(--gold-light)', fontSize: '.82rem' }} target="_blank">View website ↗</Link>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
