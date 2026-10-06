'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { nav } from '@/lib/content';
import { Icon, LogoMark } from './Icon';

export function Header() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setCompact(scrollY > 40);
    const r = requestAnimationFrame(on); addEventListener('scroll', on, { passive: true });
    return () => { cancelAnimationFrame(r); removeEventListener('scroll', on); };
  }, []);
  const [path, setPath] = useState(pathname);
  if (path !== pathname) { setPath(pathname); setOpen(false); }
  useEffect(() => { document.documentElement.style.overflow = open ? 'hidden' : ''; }, [open]);
  const cur = (href: string) => (pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined);

  return (
    <header className={`hdr${compact ? ' compact' : ''}${open ? ' open' : ''}`}>
      <div className="wrap">
        <Link className="brand" href="/" aria-label="Dr Nontu Medical Practice, home">
          <LogoMark />
          <span><b>DR NONTU</b><small>MEDICAL PRACTICE</small></span>
        </Link>
        <nav className="nav" aria-label="Main">
          {nav.map((n) => <Link key={n.href} className="link-u" href={n.href} aria-current={cur(n.href)}>{n.label}</Link>)}
        </nav>
        <div className="hdr-actions">
          <Link className="btn magnetic" href="/book" data-track="header_book">Book a visit <Icon name="arrow" /></Link>
          <button className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}><span /><span /></button>
        </div>
      </div>
      <nav className="mnav" aria-label="Mobile" aria-hidden={!open}>
        <Link href="/">Home</Link>
        {nav.map((n) => <Link key={n.href} href={n.href} tabIndex={open ? 0 : -1}>{n.label}</Link>)}
        <Link href="/faq" tabIndex={open ? 0 : -1}>FAQ</Link>
        <Link className="btn" href="/book" tabIndex={open ? 0 : -1}>Book an appointment <Icon name="arrow" /></Link>
      </nav>
    </header>
  );
}
