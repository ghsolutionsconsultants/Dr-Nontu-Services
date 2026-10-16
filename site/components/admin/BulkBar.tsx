'use client';
import { useEffect, useRef, useState } from 'react';

const OPS: [string, string][] = [['completed', 'Mark completed'], ['no_show', 'Mark no-show'], ['confirmed', 'Mark confirmed'], ['cancelled', 'Cancel'], ['delete', 'Delete permanently']];

/** Lives inside the list's <form>: select all, a live count, and the action to apply to the ticked rows. */
export function BulkBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0), [total, setTotal] = useState(0), [op, setOp] = useState('completed');
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const boxes = () => [...form.querySelectorAll<HTMLInputElement>('input[name="ids"]')];
    const count = () => { setN(boxes().filter((b) => b.checked).length); setTotal(boxes().length); };
    count(); form.addEventListener('change', count);
    return () => form.removeEventListener('change', count);
  }, []);
  const all = (on: boolean) => {
    const form = ref.current?.closest('form');
    form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((b) => { b.checked = on; });
    form?.dispatchEvent(new Event('change'));
  };
  const label = OPS.find(([v]) => v === op)?.[1] ?? '';
  return (
    <div className="bulk" ref={ref}>
      <label className="bulk-all"><input type="checkbox" checked={total > 0 && n === total} onChange={(e) => all(e.target.checked)} aria-label="Select all" /> {n ? `${n} selected` : 'Select all'}</label>
      <select className="sel" name="op" value={op} onChange={(e) => setOp(e.target.value)} aria-label="Action">{OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <button className={`b ${op === 'delete' ? 'b--danger' : 'b--ghost'}`} disabled={!n}
        onClick={(e) => { if ((op === 'delete' || op === 'cancelled') && !confirm(`${label}: ${n} booking${n === 1 ? '' : 's'}?${op === 'delete' ? ' This removes them and their payment records for good.' : ' Patients are not emailed.'}`)) e.preventDefault(); }}>
        Apply to {n || 'selected'}
      </button>
    </div>
  );
}
