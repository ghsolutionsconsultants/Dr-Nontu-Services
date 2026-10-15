'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { hasWhatsApp } from '@/lib/content';
import { MessageButton } from './MessageButton';

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
      <MessageButton className="btn btn--on-dark" short track={hasWhatsApp ? 'mbar_whatsapp' : 'mbar_message'} />
    </div>
  );
}
