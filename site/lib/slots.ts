import { fromSast, weekdayOf } from './time';

export interface Rule { weekday: number; start_min: number; end_min: number }
export interface Interval { start: Date; end: Date }

export interface SlotInput {
  dateKey: string;          // SAST date, 'YYYY-MM-DD'
  rules: Rule[];            // opening windows for this consult type + location
  busy: Interval[];         // live bookings, end = busy_until (includes their buffer)
  blackouts: Interval[];    // leave, blocked time
  duration: number;         // minutes the patient chose
  buffer: number;           // minutes after this visit (travel/turnover)
  step: number;             // minutes between candidate start times
  now: Date;
  leadMinutes: number;      // earliest bookable time = now + lead
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/**
 * Start times a patient can book on one day.
 * A start is offered when the visit fits inside an opening window, and the visit plus its
 * buffer collides with no live booking (whose own buffer is already in `busy`) and no blackout.
 */
export function slotsForDay(i: SlotInput): Date[] {
  const wd = weekdayOf(i.dateKey);
  const earliest = i.now.getTime() + i.leadMinutes * 60_000;
  const out = new Set<number>();
  for (const r of i.rules) {
    if (r.weekday !== wd) continue;
    for (let m = r.start_min; m + i.duration <= r.end_min; m += i.step) {
      const s = fromSast(i.dateKey, m).getTime();
      if (s < earliest) continue;
      const e = s + i.duration * 60_000, eb = e + i.buffer * 60_000;
      if (i.busy.some((b) => overlaps(s, eb, b.start.getTime(), b.end.getTime()))) continue;
      if (i.blackouts.some((b) => overlaps(s, e, b.start.getTime(), b.end.getTime()))) continue;
      out.add(s);
    }
  }
  return [...out].sort((a, b) => a - b).map((t) => new Date(t));
}
