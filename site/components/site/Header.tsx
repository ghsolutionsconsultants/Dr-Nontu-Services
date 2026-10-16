'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { nav, practice, tel } from '@/lib/content';
import { Icon } from './Icon';
import { MessageButton } from './MessageButton';

const MENU = [{ href: '/', label: 'Home' }, ...nav, { href: '/faq', label: 'FAQ' }];

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
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [open]);
  const cur = (href: string) => (pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined);

  return (
    <header className={`hdr${compact ? ' compact' : ''}${open ? ' open' : ''}`}>
      <div className="wrap">
        <Link className="brand" href="/" aria-label="Dr Nontu Medical Practice, home">
          <img src="/brand/logo.webp" alt="Dr Nontu Medical Practice" width={1167} height={369} />
        </Link>
        <nav className="nav" aria-label="Main">
          {nav.map((n) => <Link key={n.href} className="link-u" href={n.href} aria-current={cur(n.href)}>{n.label}</Link>)}
        </nav>
        <div className="hdr-actions">
          <Link className="btn" href="/book" data-track="header_book">Book a visit <Icon name="arrow" /></Link>
          <button className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}><span /><span /></button>
        </div>
      </div>
      {/* any tap on a link closes the menu, including a link to the page you are already on */}
      <nav className="mnav" aria-label="Mobile" aria-hidden={!open} onClick={(e) => { if ((e.target as Element).closest('a')) setOpen(false); }}>
        {MENU.map((n) => <Link key={n.href} className="mnav-link" href={n.href} aria-current={n.href === '/' ? (pathname === '/' ? 'page' : undefined) : cur(n.href)} tabIndex={open ? 0 : -1}>{n.label}</Link>)}
        <div className="mnav-actions">
          <Link className="btn" href="/book" tabIndex={open ? 0 : -1}>Book an appointment <Icon name="arrow" /></Link>
          <div className="mnav-quick">
            <a className="btn btn--ghost" href={tel(practice.phones[0])} tabIndex={open ? 0 : -1}><Icon name="phone" /> Call</a>
            <MessageButton short tabIndex={open ? 0 : -1} />
          </div>
        </div>
      </nav>
    </header>
  );
}
