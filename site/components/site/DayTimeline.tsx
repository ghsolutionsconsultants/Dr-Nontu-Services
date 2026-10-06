'use client';
import { useEffect, useState } from 'react';
import { Scene3D } from '../three/Scene3D';

type Kind = 'virtual' | 'inperson' | 'house';
const ROWS: { kind: Kind; title: string; sub: string; open: [number, number]; weekdaysOnly?: boolean }[] = [
  { kind: 'virtual', title: 'Virtual', sub: 'Every day · 24 hours', open: [0, 24] },
  { kind: 'inperson', title: 'In person', sub: 'Mon–Fri · 09:00–16:00', open: [9, 16], weekdaysOnly: true },
  { kind: 'house', title: 'House calls', sub: 'Daily · 09:00–16:00', open: [9, 16] },
];
const W = 1000, MID = 32;
const beat = (x: number, a: number) => `L${x} ${MID} L${x + 4} ${MID + 4} L${x + 9} ${MID - a} L${x + 14} ${MID + a * .45} L${x + 18} ${MID} `;
function line(kind: Kind, [s, e]: [number, number]) {
  const xs = s / 24 * W, xe = e / 24 * W, step = kind === 'virtual' ? 34 : 26;
  let d = `M${xs} ${MID} `;
  for (let x = xs + 10, k = 0; x < xe - 22; x += step, k++) d += beat(x, kind === 'virtual' ? 14 + (k % 3) * 4 : 22 - (k % 2) * 6);
  return d + `L${xe} ${MID}`;
}
const sast = () => {
  const p = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { wd: g('weekday'), h: +g('hour') % 24, m: +g('minute') };
};

/** Opening hours drawn as heartbeats, with a live "now" marker and status in SAST. */
export function Hours({ title }: { title: React.ReactNode }) {
  const [now, setNow] = useState<ReturnType<typeof sast> | null>(null);
  useEffect(() => { const tick = () => setNow(sast()); const t0 = setTimeout(tick, 0), t = setInterval(tick, 60_000); return () => { clearTimeout(t0); clearInterval(t); }; }, []);
  const weekday = now ? !['Sat', 'Sun'].includes(now.wd) : true;
  const inHours = now ? now.h >= 9 && now.h < 16 : false;
  const open = ['Virtual consultations', ...(inHours ? ['house calls'] : []), ...(inHours && weekday ? ['in-person visits'] : [])];
  const status = now ? `Open now: ${open.join(', ').replace(/, ([^,]*)$/, ' and $1')}` : 'Checking who\u2019s available…';
  return (
    <>
      <div className="sec-head">
        <div><span className="eyebrow">Opening hours</span><h2 className="display">{title}</h2></div>
        <div className="day-side">
          <Scene3D kind="orbit" className="day-3d" />
          <div className="now-pill" role="status"><i />{status}</div>
        </div>
      </div>
      <div className="tl">
        <div className="tl-cols" aria-hidden>
          <div className="tl-track">{now && <div className="tl-now" style={{ left: `${(now.h + now.m / 60) / 24 * 100}%` }}><span className="tnum">Now · {String(now.h).padStart(2, '0')}:{String(now.m).padStart(2, '0')}</span></div>}</div>
        </div>
        {ROWS.map((r) => (
          <div className="tl-row" key={r.kind}>
            <div><h4>{r.title}</h4><small>{r.sub}</small></div>
            <div className="tl-line" aria-hidden>
              <svg viewBox={`0 0 ${W} 56`} preserveAspectRatio="none"><path className="off" d={`M0 ${MID} H${W}`} /><path className="on" d={line(r.kind, r.open)} /></svg>
            </div>
          </div>
        ))}
        <div className="tl-axis tnum" aria-hidden><span /><div><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div>
      </div>
    </>
  );
}
