// South Africa has no daylight saving: SAST is always UTC+02:00.
export const TZ = 'Africa/Johannesburg';
const OFFSET_MIN = 120;
const MIN = 60_000;

/** 'YYYY-MM-DD' of the given instant, in SAST. */
export function dateKey(d: Date): string {
  const s = new Date(d.getTime() + OFFSET_MIN * MIN);
  return s.toISOString().slice(0, 10);
}

/** Minutes since SAST midnight for the given instant. */
export function sastMinutes(d: Date): number {
  const s = new Date(d.getTime() + OFFSET_MIN * MIN);
  return s.getUTCHours() * 60 + s.getUTCMinutes();
}

/** The UTC instant of `minutes` past midnight on SAST date `key`. */
export function fromSast(key: string, minutes: number): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + (minutes - OFFSET_MIN) * MIN);
}

/** 0 = Sunday … 6 = Saturday for a SAST date key. */
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Today's SAST date key. */
export const todayKey = () => dateKey(new Date());

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function monthDays(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
}

export const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, ...o });
const fDate = f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fShort = f({ weekday: 'short', day: 'numeric', month: 'short' });
const fTime = f({ hour: '2-digit', minute: '2-digit', hour12: false });
export const fmtDate = (d: Date) => fDate.format(d);
export const fmtShort = (d: Date) => fShort.format(d);
export const fmtTime = (d: Date) => fTime.format(d);
export const fmtWhen = (d: Date) => `${fDate.format(d)} at ${fTime.format(d)}`;

/** R1 050 — SA style, non-breaking space between thousands, cents only when present. */
export const rands = (cents: number) => {
  const whole = Math.floor(Math.abs(cents) / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const c = Math.abs(cents) % 100;
  return (cents < 0 ? '-R' : 'R') + whole + (c ? '.' + String(c).padStart(2, '0') : '');
};
