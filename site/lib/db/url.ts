// Reads a Postgres connection string without tripping over special characters in the password.
// A strict URL parser rejects passwords containing / ? # @ (for example base64 strings); here the
// password is everything between "user:" and the LAST "@", so any characters are accepted as typed.
export interface DbConfig { host: string; port: number; user: string; password: string; database: string }

export function parseDbUrl(raw: string): DbConfig {
  const s = raw.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  const m = s.match(/^postgres(?:ql)?:\/\/([^:/?#@]+):(.*)@([^@/?#:\s]+)(?::(\d+))?(?:\/([^?#\s]*))?(?:\?.*)?$/);
  if (!m) throw new Error('DATABASE_URL should look like postgresql://user:password@host:port/database');
  const [, user, pass, host, port, database] = m;
  // decode only if the password was already percent-encoded (e.g. %2F); otherwise use it exactly as typed
  let password = pass;
  if (/%[0-9A-Fa-f]{2}/.test(pass)) { try { password = decodeURIComponent(pass); } catch { /* keep as typed */ } }
  return { host, port: Number(port || 5432), user: decodeURIComponent(user), password, database: database || 'postgres' };
}
