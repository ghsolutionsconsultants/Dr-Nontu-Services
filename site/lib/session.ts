// Edge-safe session helpers (used by proxy.ts and the server).
import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'dn_admin';
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? 'dev-only-insecure-secret-change-me');

export interface Session { sub: string; email: string; name: string }

export async function signSession(s: Session) {
  return new SignJWT({ email: s.email, name: s.name }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.sub).setIssuedAt().setExpirationTime('12h').sign(secret());
}

export async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return { sub: String(payload.sub), email: String(payload.email), name: String(payload.name) };
  } catch { return null; }
}
