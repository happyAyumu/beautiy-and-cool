import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, type MealItem, type MealTemplate } from '../db';
import { scale } from '../lib/nutrients';
import Sheet from './Sheet';
import { AmountSheet, FoodPicker } from './MealCard';
import type { Food } from '../db';

/** テンプレートから、今の食材の値で食べたものを作る */
async function expand(t: MealTemplate): Promise<MealItem[]> {
  const foods = await db.foods.bulkGet(t.items.map((i) => i.foodId));
  return t.items.flatMap((it, i) => {
    const f = foods[i];
    if (!f) return [];
    return [{ id: newId(), foodId: f.id, name: f.name, grams: it.grams, nutrients: scale(f.per100, it.grams) }];
  });
}

/** テンプレートの kcal（表示用） */
function useTemplateKcal(templates: MealTemplate[] | undefined) {
  return useLiveQuery(async () => {
    const out: Record<string, number> = {};
    for (const t of templates ?? []) {
      const items = await expand(t);
      out[t.id] = Math.round(items.reduce((s, m) => s + (m.nutrients.kcal ?? 0), 0));
    }
    return out;
  }, [templates]);
}

/** カロリー画面の「テンプレートから追加」 */
export default function TemplateBar({ meals, onApply }: { meals: MealItem[]; onApply: (items: MealItem[]) => void }) {
  const templates = useLiveQuery(() => db.templates.toCollection().sortBy('createdAt'));
  const kcal = useTemplateKcal(templates);
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<MealTemplate | 'new' | { fromMeals: MealItem[] }>();
  const [msg, setMsg] = useState<string>();

  const apply = async (t: MealTemplate) => {
    const items = await expand(t);
    onApply(items);
    setMsg(`「${t.name}」を追加しました`);
    setTimeout(() => setMsg(undefined), 2000);
  };

  return (
    <div className="mb-4 border-b border-stone-100 pb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-stone-600">テンプレートから追加</p>
        <button onClick={() => setManaging(true)} className="h-9 text-sm text-stone-400">
          作成・編集 ›
        </button>
      </div>
      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button key={t.id} onClick={() => apply(t)} className="flex min-h-14 flex-col items-start justify-center rounded-xl border-2 border-brand-200 bg-brand-50 px-3 py-2 text-left">
              <span className="font-bold text-brand-700">＋ {t.name}</span>
              <span className="text-xs text-brand-600/70">
                {t.items.length}品・{kcal?.[t.id]?.toLocaleString('ja-JP') ?? '…'} kcal
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => setEditing('new')} className="h-12 w-full rounded-xl border-2 border-dashed border-stone-200 text-sm text-stone-400">
          ＋ 朝・昼・夜の定番をテンプレートにする
        </button>
      )}
      {meals.length > 0 && (
        <button onClick={() => setEditing({ fromMeals: meals })} className="mt-2 h-10 w-full text-xs text-stone-400">
          この日の食べたものをテンプレートとして保存
        </button>
      )}
      {msg && <p className="mt-2 rounded-xl bg-brand-50 p-2 text-center text-sm font-bold text-brand-700">{msg}</p>}

      {managing && (
        <Sheet title="食事のテンプレート" onClose={() => setManaging(false)}>
          <ul className="space-y-2">
            {templates?.map((t) => (
              <li key={t.id}>
                <button onClick={() => setEditing(t)} className="flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-stone-100 px-4 py-2 text-left">
                  <span>{t.name}</span>
                  <span className="text-xs text-stone-400">
                    {t.items.length}品・{kcal?.[t.id]?.toLocaleString('ja-JP') ?? '…'} kcal ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setEditing('new')} className="mt-3 h-12 w-full rounded-xl border-2 border-dashed border-brand-300 font-bold text-brand-500">
            ＋ 新しいテンプレート
          </button>
        </Sheet>
      )}
      {editing && (
        <TemplateEditor
          template={typeof editing === 'object' && 'id' in editing ? editing : undefined}
          fromMeals={typeof editing === 'object' && 'fromMeals' in editing ? editing.fromMeals : undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

type Row = { key: string; foodId: string; grams: number };

function TemplateEditor({ template, fromMeals, onClose }: { template?: MealTemplate; fromMeals?: MealItem[]; onClose: () => void }) {
  const [name, setName] = useState(template?.name ?? '');
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
    const data = { name: name.trim(), items: rows.map(({ foodId, grams }) => ({ foodId, grams })) };
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
      <label className="text-sm font-bold text-stone-600">名前</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 朝の定番" className="mb-2 mt-1 h-12 w-full rounded-xl border-2 border-stone-200 px-3" />
      <div className="mb-3 flex flex-wrap gap-2">
        {['朝の定番', '昼の定番', '夜の定番', '間食'].map((n) => (
          <button key={n} onClick={() => setName(n)} className="h-9 rounded-full bg-stone-100 px-3 text-sm text-stone-600">
            {n}
          </button>
        ))}
      </div>

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
