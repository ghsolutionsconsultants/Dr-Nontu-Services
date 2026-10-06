import { describe, expect, it } from 'vitest';
import { slotsForDay, type SlotInput } from '../lib/slots';
import { fromSast, dateKey, sastMinutes, hhmm, rands } from '../lib/time';

const MON = '2026-10-05'; // a Monday
const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_min: 540, end_min: 960 }));
const base: SlotInput = {
  dateKey: MON, rules: weekdays, busy: [], blackouts: [], duration: 30, buffer: 0, step: 15,
  now: new Date('2026-10-01T08:00:00Z'), leadMinutes: 120,
};
const times = (i: Partial<SlotInput>) => slotsForDay({ ...base, ...i }).map((d) => hhmm(sastMinutes(d)));

describe('time helpers', () => {
  it('converts SAST wall time to UTC and back', () => {
    const d = fromSast(MON, 9 * 60);
    expect(d.toISOString()).toBe('2026-10-05T07:00:00.000Z');
    expect(dateKey(d)).toBe(MON);
    expect(sastMinutes(d)).toBe(540);
  });
  it('keys late-evening UTC instants to the next SAST day', () => {
    expect(dateKey(new Date('2026-10-04T23:30:00Z'))).toBe('2026-10-05');
  });
  it('formats rands with SA spacing', () => {
    expect(rands(65000)).toBe('R650');
    expect(rands(105000)).toBe('R1\u00a0050');
    expect(rands(4550)).toBe('R45.50');
  });
});

describe('slotsForDay', () => {
  it('offers every step inside the window that fits the chosen duration', () => {
    const t = times({});
    expect(t[0]).toBe('09:00');
    expect(t.at(-1)).toBe('15:30');      // 15:30 + 30 min ends exactly at 16:00
    expect(t).toHaveLength(27);           // 09:00 … 15:30 every 15 minutes
  });

  it('longer durations end earlier', () => {
    expect(times({ duration: 60 }).at(-1)).toBe('15:00');
  });

  it('returns nothing on days without a rule', () => {
    expect(times({ dateKey: '2026-10-04' })).toEqual([]); // Sunday
  });

  it('blocks starts that would overlap a live booking (including its buffer)', () => {
    const busy = [{ start: fromSast(MON, 600), end: fromSast(MON, 645 + 30) }]; // 10:00–10:45 + 30 min travel
    const t = times({ busy });
    expect(t).toContain('09:30');         // 09:30–10:00 touches but does not overlap
    expect(t).not.toContain('09:45');
    expect(t).not.toContain('11:00');
    expect(t).toContain('11:15');          // busy until 11:15
  });

  it("applies this visit's own buffer against the next booking", () => {
    const busy = [{ start: fromSast(MON, 660), end: fromSast(MON, 690) }]; // 11:00–11:30
    const t = times({ busy, buffer: 30 });
    expect(t).toContain('10:00');          // 10:00–10:30 + 30 = 11:00 ✓
    expect(t).not.toContain('10:15');      // 10:15–10:45 + 30 = 11:15 ✗
  });

  it('respects blackouts', () => {
    const blackouts = [{ start: fromSast(MON, 720), end: fromSast(MON, 780) }]; // lunch 12–13
    const t = times({ blackouts });
    expect(t).toContain('11:30');
    expect(t).not.toContain('11:45');
    expect(t).not.toContain('12:30');
    expect(t).toContain('13:00');
  });

  it('enforces the booking lead time', () => {
    const now = fromSast(MON, 600); // it is 10:00 now
    const t = times({ now, leadMinutes: 120 });
    expect(t[0]).toBe('12:00');
  });

  it('handles 24/7 virtual windows', () => {
    const allDay = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start_min: 0, end_min: 1440 }));
    const t = times({ rules: allDay, duration: 15, step: 15 });
    expect(t[0]).toBe('00:00');
    expect(t.at(-1)).toBe('23:45');
    expect(t).toHaveLength(96);
  });

  it('merges overlapping rules without duplicates', () => {
    const rules = [{ weekday: 1, start_min: 540, end_min: 720 }, { weekday: 1, start_min: 660, end_min: 780 }];
    const t = times({ rules });
    expect(new Set(t).size).toBe(t.length);
    expect(t.at(-1)).toBe('12:30');
  });
});
