import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, type Food, type MealItem } from '../db';
import { fmtNutrient, NUTRIENTS, scale, sumNutrients, type NutrientDef } from '../lib/nutrients';
import Card from './Card';
import Sheet from './Sheet';
import FoodEditor from './FoodEditor';

const K = (key: string) => NUTRIENTS.find((n) => n.key === key)!;

/** 食べたもの・カロリー */
export default function MealCard({
  meals, setMeals, calories, setCalories,
}: {
  meals: MealItem[];
  setMeals: (m: MealItem[]) => void;
  calories: string;
  setCalories: (s: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [amountFor, setAmountFor] = useState<{ food?: Food; item?: MealItem }>();
  const [detail, setDetail] = useState(false);
  const { total } = sumNutrients(meals.map((m) => m.nutrients));

  return (
    <Card title="食べたもの・カロリー">
      {meals.length > 0 ? (
        <>
          <div className="mb-3 flex items-end justify-between rounded-xl bg-brand-50 px-4 py-3">
            <div>
              <p className="text-xs text-brand-700">合計</p>
              <p className="text-brand-600">
                <span className="text-3xl font-bold">{fmtNutrient(K('kcal'), total.kcal)}</span>
                <span className="ml-1 text-sm">kcal</span>
              </p>
            </div>
            <button onClick={() => setDetail(true)} className="h-10 rounded-full border-2 border-brand-300 bg-white px-4 text-sm font-bold text-brand-600">
              栄養の詳細
            </button>
          </div>
          <p className="mb-2 text-center text-xs text-stone-500">
            たんぱく質 {fmtNutrient(K('protein'), total.protein)}g ・ 脂質 {fmtNutrient(K('fat'), total.fat)}g ・ 炭水化物 {fmtNutrient(K('carbs'), total.carbs)}g
          </p>
          <ul className="divide-y divide-stone-100">
            {meals.map((m) => (
              <li key={m.id} className="flex items-center gap-2 py-2">
                <button className="flex min-h-11 flex-1 items-center justify-between text-left" onClick={() => setAmountFor({ item: m })}>
                  <span className="text-stone-700">
                    {m.name}
                    <span className="ml-2 text-sm text-stone-400">{m.grams}g</span>
                  </span>
                  <span className="text-sm font-bold text-stone-600">{fmtNutrient(K('kcal'), m.nutrients.kcal)} kcal</span>
                </button>
                <button aria-label="削除" onClick={() => setMeals(meals.filter((x) => x.id !== m.id))} className="h-11 w-9 shrink-0 text-lg text-stone-300">
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mb-3">
          <p className="mb-1 text-sm font-bold text-stone-600">摂取カロリー</p>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="2000"
              className="h-12 w-36 min-w-0 rounded-xl border-2 border-stone-200 px-3 text-right text-xl focus:border-brand-300 focus:outline-none"
            />
            <span className="shrink-0 text-sm text-stone-500">kcal</span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">食べたものを追加すると、自動で合計されます（外食など、合計だけ入れたい日は直接入力）</p>
        </div>
      )}
      <button onClick={() => setPicking(true)} className="mt-2 h-12 w-full rounded-xl border-2 border-dashed border-brand-300 font-bold text-brand-500">
        ＋ 食べたものを追加
      </button>

      {picking && (
        <FoodPicker
          onClose={() => setPicking(false)}
          onPick={(food) => {
            setPicking(false);
            setAmountFor({ food });
          }}
        />
      )}
      {amountFor && (
        <AmountSheet
          food={amountFor.food}
          item={amountFor.item}
          onClose={() => setAmountFor(undefined)}
          onDone={(item) => {
            setMeals(amountFor.item ? meals.map((m) => (m.id === item.id ? item : m)) : [...meals, item]);
            setAmountFor(undefined);
          }}
        />
      )}
      {detail && <NutritionDetail meals={meals} onClose={() => setDetail(false)} />}
    </Card>
  );
}

function FoodPicker({ onClose, onPick }: { onClose: () => void; onPick: (f: Food) => void }) {
  const foods = useLiveQuery(() => db.foods.filter((f) => f.active).sortBy('createdAt'));
  const [creating, setCreating] = useState(false);
  return (
    <Sheet title="何を食べましたか？" onClose={onClose}>
      <ul className="space-y-2">
        {foods?.map((f) => (
          <li key={f.id}>
            <button onClick={() => onPick(f)} className="flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-stone-100 px-4 py-2 text-left">
              <span>
                {f.name}
                {f.needsCheck && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">要確認</span>}
              </span>
              <span className="shrink-0 text-xs text-stone-400">{Math.round(f.per100.kcal ?? 0)} kcal/100g</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => setCreating(true)} className="mt-3 h-12 w-full rounded-xl border-2 border-dashed border-stone-200 text-sm text-stone-500">
        ＋ 新しい食材を登録する
      </button>
      {creating && <FoodEditor onClose={() => setCreating(false)} />}
    </Sheet>
  );
}

function AmountSheet({ food: f0, item, onClose, onDone }: { food?: Food; item?: MealItem; onClose: () => void; onDone: (m: MealItem) => void }) {
  const dbFood = useLiveQuery(() => (item ? db.foods.get(item.foodId) : undefined), [item?.foodId]);
  const food = f0 ?? dbFood;
  const [grams, setGrams] = useState(item ? String(item.grams) : food?.presets[0] ? String(food.presets[0].grams) : '100');
  const g = Number(grams.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
  const valid = Number.isFinite(g) && g > 0 && g <= 5000;
  // 編集時は保存済みの値を量で比例させる（食材を消していても動くように）
  const per100 = food?.per100 ?? (item ? scale(item.nutrients, 10000 / item.grams) : {});
  const n = valid ? scale(per100, g) : {};
  const name = food?.name ?? item?.name ?? '';

  return (
    <Sheet title={name} onClose={onClose}>
      {food?.note && <p className="-mt-2 mb-3 text-xs text-stone-400">{food.note}</p>}
      {food?.needsCheck && <p className="mb-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">値は目安です。設定の「食材の一覧」から、パッケージの表示に合わせて直せます。</p>}
      {food && food.presets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {food.presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setGrams(String(p.grams))}
              className={`h-11 rounded-xl border-2 px-4 ${String(p.grams) === grams ? 'border-brand-500 bg-brand-50 font-bold text-brand-600' : 'border-stone-200 text-stone-600'}`}
            >
              {p.label}
              <span className="ml-1 text-xs opacity-70">{p.grams}g</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <input
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          inputMode="decimal"
          className="h-14 w-32 rounded-xl border-2 border-stone-200 px-3 text-right text-2xl focus:border-brand-300 focus:outline-none"
          autoFocus={!food?.presets.length}
        />
        <span className="text-stone-500">g</span>
        <span className="ml-auto text-brand-600">
          <span className="text-2xl font-bold">{valid ? Math.round(n.kcal ?? 0) : '—'}</span> kcal
        </span>
      </div>
      {valid && (
        <p className="mt-2 text-right text-xs text-stone-500">
          たんぱく質 {fmtNutrient(K('protein'), n.protein)}g ・ 脂質 {fmtNutrient(K('fat'), n.fat)}g ・ 炭水化物 {fmtNutrient(K('carbs'), n.carbs)}g
        </p>
      )}
      <button
        disabled={!valid}
        onClick={() => onDone({ id: item?.id ?? newId(), foodId: food?.id ?? item!.foodId, name, grams: g, nutrients: n })}
        className="mt-5 h-14 w-full rounded-full bg-brand-500 text-lg font-bold text-white disabled:opacity-40"
      >
        {item ? '量を変更する' : '追加する'}
      </button>
    </Sheet>
  );
}

export function NutritionDetail({ meals, onClose }: { meals: MealItem[]; onClose: () => void }) {
  const { total, missing } = sumNutrients(meals.map((m) => m.nutrients));
  const group = (title: string, defs: NutrientDef[]) => (
    <div className="mb-4">
      <p className="mb-1 text-xs font-bold text-stone-400">{title}</p>
      <div className="divide-y divide-stone-100 rounded-xl border border-stone-100">
        {defs.map((d) => (
          <div key={d.key} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-stone-600">{d.label}</span>
            <span className="font-bold">
              {fmtNutrient(d, total[d.key])}
              <span className="ml-1 text-xs font-normal text-stone-400">{d.unit}</span>
              {missing.has(d.key) && total[d.key] !== undefined && <span className="ml-1 text-[10px] font-normal text-amber-700">以上*</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Sheet title="栄養の詳細（この日の合計）" onClose={onClose}>
      {group('基本', NUTRIENTS.filter((n) => n.group === 'main'))}
      {group('ミネラル', NUTRIENTS.filter((n) => n.group === 'mineral'))}
      {group('ビタミン', NUTRIENTS.filter((n) => n.group === 'vitamin'))}
      {missing.size > 0 && <p className="text-[11px] text-stone-400">* 値が登録されていない食材があるため、実際はこれより多い可能性があります。</p>}
      <p className="mt-2 text-[11px] text-stone-400">食材ごとの値の合計です。</p>
    </Sheet>
  );
}
