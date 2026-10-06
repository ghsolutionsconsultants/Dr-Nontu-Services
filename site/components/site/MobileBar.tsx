'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { waLink } from '@/lib/content';
import { WhatsAppIcon } from './Icon';

export function MobileBar() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const on = () => setShow(scrollY > innerHeight * .6);
    const r = requestAnimationFrame(on); addEventListener('scroll', on, { passive: true });
    return () => { cancelAnimationFrame(r); removeEventListener('scroll', on); };
  }, []);
  if (pathname.startsWith('/book') || pathname.startsWith('/manage') || pathname.startsWith('/pay')) return null;
  return (
    <div className={`mbar${show ? ' show' : ''}`}>
      <Link className="btn btn--light" href="/book" data-track="mbar_book">Book</Link>
      <a className="btn btn--on-dark" href={waLink()} data-track="mbar_whatsapp"><WhatsAppIcon /> WhatsApp</a>
    </div>
  );
}
