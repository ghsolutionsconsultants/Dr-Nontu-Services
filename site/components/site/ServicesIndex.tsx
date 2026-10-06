'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { img, type services as S } from '@/lib/content';
import { Icon } from './Icon';

/** Editorial service list; on desktop a photograph follows the cursor. */
export function ServicesIndex({ items }: { items: typeof S }) {
  const list = useRef<HTMLUListElement>(null), flo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const L = list.current!, F = flo.current!, imgs = [...F.querySelectorAll('img')];
    let fx = 0, fy = 0, tx = 0, ty = 0, raf = 0;
    const move = (e: PointerEvent) => { tx = e.clientX + 170; ty = e.clientY; };
    const enter = (e: Event) => { const i = +(e.currentTarget as HTMLElement).dataset.i!; imgs.forEach((m, k) => m.classList.toggle('on', k === i)); F.classList.add('show'); };
    const leave = () => F.classList.remove('show');
    const links = [...L.querySelectorAll('a')];
    L.addEventListener('pointermove', move); L.addEventListener('pointerleave', leave);
    links.forEach((a) => a.addEventListener('pointerenter', enter));
    const loop = () => { fx += (tx - fx) * .14; fy += (ty - fy) * .14; F.style.left = fx + 'px'; F.style.top = fy + 'px'; raf = requestAnimationFrame(loop); };
    loop();
    return () => { cancelAnimationFrame(raf); L.removeEventListener('pointermove', move); L.removeEventListener('pointerleave', leave); links.forEach((a) => a.removeEventListener('pointerenter', enter)); };
  }, []);
  return (
    <>
      <ul className="svc-list" ref={list}>
        {items.map((s, i) => (
          <li className="svc rv" key={s.slug}>
            <Link href={`/services/${s.slug}`} data-i={i}>
              
              <span className="svc-thumb ph round"><img src={img(s.image, 200)} alt="" loading="lazy" /></span>
              <h3>{s.name}</h3>
              <p>{s.summary}</p>
              <span className="modes">{s.modes.map((m) => <Icon key={m} name={m} />)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="svc-float ph arch" ref={flo} aria-hidden>
        
        {items.map((s) => <img key={s.slug} src={img(s.image, 520)} alt="" loading="lazy" />)}
      </div>
    </>
  );
}
