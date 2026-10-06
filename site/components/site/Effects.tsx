'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

let lenis: Lenis | null = null;
export const scrollToTop = () => (lenis ? lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0));

/** Page-wide motion: smooth scroll, 3D hinge reveals, tilt + glare, magnetic buttons, parallax, cursor. */
export function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || lenis) return;
    lenis = new Lenis({ lerp: .09 });
    if (document.documentElement.classList.contains('intro-running')) {
      lenis.stop();
      addEventListener('dn:intro-done', () => lenis?.start(), { once: true });
    }
    let raf = 0;
    const loop = (t: number) => { lenis?.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis?.destroy(); lenis = null; };
  }, []);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
    const ac = new AbortController(), sig = { signal: ac.signal, passive: true } as const;
    const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T & Element>(s)];
    const rafs: number[] = [];
    if (!location.hash) scrollToTop();

    // reveals
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -4% 0px' });
    const observe = () => $$('.rv:not(.in), .tl:not(.in)').forEach((el) => io.observe(el));
    observe();
    // content rendered later (client data) gets picked up too
    const mo = new MutationObserver(observe); mo.observe(document.body, { childList: true, subtree: true });
    // clipped elements never intersect, so masks reveal by position
    const masks = () => $$('.mask-in:not(.in)').forEach((m) => { if (m.getBoundingClientRect().top < innerHeight * .88) m.classList.add('in'); });
    addEventListener('scroll', masks, sig); masks();
    if (reduce) $$('.rv, .tl, .mask-in').forEach((el) => el.classList.add('in'));

    // parallax inside photos
    const pars = () => $$<HTMLElement>('[data-par]').forEach((im) => {
      const b = im.parentElement!.getBoundingClientRect();
      im.style.setProperty('--py', (((b.top + b.height / 2 - innerHeight / 2) / innerHeight) * -100 * +(im.dataset.par || .1)) + 'px');
    });
    if (!reduce) { addEventListener('scroll', () => requestAnimationFrame(pars), sig); pars(); }

    if (fine && !reduce) {
      // tilt surfaces with a moving light
      $$<HTMLElement>('[data-tilt]').forEach((el) => {
        const max = +(el.dataset.tilt || 6);
        if (!el.querySelector(':scope > .glare')) { const gl = document.createElement('span'); gl.className = 'glare'; el.append(gl); }
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.classList.add('tilting');
          el.style.transform = `perspective(1000px) rotateX(${(.5 - y) * max}deg) rotateY(${(x - .5) * max}deg)`;
          el.style.setProperty('--gx', x * 100 + '%'); el.style.setProperty('--gy', y * 100 + '%');
        }, sig);
        el.addEventListener('pointerleave', () => { el.classList.remove('tilting'); el.style.transform = ''; }, sig);
      });
      // magnetic buttons
      $$<HTMLElement>('.magnetic').forEach((b) => {
        b.addEventListener('pointermove', (e) => {
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .32}px)`;
        }, sig);
        b.addEventListener('pointerleave', () => { b.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'; b.style.transform = ''; setTimeout(() => (b.style.transition = ''), 600); }, sig);
      });
      // cursor
      const cur = document.getElementById('cursor');
      if (cur) {
        let cx = 0, cy = 0, mx = 0, my = 0;
        addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; cur.style.opacity = '1'; }, sig);
        document.addEventListener('pointerleave', () => (cur.style.opacity = '0'), sig);
        document.addEventListener('pointerover', (e) => cur.classList.toggle('big', !!(e.target as Element).closest?.('a, button, summary, [role="button"]')), sig);
        const cl = () => { cx += (mx - cx) * .2; cy += (my - cy) * .2; cur.style.transform = `translate(${cx}px, ${cy}px)`; rafs.push(requestAnimationFrame(cl)); };
        cl();
      }
    }
    return () => { ac.abort(); io.disconnect(); mo.disconnect(); rafs.forEach(cancelAnimationFrame); };
  }, [pathname]);

  return <div className="cursor" id="cursor" aria-hidden />;
}
