// Reads a Postgres connection string without tripping over special characters in the password.
// A strict URL parser rejects passwords containing / ? # @ (for example base64 strings); here the
// password is everything between "user:" and the LAST "@", so any characters are accepted as typed.
export interface DbConfig { host: string; port: number; user: string; password: string; database: string }

/** Undo common copy-paste slips: "DATABASE_URL=" pasted into the value, quotes (incl. curly), line breaks. */
export function cleanDbUrl(raw: string): string {
  return raw.replace(/[\r\n\t]/g, '').trim()
    .replace(/^DATABASE_URL\s*=\s*/i, '')
    .replace(/^['"\u201C\u201D\u2018\u2019]+|['"\u201C\u201D\u2018\u2019]+$/g, '').trim();
}

/** Describes the value without revealing any of it, for /api/health. */
export function describeDbUrl(raw: string) {
  const s = cleanDbUrl(raw);
  return {
    length: s.length,
    startsWithPostgresql: /^postgres(ql)?:\/\//.test(s),
    containsAt: s.includes('@'),
    containsPlaceholder: /YOUR-PASSWORD/i.test(s),
    hadLineBreakOrQuotesOrKey: s !== raw.trim(),
    hasSpaces: /\s/.test(s),
    port: s.match(/:(\d{4,5})\//)?.[1] ?? null,
    pooler: /pooler\.supabase\.com/.test(s),
  };
}

export class DbUrlError extends Error {}

export function parseDbUrl(raw: string): DbConfig {
  const s = cleanDbUrl(raw);
  if (/YOUR-PASSWORD/i.test(s)) throw new DbUrlError('DATABASE_URL still contains the [YOUR-PASSWORD] placeholder: replace it (and the brackets) with the real database password');
  const m = s.match(/^postgres(?:ql)?:\/\/([^:/?#@]+):(.*)@([^@/?#:\s]+)(?::(\d+))?(?:\/([^?#\s]*))?(?:\?.*)?$/);
  if (!m) throw new DbUrlError('DATABASE_URL is not in the expected form: it must start with postgresql and contain user, password, @ and the host');
  const [, user, pass, host, port, database] = m;
  // decode only if the password was already percent-encoded (e.g. %2F); otherwise use it exactly as typed
  let password = pass;
  if (/%[0-9A-Fa-f]{2}/.test(pass)) { try { password = decodeURIComponent(pass); } catch { /* keep as typed */ } }
  return { host, port: Number(port || 5432), user: decodeURIComponent(user), password, database: database || 'postgres' };
}
