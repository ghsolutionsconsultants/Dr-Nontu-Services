import { requireAdmin } from '@/lib/auth';
import { one } from '@/lib/db';
import { logoutAction } from '../actions';
import { AdminNav } from '@/components/admin/AdminNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Panel({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const open = await one<{ n: number }>(`select count(*)::int n from messages where handled_at is null`);
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link className="adm-brand" href="/admin"><img src="/brand/logo-mark.webp" alt="" width={384} height={369} /><span><b>DR NONTU</b><small>ADMIN</small></span></Link>
        <AdminNav counts={{ '/admin/messages': open?.n ?? 0 }} />
        <div className="who">Signed in as<br /><b style={{ color: 'var(--linen)' }}>{me.email}</b><br />
          <form action={logoutAction}><button>Sign out</button></form>
          <Link href="/" style={{ color: 'var(--gold-light)', fontSize: '.82rem' }} target="_blank">View website ↗</Link>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
