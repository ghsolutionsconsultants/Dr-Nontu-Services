'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export const scrollToTop = () => scrollTo(0, 0);

/** The only page-wide motion: content fades in gently as it scrolls into view. */
export function Effects() {
  const pathname = usePathname();
  useEffect(() => {
    if (!location.hash) scrollToTop();
    const els = () => [...document.querySelectorAll('.rv:not(.in)')];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { els().forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -4% 0px' });
    const observe = () => els().forEach((el) => io.observe(el));
    observe();
    const mo = new MutationObserver(observe); mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
  return null;
}
