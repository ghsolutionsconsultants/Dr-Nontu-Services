// npm run db:check: paste a connection string (hidden as you type) and see whether the database accepts it.
// Nothing is saved or printed except the result.
import pg from 'pg';
import { parseDbUrl } from '../lib/db/url';

function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode?.(true); stdin.resume(); stdin.setEncoding('utf8');
    let v = '';
    const on = (ch: string) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') { stdin.setRawMode?.(false); stdin.pause(); stdin.off('data', on); process.stdout.write('\n'); return resolve(v.trim()); }
        if (c === '\u0003') process.exit(1);
        if (c === '\u007f') v = v.slice(0, -1); else v += c;
      }
    };
    stdin.on('data', on);
  });
}

(async () => {
  const url = process.env.DATABASE_URL || (await askHidden('Paste the full DATABASE_URL (hidden), then press Enter: '));
  if (!/^postgres(ql)?:\/\//.test(url)) { console.log('✗ That does not look like a connection string (it should start with postgresql://).'); process.exit(1); }
  if (/YOUR-PASSWORD|:\[.*\]@/.test(url)) { console.log('✗ The string still contains [YOUR-PASSWORD] or brackets. Put the real password in, without brackets.'); process.exit(1); }
  let cfg;
  try { cfg = parseDbUrl(url); } catch (e) { console.log('✗ ' + (e as Error).message); process.exit(1); }
  const client = new pg.Client({ ...cfg, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
  try {
    await client.connect();
    await client.query('select 1');
    console.log('✓ Connected. This exact string works: paste the same into Vercel as DATABASE_URL, then redeploy.');
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.log(`✗ ${err.code ?? ''} ${String(err.message).replace(/postgres(ql)?:\/\/\S+/g, '[hidden]')}`);
    if (err.code === '28P01') console.log('  The password is wrong. Reset it in Supabase (Project Settings → Database) and try again.');
  } finally { await client.end().catch(() => {}); }
})();
