import { describe, expect, it } from 'vitest';
import { describeDbUrl, parseDbUrl } from '../lib/db/url';

const host = 'aws-0-eu-west-1.pooler.supabase.com';
describe('parseDbUrl', () => {
  it('reads a plain pooler string', () => {
    expect(parseDbUrl(`postgresql://postgres.abc123:Secret99@${host}:6543/postgres`))
      .toEqual({ host, port: 6543, user: 'postgres.abc123', password: 'Secret99', database: 'postgres' });
  });
  it.each(['a/b+c=', 'p@ss#word?', 'x:y/z@@1', 'k3F9/Qx+Zz9w=='])('accepts special characters in the password: %s', (pw) => {
    expect(parseDbUrl(`postgresql://postgres.abc123:${pw}@${host}:6543/postgres`).password).toBe(pw);
  });
  it('decodes an already-encoded password', () => {
    expect(parseDbUrl(`postgresql://postgres.abc:a%2Fb%3D@${host}:6543/postgres`).password).toBe('a/b=');
  });
  it('ignores surrounding quotes and spaces', () => {
    expect(parseDbUrl(`  "postgresql://postgres.abc:pw@${host}:6543/postgres"  `).host).toBe(host);
  });
  it('undoes common copy-paste slips', () => {
    const v = `postgresql://postgres.abc:pw@${host}:6543/postgres`;
    for (const raw of [`DATABASE_URL=${v}`, `\u201C${v}\u201D`, `${v.slice(0, 20)}\n${v.slice(20)}`, `'${v}'`])
      expect(parseDbUrl(raw).password).toBe('pw');
  });
  it('names the placeholder when it was left in', () => {
    expect(() => parseDbUrl(`postgresql://postgres.abc:[YOUR-PASSWORD]@${host}:6543/postgres`)).toThrow(/placeholder/);
  });
  it('describes a value without revealing it', () => {
    const d = describeDbUrl(`postgresql://postgres.abc:secret@${host}:6543/postgres`);
    expect(d).toMatchObject({ startsWithPostgresql: true, containsAt: true, port: '6543', pooler: true });
    expect(JSON.stringify(d)).not.toContain('secret');
  });
  it('rejects things that are not connection strings', () => {
    expect(() => parseDbUrl('sb_publishable_xyz')).toThrow(/expected form/);
  });
});
