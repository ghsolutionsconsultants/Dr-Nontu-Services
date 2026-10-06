import './admin.css';
export const metadata = { title: { default: 'Admin', template: '%s · Admin · Dr Nontu' }, robots: { index: false, follow: false } };
export default function AdminRoot({ children }: { children: React.ReactNode }) { return children; }
