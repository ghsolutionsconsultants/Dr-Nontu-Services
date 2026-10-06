'use client';
import { useEffect, useRef } from 'react';

/** Words light up as the statement scrolls through; an olive branch grows beside it. */
export function Statement({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  const q = useRef<HTMLParagraphElement>(null), branch = useRef<SVGSVGElement>(null), leaves = useRef<SVGGElement>(null);

  useEffect(() => {
    const st = q.current!, br = branch.current!, lg = leaves.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // split text nodes into words (keeps <em>)
    if (!st.dataset.split) {
      st.dataset.split = '1';
      const split = (node: Node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent!.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) frag.append(w);
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.append(s); }
          });
          n.replaceWith(frag);
        } else split(n);
      });
      split(st);
    }
    const words = [...st.querySelectorAll('.w')];
    // grow the branch from code
    const stem = br.querySelector<SVGPathElement>('.stem')!, SL = stem.getTotalLength(), NS = 'http://www.w3.org/2000/svg';
    lg.innerHTML = '';
    const els: SVGElement[] = [];
    [[.12, -1], [.2, 1], [.3, -1], [.38, 1], [.48, -1], [.56, 1], [.65, -1], [.72, 1], [.8, -1], [.87, 1], [.94, -1]].forEach(([t, side]) => {
      const a = stem.getPointAtLength(t * SL), b = stem.getPointAtLength(Math.min(1, t + .01) * SL);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + side * 52, len = 46 - t * 14;
      const g = document.createElementNS(NS, 'g'), leaf = document.createElementNS(NS, 'path');
      g.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${ang})`);
      leaf.setAttribute('class', 'leaf'); leaf.dataset.t = String(t);
      leaf.setAttribute('d', `M0 0 C${len * .3} ${-len * .2} ${len * .75} ${-len * .17} ${len} 0 C${len * .75} ${len * .17} ${len * .3} ${len * .2} 0 0 Z M0 0 L${len * .85} 0`);
      g.append(leaf); lg.append(g); els.push(leaf);
    });
    [[.42, 14, 8], [.76, -12, 10]].forEach(([t, dx, dy]) => {
      const a = stem.getPointAtLength(t * SL), c = document.createElementNS(NS, 'ellipse');
      c.setAttribute('class', 'olive'); c.setAttribute('cx', String(a.x + dx)); c.setAttribute('cy', String(a.y + dy)); c.setAttribute('rx', '6'); c.setAttribute('ry', '8.5');
      c.dataset.t = String(t + .04); lg.append(c); els.push(c);
    });
    if (reduce) { words.forEach((w) => w.classList.add('lit')); br.style.setProperty('--p', '1'); els.forEach((l) => l.classList.add('on')); return; }
    const fx = () => {
      const vh = innerHeight, r = st.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * .78 - r.top) / (r.height + vh * .3)));
      const n = Math.round(p * words.length * 1.05);
      words.forEach((w, i) => w.classList.toggle('lit', i < n));
      const b = br.getBoundingClientRect();
      const bp = Math.min(1, Math.max(0, (vh * .9 - b.top) / (b.height + vh * .2)));
      br.style.setProperty('--p', String(bp));
      els.forEach((l) => l.classList.toggle('on', bp > +l.dataset.t!));
    };
    const on = () => requestAnimationFrame(fx);
    addEventListener('scroll', on, { passive: true }); fx();
    return () => removeEventListener('scroll', on);
  }, []);

  return (
    <div className="statement-grid">
      <aside className="statement-aside">
        <svg className="branch" ref={branch} viewBox="0 0 340 420" aria-hidden>
          <path className="stem" pathLength={1} d="M30 410 C70 330 110 280 170 210 S280 70 320 20" />
          <g ref={leaves} />
        </svg>
        {aside}
      </aside>
      <div>
        <span className="eyebrow">Healthcare that feels personal</span>
        <p className="statement-q display" ref={q}>{children}</p>
      </div>
    </div>
  );
}
