import { STATUS_LABEL } from '@/lib/admin-data';

export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  if (typeof sp.ok === 'string') return <div className="flash" role="status">{sp.ok}</div>;
  if (typeof sp.err === 'string') return <div className="flash flash--warn" role="alert">{sp.err}</div>;
  return null;
}
export const Badge = ({ s }: { s: string }) => <span className={`badge-s s-${s}`}>{STATUS_LABEL[s] ?? s}</span>;
export function Head({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="adm-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>{children && <div className="adm-actions">{children}</div>}</div>;
}
export const TYPE_LABEL: Record<string, string> = { in_person: 'In person', house_call: 'House call', virtual: 'Virtual' };
