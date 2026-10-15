'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MemberActions({ token, live }: { token: string; live: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const call = async (action: 'card' | 'cancel') => {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/membership/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(j.error); return; }
    if (action === 'card') window.location.assign(j.url);
    else { setConfirm(false); router.refresh(); }
  };
  if (!live) return null;
  return (
    <>
      <button className="btn btn--ghost" disabled={busy} onClick={() => call('card')}>Update card</button>
      {!confirm ? <button className="btn btn--ghost" disabled={busy} onClick={() => setConfirm(true)}>Cancel membership</button>
        : <button className="btn" disabled={busy} onClick={() => call('cancel')}>Yes, cancel my membership</button>}
      {msg && <p className="notice" role="status" style={{ flexBasis: '100%' }}>{msg}</p>}
    </>
  );
}
