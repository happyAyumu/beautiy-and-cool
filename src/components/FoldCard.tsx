import { useState } from 'react';

/** 見出しを押すと開閉するカード（最初は閉じている） */
export default function FoldCard({ title, summary, action, children }: { title: string; summary: string; action?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl bg-white shadow-[0_1px_6px_rgba(120,60,70,0.06)]">
      <div className="flex items-center">
        <button onClick={() => setOpen(!open)} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 py-3 pl-4 text-left" aria-expanded={open}>
          <span className={`shrink-0 text-xs text-stone-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          <span className="min-w-0">
            <span className="block text-base font-bold text-stone-700">{title}</span>
            {!open && <span className="block truncate text-xs text-stone-400">{summary}</span>}
          </span>
        </button>
        {open && action && <div className="shrink-0 pr-3">{action}</div>}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
