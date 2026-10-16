import Link from 'next/link';
import { hasWhatsApp, waLink, type MessageTopic } from '@/lib/content';
import { Icon, WhatsAppIcon } from './Icon';

/** WhatsApp when the practice has a WhatsApp number, otherwise a link to the contact form. */
export function MessageButton({ className = 'btn btn--ghost', text, topic, label, short, compact, track, tabIndex }: {
  className?: string; text?: string; topic?: MessageTopic; label?: string;
  /** short: always the one-word label. compact: the full label, shortened on phones. */
  short?: boolean; compact?: boolean; track?: string; tabIndex?: number;
}) {
  const words = (full: string, one: string) => label ?? (short ? one : compact ? <><span className="sm-hide">{full}</span><span className="sm-only">{one}</span></> : full);
  if (hasWhatsApp) return <a className={className} href={waLink(text)} data-track={track ?? 'whatsapp'} tabIndex={tabIndex}><WhatsAppIcon /> {words('WhatsApp us', 'WhatsApp')}</a>;
  return <Link className={className} href={`/contact${topic && topic !== 'general' ? `?topic=${topic}` : ''}#message`} data-track={track ?? 'message'} tabIndex={tabIndex}><Icon name="mail" /> {words('Send a message', 'Message')}</Link>;
}
