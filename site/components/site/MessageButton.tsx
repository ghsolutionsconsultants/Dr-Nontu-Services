import Link from 'next/link';
import { hasWhatsApp, waLink, type MessageTopic } from '@/lib/content';
import { Icon, WhatsAppIcon } from './Icon';

/** WhatsApp when the practice has a WhatsApp number, otherwise a link to the contact form. */
export function MessageButton({ className = 'btn btn--ghost', text, topic, label, short, track }: {
  className?: string; text?: string; topic?: MessageTopic; label?: string; short?: boolean; track?: string;
}) {
  if (hasWhatsApp) return <a className={className} href={waLink(text)} data-track={track ?? 'whatsapp'}><WhatsAppIcon /> {label ?? (short ? 'WhatsApp' : 'WhatsApp us')}</a>;
  return <Link className={className} href={`/contact${topic && topic !== 'general' ? `?topic=${topic}` : ''}#message`} data-track={track ?? 'message'}><Icon name="mail" /> {label ?? (short ? 'Message' : 'Send a message')}</Link>;
}
