'use client';
import { useEffect, useRef, useState } from 'react';
import { img, photos } from '@/lib/content';

/**
 * The entrance: about five seconds, once per visit. The logo draws itself, the name rises letter by letter,
 * and a heartbeat traces the loading line while the page's photographs and 3D engine are fetched behind it.
 * Whether it shows is decided before first paint by the inline script in the site layout (no flash).
 */
const LOAD_MS = 4200;   // logo, name and the loading heartbeat
const EXIT_MS = 900;    // curtain lifts
const KEY = 'dn-intro';

// one long heartbeat for the loading line: flat runs with beats, ending in a tall final beat
const FOOT = (() => {
  let d = 'M0 40', x = 0;
  const beat = (h: number) => { d += ` L${x} 40 L${x + 6} 44 L${x + 14} ${40 - h} L${x + 22} ${40 + h * .45} L${x + 28} 40`; x += 28; };
  for (let i = 0; i < 9; i++) { x += 120 + (i % 3) * 18; beat(12 + (i % 3) * 7); }
  x += 90; beat(34); d += ` L1440 40`;
  return d;
})();

export function Intro() {
  const [phase, setPhase] = useState<'run' | 'exit' | 'gone'>('run');
  const [count, setCount] = useState(0);
  const footRef = useRef<SVGSVGElement>(null);
  const done = useRef(false);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains('intro-seen')) return; // hidden by CSS before first paint
    root.classList.add('intro-running');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = reduce ? 1200 : LOAD_MS;

    // use the wait: fetch what the first screen needs
    [photos.tea, photos.handsSteth, photos.oliveLight].forEach((id) => { const i = new Image(); i.src = img(id, 900); });
    import('../three/engine').catch(() => {});

    const finish = () => {
      if (done.current) return;
      done.current = true;
      try { sessionStorage.setItem(KEY, '1'); } catch {}
      setPhase('exit');
      // the page starts its own entrance as the curtain lifts
      setTimeout(() => {
        root.classList.remove('intro-running'); root.classList.add('intro-seen');
        (window as unknown as { __dnIntroDone?: boolean }).__dnIntroDone = true;
        window.dispatchEvent(new Event('dn:intro-done'));
      }, reduce ? 0 : 250);
      setTimeout(() => setPhase('gone'), reduce ? 300 : EXIT_MS);
    };
    finishRef.current = finish;

    let raf = 0;
    const t0 = performance.now();
    const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / total);
      const e = ease(p);
      setCount(Math.round(e * 100));
      if (footRef.current) footRef.current.style.clipPath = `inset(0 ${(1 - e) * 100}% 0 0)`;
      if (p < 1) raf = requestAnimationFrame(tick); else finish();
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); };
  }, []);

  if (phase === 'gone') return null;
  const skip = () => { footRef.current?.style.setProperty('clip-path', 'inset(0 0 0 0)'); finishRef.current(); };

  return (
    <div className={`intro${phase === 'exit' ? ' done' : ''}`} role="status" aria-label="Loading Dr Nontu Medical Practice">
      <div className="intro-inner">
        <svg className="intro-mark" viewBox="0 0 120 120" aria-hidden>
          <path className="tube t1" pathLength={1} d="M38 21.9 A44 44 0 1 0 82 98.1" />
          <path className="tube t2" pathLength={1} d="M60 16 A44 44 0 0 1 98.1 82" />
          <path className="ears" pathLength={1} d="M14 34 C14 52 18 62 28 64 M42 34 C42 52 38 62 28 64" />
          <circle className="tip" cx="14" cy="32" r="3.4" /><circle className="tip" cx="42" cy="32" r="3.4" />
          <path className="beat" pathLength={1} d="M28 64 H44 L49 52 L54 74 L59 36 L64 82 L68 56 L71 62 H104" />
          <circle className="chest" cx="91" cy="91" r="10" />
          <circle className="chest-ring" cx="91" cy="91" r="5.5" />
        </svg>
        <div className="intro-word" aria-hidden>
          {'DR NONTU'.split('').map((c, i) => <span key={i} style={{ animationDelay: `${2 + i * .07}s` }}>{c === ' ' ? ' ' : c}</span>)}
        </div>
        <div className="intro-sub" aria-hidden>MEDICAL PRACTICE</div>
        <p className="intro-tag">Every patient. <em>Expertly cared for.</em></p>
      </div>
      <div className="intro-foot" aria-hidden>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path className="ghost" d="M0 40 H1440" /></svg>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" ref={footRef} style={{ clipPath: 'inset(0 100% 0 0)' }}><path className="trace" d={FOOT} /></svg>
      </div>
      <div className="intro-meta">
        <span className="intro-count tnum" aria-hidden>{String(count).padStart(3, '0')}</span>
        <button type="button" className="intro-skip" onClick={skip}>Skip intro</button>
      </div>
    </div>
  );
}
