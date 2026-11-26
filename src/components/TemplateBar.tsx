import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, MEAL_SLOT_LABEL, MEAL_SLOTS, newId, templateSlot, type Food, type MealItem, type MealSlot, type MealTemplate } from '../db';
import { scale } from '../lib/nutrients';
import Sheet from './Sheet';
import { AmountSheet, FoodPicker } from './MealCard';

/** テンプレートから、今の食材の値で食べたものを作る */
export async function expand(t: MealTemplate, slot: MealSlot): Promise<MealItem[]> {
  const foods = await db.foods.bulkGet(t.items.map((i) => i.foodId));
  return t.items.flatMap((it, i) => {
    const f = foods[i];
    if (!f) return [];
    return [{ id: newId(), foodId: f.id, name: f.name, grams: it.grams, nutrients: scale(f.per100, it.grams), slot }];
  });
}

/** テンプレート一覧と、それぞれの kcal */
export function useTemplates() {
  return useLiveQuery(async () => {
    const templates = await db.templates.toCollection().sortBy('createdAt');
    const foods = new Map((await db.foods.toArray()).map((f) => [f.id, f]));
    const kcal: Record<string, number> = {};
    for (const t of templates) kcal[t.id] = Math.round(t.items.reduce((s, it) => s + ((foods.get(it.foodId)?.per100.kcal ?? 0) * it.grams) / 100, 0));
    return { templates, kcal };
  });
}

/** 区分ごとのテンプレートボタン。その区分のもの＋区分なしのものを出す */
export function SlotTemplates({ slot, onApply }: { slot: MealSlot; onApply: (items: MealItem[], name: string) => void }) {
  const data = useTemplates();
  const list = data?.templates.filter((t) => {
    const s = templateSlot(t);
    return s === slot || s === undefined;
  });
  if (!list?.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {list.map((t) => (
        <button
          key={t.id}
          onClick={async () => onApply(await expand(t, slot), t.name)}
          className="flex min-h-11 flex-col items-start justify-center rounded-xl border-2 border-brand-200 bg-brand-50 px-3 py-1 text-left"
        >
          <span className="text-sm font-bold text-brand-700">＋ {t.name}</span>
          <span className="text-[11px] text-brand-600/70">
            {t.items.length}品・{data!.kcal[t.id]?.toLocaleString('ja-JP')} kcal
          </span>
        </button>
      ))}
    </div>
  );
}

/** テンプレートの一覧（作成・編集） */
export function TemplateManager({ onClose }: { onClose: () => void }) {
  const data = useTemplates();
  const [editing, setEditing] = useState<MealTemplate | 'new'>();
  return (
    <Sheet title="食事のテンプレート" onClose={onClose}>
      <p className="-mt-2 mb-3 text-xs text-stone-400">朝・昼・夜の定番を登録しておくと、その区分のところにボタンが出ます。</p>
      <ul className="space-y-2">
        {data?.templates.map((t) => {
          const s = templateSlot(t);
          return (
            <li key={t.id}>
              <button onClick={() => setEditing(t)} className="flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-stone-100 px-4 py-2 text-left">
                <span>
                  {s && <span className="mr-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">{MEAL_SLOT_LABEL[s]}</span>}
                  {t.name}
                </span>
                <span className="shrink-0 text-xs text-stone-400">
                  {t.items.length}品・{data.kcal[t.id]?.toLocaleString('ja-JP')} kcal ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={() => setEditing('new')} className="mt-3 h-12 w-full rounded-xl border-2 border-dashed border-brand-300 font-bold text-brand-500">
        ＋ 新しいテンプレート
      </button>
      {editing && <TemplateEditor template={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </Sheet>
  );
}

type Row = { key: string; foodId: string; grams: number };

export function TemplateEditor({
  template, fromMeals, initialSlot, onClose,
}: {
  template?: MealTemplate;
  fromMeals?: MealItem[];
  initialSlot?: MealSlot;
  onClose: () => void;
}) {
  const [slot, setSlot] = useState<MealSlot | undefined>(template ? templateSlot(template) : initialSlot);
  const defaultName = (s?: MealSlot) => (s ? (s === 'snack' ? '間食' : `${MEAL_SLOT_LABEL[s]}の定番`) : '');
  const [name, setName] = useState(template?.name ?? defaultName(initialSlot));
  const [rows, setRows] = useState<Row[]>(() =>
    (template?.items ?? fromMeals?.map((m) => ({ foodId: m.foodId, grams: m.grams })) ?? []).map((i) => ({ key: newId(), ...i })),
  );
  const foods = useLiveQuery(async () => new Map((await db.foods.toArray()).map((f) => [f.id, f])));
  const [picking, setPicking] = useState(false);
  const [amount, setAmount] = useState<{ food: Food; row?: Row }>();
  const [error, setError] = useState<string>();

  const itemOf = (r: Row): MealItem | undefined => {
    const f = foods?.get(r.foodId);
    return f && { id: r.key, foodId: f.id, name: f.name, grams: r.grams, nutrients: scale(f.per100, r.grams) };
  };
  const total = Math.round(rows.reduce((s, r) => s + (itemOf(r)?.nutrients.kcal ?? 0), 0));

  const save = async () => {
    if (!name.trim()) return setError('名前を入れてください（例: 朝の定番）');
    if (!rows.length) return setError('食材を1つ以上追加してください');
    const data = { name: name.trim(), slot, items: rows.map(({ foodId, grams }) => ({ foodId, grams })) };
    if (template) await db.templates.update(template.id, data);
    else await db.templates.add({ id: newId(), ...data, createdAt: new Date().toISOString() });
    onClose();
  };

  return (
    <Sheet
      title={template ? 'テンプレートを編集' : '新しいテンプレート'}
      onClose={onClose}
      right={
        <button onClick={save} className="h-10 shrink-0 rounded-full bg-brand-500 px-5 font-bold text-white">
          保存
        </button>
      }
    >
      <p className="text-sm font-bold text-stone-600">いつの食事？</p>
      <div className="mb-3 mt-1 grid grid-cols-4 gap-2">
        {MEAL_SLOTS.map((s) => (
          <button
            key={s}
            onClick={() => {
              const next = slot === s ? undefined : s;
              if (!name.trim() || name === defaultName(slot)) setName(defaultName(next));
              setSlot(next);
            }}
            className={`h-11 rounded-xl border-2 ${slot === s ? 'border-brand-500 bg-brand-50 font-bold text-brand-600' : 'border-stone-200 text-stone-500'}`}
          >
            {MEAL_SLOT_LABEL[s]}
          </button>
        ))}
      </div>
      <label className="text-sm font-bold text-stone-600">名前</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 朝の定番" className="mb-4 mt-1 h-12 w-full rounded-xl border-2 border-stone-200 px-3" />

      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-bold text-stone-600">食材</p>
        <p className="text-brand-600">
          合計 <span className="text-xl font-bold">{total.toLocaleString('ja-JP')}</span> kcal
        </p>
      </div>
      <ul className="divide-y divide-stone-100">
        {rows.map((r) => {
          const it = itemOf(r);
          return (
            <li key={r.key} className="flex items-center gap-2 py-1">
              <button className="flex min-h-11 flex-1 items-center justify-between text-left" onClick={() => foods?.get(r.foodId) && setAmount({ food: foods.get(r.foodId)!, row: r })}>
                <span className="text-stone-700">
                  {it?.name ?? '（削除された食材）'}
                  <span className="ml-2 text-sm text-stone-400">{r.grams}g</span>
                </span>
                <span className="text-sm font-bold text-stone-600">{Math.round(it?.nutrients.kcal ?? 0)} kcal</span>
              </button>
              <button aria-label="削除" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="h-11 w-9 shrink-0 text-lg text-stone-300">
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={() => setPicking(true)} className="mt-2 h-12 w-full rounded-xl border-2 border-dashed border-brand-300 font-bold text-brand-500">
        ＋ 食材を追加
      </button>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {template && (
        <button
          onClick={async () => {
            if (!confirm(`テンプレート「${template.name}」を削除しますか？（記録済みの食事は消えません）`)) return;
            await db.templates.delete(template.id);
            onClose();
          }}
          className="mt-6 h-11 w-full text-sm text-stone-400"
        >
          このテンプレートを削除
        </button>
      )}

      {picking && (
        <FoodPicker
          onClose={() => setPicking(false)}
          onPick={(f) => {
            setPicking(false);
            setAmount({ food: f });
          }}
        />
      )}
      {amount && (
        <AmountSheet
          food={amount.food}
          item={amount.row && itemOf(amount.row)}
          onClose={() => setAmount(undefined)}
          onDone={(m) => {
            setRows(amount.row ? rows.map((r) => (r.key === amount.row!.key ? { ...r, grams: m.grams } : r)) : [...rows, { key: newId(), foodId: m.foodId, grams: m.grams }]);
            setAmount(undefined);
          }}
        />
      )}
    </Sheet>
  );
}
