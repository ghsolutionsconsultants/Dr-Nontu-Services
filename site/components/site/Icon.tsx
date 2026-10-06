// Line icons drawn for the practice: one 1.5px stroke family.
const P: Record<string, React.ReactNode> = {
  clinic: <><path d="M5 27V9l11-5 11 5v18" /><path d="M12 27v-6a4 4 0 0 1 8 0v6" /><path d="M3 27h26" /><path d="M16 9v6M13 12h6" /></>,
  house: <><path d="M4 15 16 5l12 10" /><path d="M7 13v14h18V13" /><path d="M13 27v-7h6v7" /><path d="M22 7v4" /></>,
  screen: <><rect x="4" y="6" width="24" height="16" rx="2" /><path d="M12 27h8M16 22v5" /><path d="M8 14h5l1.5-3 2 6 1.5-3H24" /></>,
  leaf: <><path d="M6 26C10 14 18 7 27 5c-1 10-8 18-21 21Z" /><path d="M6 26 18 14" /></>,
  plaster: <g transform="rotate(-40 16 16)"><rect x="3" y="11" width="26" height="10" rx="5" /><rect x="11" y="12" width="10" height="8" rx="1" /></g>,
  pulse: <><path d="M16 27S4 20 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 20 16 27 16 27Z" /><path d="M7 16h5l2-4 3 7 2-3h6" /></>,
  cal: <><rect x="5" y="7" width="22" height="20" rx="2" /><path d="M5 13h22M11 4v6M21 4v6" /><path d="m12 20 3 3 5-6" /></>,
  pin: <><path d="M16 28s9-8.5 9-15a9 9 0 0 0-18 0c0 6.5 9 15 9 15Z" /><circle cx="16" cy="13" r="3" /></>,
  phone: <><path d="M9 4h4l2 6-3 2a14 14 0 0 0 8 8l2-3 6 2v4a3 3 0 0 1-3 3A21 21 0 0 1 6 7a3 3 0 0 1 3-3Z" /></>,
  mail: <><rect x="4" y="7" width="24" height="18" rx="2" /><path d="m5 9 11 8 11-8" /></>,
  ear: <><path d="M10 12a6 6 0 1 1 12 0c0 4-4 5-4 9a4 4 0 0 1-8 0" /><path d="M14 12a2 2 0 1 1 4 0" /></>,
  shield: <><path d="M16 4 6 8v7c0 6 4 11 10 13 6-2 10-7 10-13V8Z" /><path d="m11 16 4 4 7-8" /></>,
  family: <><circle cx="11" cy="9" r="3" /><circle cx="22" cy="12" r="2.4" /><path d="M5 27v-5a6 6 0 0 1 12 0v5" /><path d="M17 27v-3a5 5 0 0 1 10 0v3" /></>,
  card: <><rect x="4" y="8" width="24" height="17" rx="2" /><path d="M4 13h24M8 20h6" /></>,
  arrow: <path d="M2 8h11M9 4l4 4-4 4" />,
};
const MODE: Record<string, string> = { clinic: 'clinic', house: 'house', screen: 'screen' };

export function Icon({ name, className, title }: { name: keyof typeof P | string; className?: string; title?: string }) {
  const small = name === 'arrow';
  return (
    <svg className={className} viewBox={small ? '0 0 16 16' : '0 0 32 32'} fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {P[MODE[name] ?? name]}
    </svg>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden>
      <path fill="currentColor" d="M8 1.5a6.5 6.5 0 0 0-5.6 9.8L1.5 14.5l3.3-.9A6.5 6.5 0 1 0 8 1.5Zm3.2 9c-.1.4-.8.8-1.1.8-.3 0-.6.2-2.1-.4a7.2 7.2 0 0 1-2.9-2.6c-.2-.3-.7-1-.7-1.8s.4-1.2.6-1.4c.1-.2.3-.2.4-.2h.3c.1 0 .2 0 .4.3l.5 1.3c.1.1.1.2 0 .4l-.2.3-.3.3c-.1.1-.2.2-.1.4.1.2.5.8 1 1.3.7.6 1.3.8 1.5.9.2.1.3.1.4 0l.6-.7c.1-.2.3-.2.4-.1l1.3.6c.2.1.3.1.3.2.1 0 .1.4-.1.9Z" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden>
      <path d="M38 21.9 A44 44 0 1 0 82 98.1" fill="none" stroke="#34330F" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M60 16 A44 44 0 0 1 98.1 82" fill="none" stroke="#C69036" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M14 34 C14 52 18 62 28 64 M42 34 C42 52 38 62 28 64" fill="none" stroke="#C69036" strokeWidth="4" strokeLinecap="round" />
      <circle cx="14" cy="32" r="3.4" fill="#34330F" /><circle cx="42" cy="32" r="3.4" fill="#34330F" />
      <path d="M28 64 H44 L49 52 L54 74 L59 36 L64 82 L68 56 L71 62 H104" fill="none" stroke="#34330F" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="91" cy="91" r="10" fill="#C69036" /><circle cx="91" cy="91" r="5.5" fill="none" stroke="#E8C988" strokeWidth="1.4" />
    </svg>
  );
}
