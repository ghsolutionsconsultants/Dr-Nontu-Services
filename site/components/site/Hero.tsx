'use client';
import { useEffect, useRef, useState } from 'react';
import { img, photos } from '@/lib/content';
import { Scene3D } from '../three/Scene3D';
import { LogoMark } from './Icon';

const LINES: [string, string][] = [['A laugh', 'when you need one.'], ['Answers', 'when you need them.'], ['Hope', 'on difficult days.']];
const ART = [
  { id: photos.tea, alt: 'A cup of tea on a sunlit table' },
  { id: photos.handsSteth, alt: "A doctor's hands with a stethoscope" },
  { id: photos.oliveLight, alt: 'A young olive branch reaching toward the light' },
];
// one continuous heartbeat; one beat per line: a playful double blip, a steady beat, a tall rising beat
const PATH = 'M0 110 H300 Q312 100 324 110 H334 L340 96 L346 120 L352 90 L358 118 L364 100 L370 112 L376 104 L382 110 Q394 101 406 110 H640 Q656 98 672 110 H684 L690 116 L700 46 L710 128 L716 110 H730 Q748 88 766 110 H1020 Q1036 98 1052 110 H1062 L1068 118 L1080 16 L1092 134 L1098 110 H1110 Q1130 84 1150 104 C1250 112 1330 72 1440 38';
const STOPS = [.29, .54, 1];

export function Hero({ children }: { children: React.ReactNode }) {
  const [go, setGo] = useState(false);
  const [active, setActive] = useState(-1);
  const [reveal, setReveal] = useState(0);
  const [intro, setIntro] = useState<'show' | 'done' | 'gone'>('gone');
  const hovering = useRef(false);
  const pathRef = useRef<SVGPathElement>(null), dotRef = useRef<HTMLSpanElement>(null), depthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cycle: ReturnType<typeof setInterval>, raf = 0, raf2 = 0;
    const T = (f: () => void, ms: number) => timers.push(setTimeout(f, ms));
    const start = () => {
      setGo(true);
      if (reduce) { setReveal(1); setActive(0); return; }
      STOPS.forEach((x, i) => T(() => { setReveal(x); setActive(i); }, 500 + i * 1100));
      T(() => {
        const p = pathRef.current!, dot = dotRef.current!, L = p.getTotalLength(), t0 = performance.now();
        dot.classList.add('live');
        const tick = (now: number) => { const pt = p.getPointAtLength((((now - t0) / 5200) % 1) * L); dot.style.left = pt.x / 14.4 + '%'; dot.style.top = pt.y / 1.6 + '%'; raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
      }, 500 + 3 * 1100);
      T(() => { setActive(0); cycle = setInterval(() => { if (!hovering.current) setActive((a) => (a + 1) % 3); }, 4200); }, 500 + 3 * 1100 + 2600);
    };
    let seen = false;
    try { seen = !!sessionStorage.getItem('dn-intro'); sessionStorage.setItem('dn-intro', '1'); } catch {}
    if (reduce || seen) T(start, 0);
    else { T(() => setIntro('show'), 0); T(() => { setIntro('done'); T(start, 250); T(() => setIntro('gone'), 1100); }, 1250); }

    // depth parallax on the visual + headline
    if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      let hx = 0, hy = 0, tx = 0, ty = 0;
      const mv = (e: PointerEvent) => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; };
      addEventListener('pointermove', mv, { passive: true });
      const loop = () => { hx += (tx - hx) * .06; hy += (ty - hy) * .06; if (depthRef.current) depthRef.current.style.transform = `rotateY(${hx * 12}deg) rotateX(${-hy * 10}deg)`; raf2 = requestAnimationFrame(loop); };
      loop();
      return () => { timers.forEach(clearTimeout); clearInterval(cycle); cancelAnimationFrame(raf); cancelAnimationFrame(raf2); removeEventListener('pointermove', mv); };
    }
    return () => { timers.forEach(clearTimeout); clearInterval(cycle); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className={`hero${go ? ' go' : ''}`}>
      {intro !== 'gone' && (
        <div className={`intro${intro === 'done' ? ' done' : ''}`} aria-hidden>
          <svg viewBox="0 0 120 120">
            <path className="tube" pathLength={1} d="M38 21.9 A44 44 0 1 0 82 98.1" stroke="#E8C988" strokeWidth="3" />
            <path className="tube" pathLength={1} d="M60 16 A44 44 0 0 1 98.1 82" stroke="#C69036" strokeWidth="3" />
            <path className="beat" pathLength={1} d="M28 64 H44 L49 52 L54 74 L59 36 L64 82 L68 56 L71 62 H104" stroke="#FDFAF5" strokeWidth="2" />
            <circle className="chest" cx="91" cy="91" r="9" fill="#C69036" />
          </svg>
        </div>
      )}
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className={`eyebrow rv${go ? ' in' : ''}`}>General practice · Esther Park &amp; Fourways</span>
            <h1 className="display" aria-label={LINES.map((l) => l.join(' ')).join(' ')}>
              {LINES.map(([a, b], i) => (
                <span key={i} className={`ln${active === i ? ' on' : ''}`} onMouseEnter={() => { hovering.current = true; setActive(i); }} onMouseLeave={() => (hovering.current = false)}>
                  <span className="in">{a} <em>{b}</em></span>
                </span>
              ))}
            </h1>
          </div>
          <div className={`hero-visual rv${go ? ' in' : ''}`} style={{ transitionDelay: '.3s' }}>
            <div className="hero-depth" ref={depthRef}>
              <div className="hero-arch ph arch" data-tilt="6">
                {ART.map((a, i) => (
                  <img key={a.id} className={active === i || (active < 0 && i === 0) ? 'on' : ''} src={img(a.id, 900)} alt={a.alt} fetchPriority={i === 0 ? 'high' : 'low'} />
                ))}
              </div>
              <Scene3D kind="mark" className="hero-3d" delay={intro === 'gone' ? 300 : 1500} />
              <svg className="badge" viewBox="0 0 120 120" aria-hidden>
                <g className="ring">
                  <path id="circ" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" fill="none" />
                  <text><textPath href="#circ">Every patient · Expertly cared for · </textPath></text>
                </g>
                <circle cx="60" cy="60" r="30" fill="#FDFAF5" />
                <svg x="40" y="40" width="40" height="40" viewBox="0 0 120 120"><LogoMark /></svg>
              </svg>
            </div>
          </div>
        </div>
        <div className="ecg" aria-hidden>
          <svg className="ghost" viewBox="0 0 1440 160" preserveAspectRatio="none"><path d="M0 110 H1440" /></svg>
          <svg className="trace" viewBox="0 0 1440 160" preserveAspectRatio="none" style={{ '--reveal': reveal } as React.CSSProperties}><path ref={pathRef} d={PATH} /></svg>
          <span className="pulse" ref={dotRef} />
        </div>
        <div className={go ? 'hero-reveal-go' : ''}>{children}</div>
      </div>
    </section>
  );
}
