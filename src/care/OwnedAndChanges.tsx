import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, type ChangeNote, type OwnedItem } from '../db';
import { formatLong, todayTokyo } from '../lib/date';
import { ingredientName } from '../data/ingredients';
import Card from '../components/Card';
import Sheet from '../components/Sheet';
import { Choice, Field, IngredientPicker, TYPE_LABEL, TYPES } from './common';

export const CHANGE_KIND_LABEL: Record<ChangeNote['kind'], string> = { new_product: '新しい商品を使い始めた', medicine: '薬を始めた・変えた', other: 'その他' };

export default function OwnedAndChanges() {
  return (
    <div className="space-y-4">
      <OwnedCard />
      <ChangesCard />
    </div>
  );
}

function OwnedCard() {
  const owned = useLiveQuery(() => db.owned.toCollection().sortBy('createdAt'));
  const skincare = useLiveQuery(() => db.products.filter((p) => p.kind === 'skincare' && p.active).toArray());
  const [editing, setEditing] = useState<OwnedItem | 'new'>();
  const inUse = owned?.filter((o) => o.inUse) ?? [];
  const stopped = owned?.filter((o) => !o.inUse) ?? [];
  const importable = (skincare ?? []).filter((p) => !owned?.some((o) => o.name === p.name));

  return (
    <Card title="手持ち品（今使っているもの）">
      <p className="mb-2 text-xs text-stone-500">主な成分を登録しておくと、購入判断で「同じ成分をすでに使っているか」を自動で確かめます。</p>
      <ul className="divide-y divide-stone-100">
        {inUse.map((o) => (
          <li key={o.id}>
            <button onClick={() => setEditing(o)} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left">
              <span className="min-w-0">
                <span className="block text-stone-700">
                  {o.name}
                  <span className="ml-2 text-xs text-stone-400">{TYPE_LABEL[o.type]}</span>
                </span>
                <span className="block truncate text-xs text-stone-400">{o.mainIngredients.length ? o.mainIngredients.map(ingredientName).join('・') : '主な成分: 未登録'}</span>
              </span>
              <span className="text-stone-300">›</span>
            </button>
          </li>
        ))}
        {owned && inUse.length === 0 && <li className="py-2 text-sm text-stone-400">まだありません</li>}
      </ul>
      <button onClick={() => setEditing('new')} className="mt-2 h-12 w-full rounded-xl border-2 border-dashed border-brand-300 font-bold text-brand-500">
        ＋ 手持ち品を登録
      </button>
      {importable.length > 0 && (
        <div className="mt-3 rounded-xl bg-stone-50 p-3">
          <p className="text-xs text-stone-500">「入力する」の使用中の肌ケア用品から取り込めます（毎日の記録は変わりません）</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {importable.map((p) => (
              <button
                key={p.id}
                onClick={() => db.owned.add({ id: newId(), name: p.name, type: 'other', mainIngredients: [], inUse: true, createdAt: new Date().toISOString() })}
                className="min-h-10 rounded-full bg-white px-3 text-sm text-brand-600 shadow-sm"
              >
                ＋ {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {stopped.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-stone-400">使うのをやめたもの</p>
          {stopped.map((o) => (
            <button key={o.id} onClick={() => setEditing(o)} className="flex min-h-10 w-full items-center justify-between text-left text-sm text-stone-500">
              {o.name}
              <span className="text-stone-300">›</span>
            </button>
          ))}
        </div>
      )}
      {editing && <OwnedEditor item={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </Card>
  );
}

function OwnedEditor({ item, onClose }: { item?: OwnedItem; onClose: () => void }) {
  const [d, setD] = useState<OwnedItem>(item ?? { id: newId(), name: '', type: 'lotion', mainIngredients: [], inUse: true, createdAt: new Date().toISOString() });
  const [error, setError] = useState<string>();
  const save = async () => {
    if (!d.name.trim()) return setError('商品名を入れてください');
    await db.owned.put({ ...d, name: d.name.trim() });
    onClose();
  };
  return (
    <Sheet
      title={item ? '手持ち品を編集' : '手持ち品を登録'}
      onClose={onClose}
      right={
        <button onClick={save} className="h-10 shrink-0 rounded-full bg-brand-500 px-5 font-bold text-white">
          保存
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="商品名">
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className="h-12 w-full rounded-xl border-2 border-stone-200 px-3" />
        </Field>
        <Field label="種類">
          <Choice value={d.type} options={TYPES.map((t) => [t, TYPE_LABEL[t]])} onChange={(type) => setD({ ...d, type })} />
        </Field>
        <Field label="主な成分" hint="辞書から選びます（複数可）">
          <IngredientPicker value={d.mainIngredients} onChange={(mainIngredients) => setD({ ...d, mainIngredients })} />
        </Field>
        <Field label="使い始めた日">
          <input type="date" value={d.startedOn ?? ''} max={todayTokyo()} onChange={(e) => setD({ ...d, startedOn: e.target.value || undefined })} className="h-12 w-full rounded-xl border-2 border-stone-200 bg-white px-3" />
        </Field>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={d.inUse} onChange={(e) => setD({ ...d, inUse: e.target.checked })} />
          今も使っている
        </label>
        {error && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {item && (
          <button
            onClick={async () => {
              if (!confirm(`「${item.name}」を手持ち品から削除しますか？`)) return;
              await db.owned.delete(item.id);
              onClose();
            }}
            className="h-11 w-full text-sm text-stone-400"
          >
            削除する
          </button>
        )}
      </div>
    </Sheet>
  );
}

function ChangesCard() {
  const changes = useLiveQuery(() => db.changes.orderBy('date').reverse().toArray());
  const [adding, setAdding] = useState(false);
  return (
    <Card title="変更メモ">
      <p className="mb-2 text-xs text-stone-500">新しい商品や薬を始めた日を残します。悪化したときに「直前に足したもの」を見つけるためと、購入判断の「1つずつ足す」の確認に使います。</p>
      <ul className="divide-y divide-stone-100">
        {changes?.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="block text-xs text-stone-400">
                {formatLong(c.date)}・{CHANGE_KIND_LABEL[c.kind]}
              </span>
              <span className="block text-stone-700">{c.text}</span>
            </span>
            <button
              aria-label="削除"
              onClick={() => confirm('この変更メモを削除しますか？') && db.changes.delete(c.id)}
              className="h-9 w-9 shrink-0 text-lg text-stone-300"
            >
              ×
            </button>
          </li>
        ))}
        {changes && changes.length === 0 && <li className="py-2 text-sm text-stone-400">まだありません</li>}
      </ul>
      <button onClick={() => setAdding(true)} className="mt-2 h-12 w-full rounded-xl border-2 border-dashed border-brand-300 font-bold text-brand-500">
        ＋ 変更メモを追加
      </button>
      {adding && <ChangeEditor onClose={() => setAdding(false)} />}
    </Card>
  );
}

function ChangeEditor({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(todayTokyo());
  const [kind, setKind] = useState<ChangeNote['kind']>('new_product');
  const [text, setText] = useState('');
  const save = async () => {
    if (!text.trim()) return;
    await db.changes.add({ id: newId(), date, kind, text: text.trim(), createdAt: new Date().toISOString() });
    onClose();
  };
  return (
    <Sheet
      title="変更メモを追加"
      onClose={onClose}
      right={
        <button onClick={save} disabled={!text.trim()} className="h-10 shrink-0 rounded-full bg-brand-500 px-5 font-bold text-white disabled:opacity-40">
          保存
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="日付">
          <input type="date" value={date} max={todayTokyo()} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-12 w-full rounded-xl border-2 border-stone-200 bg-white px-3" />
        </Field>
        <Field label="種類">
          <Choice value={kind} options={Object.entries(CHANGE_KIND_LABEL) as [ChangeNote['kind'], string][]} onChange={setKind} />
        </Field>
        <Field label="内容">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="例: ○○の美容液を使い始めた" className="h-12 w-full rounded-xl border-2 border-stone-200 px-3" />
        </Field>
      </div>
    </Sheet>
  );
}
