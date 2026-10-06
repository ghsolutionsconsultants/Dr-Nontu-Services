'use client';
import { useEffect, useMemo, useState } from 'react';

const TZ = 'Africa/Johannesburg';
const dayKey = (d: Date) => new Date(d.getTime() + 2 * 3600_000).toISOString().slice(0, 10);
const monthOf = (key: string) => key.slice(0, 7);
const fmtTime = new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const fmtLong = new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const fmtMonth = new Intl.DateTimeFormat('en-ZA', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const hourOf = (iso: string) => +fmtTime.format(new Date(iso)).slice(0, 2);

export interface PickerQuery { type: string; location: string; duration: number; token?: string }

/** Month calendar (days with open times get a gold dot) + grouped time slots, both from the API. */
export function DateTimePicker({ query, value, onChange }: { query: PickerQuery; value: string | null; onChange: (iso: string | null) => void }) {
  const today = dayKey(new Date());
  const [month, setMonth] = useState(value ? monthOf(dayKey(new Date(value))) : monthOf(today));
  const [date, setDate] = useState<string | null>(value ? dayKey(new Date(value)) : null);
  const [ripple, setRipple] = useState<string | null>(null);
  const base = new URLSearchParams({ type: query.type, location: query.location, duration: String(query.duration), ...(query.token ? { token: query.token } : {}) }).toString();
  const monthKey = `${base}&month=${month}`, slotKey = date ? `${base}&date=${date}` : null;
  const [monthRes, setMonthRes] = useState<{ key: string; days: string[]; error?: string } | null>(null);
  const [slotRes, setSlotRes] = useState<{ key: string; slots: string[] } | null>(null);
  const days = monthRes?.key === monthKey ? monthRes.days : null;
  const error = monthRes?.key === monthKey ? monthRes.error ?? null : null;
  const slots = slotKey && slotRes?.key === slotKey ? slotRes.slots : null;

  useEffect(() => {
    let live = true;
    fetch(`/api/availability?${monthKey}`).then((r) => r.json()).then((j) => {
      if (!live) return;
      setMonthRes({ key: monthKey, days: j.days ?? [], error: j.error });
      // first visit at the end of a month: jump ahead to the next open month
      if (!j.error && (j.days ?? []).length === 0 && month === monthOf(today) && !date) setMonth(nextMonth(month, 1));
    }).catch(() => live && setMonthRes({ key: monthKey, days: [], error: 'Could not load availability. Please try again.' }));
    return () => { live = false; };
  }, [monthKey, month, today, date]);

  useEffect(() => {
    if (!slotKey) return;
    let live = true;
    fetch(`/api/slots?${slotKey}`).then((r) => r.json()).then((j) => { if (live) setSlotRes({ key: slotKey, slots: j.slots ?? [] }); })
      .catch(() => live && setSlotRes({ key: slotKey, slots: [] }));
    return () => { live = false; };
  }, [slotKey]);

  // a different type/length can invalidate the chosen time
  useEffect(() => { if (value && slots && !slots.includes(value)) onChange(null); }, [slots, value, onChange]);

  const grid = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { lead, keys: Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`) };
  }, [month]);

  const groups = useMemo(() => {
    const g: Record<string, string[]> = { Morning: [], Afternoon: [], Evening: [], Night: [] };
    (slots ?? []).forEach((s) => { const h = hourOf(s); (h < 6 ? g.Night : h < 12 ? g.Morning : h < 17 ? g.Afternoon : h < 22 ? g.Evening : g.Night).push(s); });
    return Object.entries(g).filter(([, v]) => v.length);
  }, [slots]);

  return (
    <div className="dt-grid">
      <div>
        <div className="cal-head">
          <strong>{fmtMonth.format(new Date(month + '-01T00:00:00Z'))}</strong>
          <div className="cal-nav">
            <button type="button" aria-label="Previous month" disabled={month <= monthOf(today)} onClick={() => setMonth(nextMonth(month, -1))}>‹</button>
            <button type="button" aria-label="Next month" onClick={() => setMonth(nextMonth(month, 1))}>›</button>
          </div>
        </div>
        <div className={`cal${days === null ? ' loading' : ''}`} role="grid" aria-label="Choose a date">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="dow">{d}</span>)}
          {Array.from({ length: grid.lead }, (_, i) => <span key={'x' + i} />)}
          {grid.keys.map((k) => {
            const ok = !!days?.includes(k);
            return (
              <button type="button" key={k} disabled={!ok} className={`${ok ? 'avail' : ''}${date === k ? ' sel' : ''}${ripple === k ? ' ripple' : ''}`}
                aria-label={`${k}${ok ? ', available' : ', unavailable'}`} aria-pressed={date === k}
                onClick={() => { setDate(k); onChange(null); setRipple(k); setTimeout(() => setRipple(null), 700); }}>
                {+k.slice(8)}
              </button>
            );
          })}
        </div>
        {error && <p className="notice notice--error" style={{ marginTop: 14 }}>{error}</p>}
      </div>
      <div>
        <h4 className="label" style={{ marginBottom: 14 }}>{date ? fmtLong.format(new Date(date + 'T10:00:00Z')) : 'Choose a date'}</h4>
        {!date && <p className="empty">Days with a gold dot have open times.</p>}
        {date && slots === null && <p className="empty">Finding open times…</p>}
        {date && slots?.length === 0 && <p className="empty">That day just filled up. Please choose another.</p>}
        {groups.map(([g, arr]) => (
          <div className="slot-group" key={g + date}>
            <h5>{g}</h5>
            <div className="slots">
              {arr.map((s, i) => (
                <button type="button" key={s} className="slot" style={{ animationDelay: `${i * 22}ms` }} aria-pressed={value === s} onClick={() => onChange(s)}>
                  {fmtTime.format(new Date(s))}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function nextMonth(ym: string, d: number) {
  const [y, m] = ym.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + d, 1));
  return t.toISOString().slice(0, 7);
}
