'use client';
/** A submit button that asks first. Used for anything that can't be undone. */
export function ConfirmButton({ message, className = 'b b--danger', name, value, children }: {
  message: string; className?: string; name?: string; value?: string; children: React.ReactNode;
}) {
  return <button className={className} name={name} value={value} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}
