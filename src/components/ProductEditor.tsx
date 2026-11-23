import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, KIND_LABEL, newId, type ProductKind } from '../db';

/** おくすり・肌ケア用品の追加・名前変更・使用をやめる */
export default function ProductEditor({ kind, onClose }: { kind: ProductKind; onClose: () => void }) {
  const products = useLiveQuery(() => db.products.filter((p) => p.kind === kind).sortBy('createdAt'), [kind]);
  const [name, setName] = useState('');

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setName('');
    await db.products.add({ id: newId(), name: n, kind, active: true, createdAt: new Date().toISOString() });
  };

  const active = products?.filter((p) => p.active) ?? [];
  const stopped = products?.filter((p) => !p.active) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">使用中の{KIND_LABEL[kind]}</h3>
          <button onClick={onClose} className="h-10 rounded-full bg-brand-500 px-5 font-bold text-white">
            完了
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={kind === 'medicine' ? '例: ベピオゲル' : '例: 化粧水'}
            className="h-12 min-w-0 flex-1 rounded-xl border-2 border-stone-200 px-3"
          />
          <button onClick={add} className="h-12 shrink-0 whitespace-nowrap rounded-xl bg-brand-500 px-4 font-bold text-white disabled:opacity-40" disabled={!name.trim()}>
            追加
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {active.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <input
                defaultValue={p.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== p.name) db.products.update(p.id, { name: v });
                  else e.target.value = p.name;
                }}
                className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 px-3"
                aria-label="名前"
              />
              <button onClick={() => db.products.update(p.id, { active: false })} className="h-11 shrink-0 whitespace-nowrap px-1 text-sm text-stone-500">
                やめる
              </button>
            </li>
          ))}
          {products && active.length === 0 && <li className="text-sm text-stone-400">まだありません。上の欄から追加してください。</li>}
        </ul>
        <p className="mt-2 text-[11px] text-stone-400">名前は欄を押すと直せます。「やめる」にしても、過去の記録は残ります。</p>

        {stopped.length > 0 && (
          <div className="mt-5">
            <p className="mb-1 text-sm font-bold text-stone-500">使用をやめたもの</p>
            <ul className="space-y-1">
              {stopped.map((p) => (
                <li key={p.id} className="flex h-11 items-center justify-between rounded-xl bg-stone-50 px-3 text-stone-500">
                  {p.name}
                  <button onClick={() => db.products.update(p.id, { active: true })} className="h-10 text-sm text-brand-600">
                    再開する
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
