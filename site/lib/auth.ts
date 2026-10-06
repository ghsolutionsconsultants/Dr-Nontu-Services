import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { one } from './db';
import { readSession, signSession, SESSION_COOKIE, type Session } from './session';

export async function login(email: string, password: string) {
  const a = await one<{ id: number; email: string; name: string; password_hash: string }>(`select * from admins where email = $1`, [email.trim().toLowerCase()]);
  // compare even when the account is missing, so timing doesn't reveal which emails exist
  const ok = await bcrypt.compare(password, a?.password_hash ?? '$2b$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
  if (!a || !ok) return false;
  const token = await signSession({ sub: String(a.id), email: a.email, name: a.name });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 });
  return true;
}

export async function logout() { (await cookies()).delete(SESSION_COOKIE); }

export async function getAdmin(): Promise<Session | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For admin pages and server actions: the proxy only does an optimistic check, this is the real one. */
export async function requireAdmin(): Promise<Session> {
  const s = await getAdmin();
  if (!s) redirect('/admin/login');
  return s;
}

/** For admin route handlers. */
export async function adminOr401() {
  const s = await getAdmin();
  return s ? { session: s, res: null } : { session: null, res: Response.json({ error: 'Unauthorised' }, { status: 401 }) };
}
