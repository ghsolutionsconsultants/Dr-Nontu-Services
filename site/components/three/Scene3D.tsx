'use client';
import { useEffect, useRef } from 'react';
import type { SceneKind } from './engine';

/** A 3D object slot. The engine (three.js) is fetched only when a page actually shows one. */
export function Scene3D({ kind, className = '', delay }: { kind: SceneKind; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose: (() => void) | undefined, cancelled = false;
    const el = ref.current!;
    const go = () => import('./engine').then((m) => { if (!cancelled) dispose = m.mount(el, kind, { delay }); });
    // start when within reach of the viewport
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '400px' });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); dispose?.(); };
  }, [kind, delay]);
  return <div ref={ref} className={`stage3d ${className}`} aria-hidden><canvas /></div>;
}
