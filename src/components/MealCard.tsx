import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, MEAL_SLOT_LABEL, MEAL_SLOTS, newId, type Food, type MealItem, type MealSlot } from '../db';
import { fmtNutrient, NUTRIENTS, scale, sumNutrients, type NutrientDef } from '../lib/nutrients';
import FoldCard from './FoldCard';
import Sheet from './Sheet';
import FoodEditor from './FoodEditor';
import { SlotTemplates, TemplateEditor, TemplateManager } from './TemplateBar';

const K = (key: string) => NUTRIENTS.find((n) => n.key === key)!;

/** 食べたもの・カロリー（朝・昼・夜・間食に分けて記録） */
export default function MealCard({
  meals, setMeals, calories, setCalories, onCaloriesBlur,
}: {
  meals: MealItem[];
  setMeals: (m: MealItem[]) => void;
  calories: string;
  setCalories: (s: string) => void;
  onCaloriesBlur?: () => void;
}) {
  const [picking, setPicking] = useState<MealSlot>();
  const [amountFor, setAmountFor] = useState<{ food?: Food; item?: MealItem; slot?: MealSlot }>();
  const [detail, setDetail] = useState(false);
  const [managing, setManaging] = useState(false);
  const [saveAs, setSaveAs] = useState<{ slot: MealSlot; items: MealItem[] }>();
  const [msg, setMsg] = useState<string>();
  const { total } = sumNutrients(meals.map((m) => m.nutrients));
  const kcalOf = (items: MealItem[]) => Math.round(items.reduce((s, m) => s + (m.nutrients.kcal ?? 0), 0));
  const bySlot = (slot: MealSlot | undefined) => meals.filter((m) => m.slot === slot);
  const unsorted = bySlot(undefined);

  const manual = calories.trim();
  const slotKcal = MEAL_SLOTS.filter((s) => bySlot(s).length).map((s) => `${MEAL_SLOT_LABEL[s]} ${kcalOf(bySlot(s)).toLocaleString('ja-JP')}`);
  const summary = meals.length
    ? `合計 ${fmtNutrient(K('kcal'), total.kcal)} kcal${slotKcal.length ? `（${slotKcal.join('・')}）` : ''}`
    : manual
      ? `${/^\d+$/.test(manual) ? Number(manual).toLocaleString('ja-JP') : manual} kcal（直接入力）`
      : 'まだ記録なし';

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(undefined), 2000);
  };

  const itemRow = (m: MealItem) => (
    <li key={m.id} className="flex items-center gap-2 py-1.5">
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
  );

  return (
    <FoldCard title="食べたもの・カロリー" summary={summary}>
      {meals.length > 0 ? (
        <>
          <div className="mb-2 flex items-end justify-between rounded-xl bg-brand-50 px-4 py-3">
            <div>
              <p className="text-xs text-brand-700">1日の合計</p>
              <p className="text-brand-600">
                <span className="text-3xl font-bold">{fmtNutrient(K('kcal'), total.kcal)}</span>
                <span className="ml-1 text-sm">kcal</span>
              </p>
            </div>
            <button onClick={() => setDetail(true)} className="h-10 rounded-full border-2 border-brand-300 bg-white px-4 text-sm font-bold text-brand-600">
              栄養の詳細
            </button>
          </div>
          <p className="mb-3 text-center text-xs text-stone-500">
            たんぱく質 {fmtNutrient(K('protein'), total.protein)}g ・ 脂質 {fmtNutrient(K('fat'), total.fat)}g ・ 炭水化物 {fmtNutrient(K('carbs'), total.carbs)}g
          </p>
        </>
      ) : (
        <div className="mb-3">
          <p className="mb-1 text-sm font-bold text-stone-600">摂取カロリー（合計だけ入れる場合）</p>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              onBlur={onCaloriesBlur}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="2000"
              className="h-12 w-36 min-w-0 rounded-xl border-2 border-stone-200 px-3 text-right text-xl focus:border-brand-300 focus:outline-none"
            />
            <span className="shrink-0 text-sm text-stone-500">kcal</span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">下の朝・昼・夜に食べたものを入れると自動で合計されます。外食など合計だけ入れたい日は、ここに直接入力してください（入力欄を離れると保存）</p>
        </div>
      )}

      <div className="space-y-3">
        {MEAL_SLOTS.map((slot) => {
          const items = bySlot(slot);
          return (
            <div key={slot} className="rounded-xl border-2 border-stone-100 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-bold text-stone-700">{MEAL_SLOT_LABEL[slot]}</p>
                <p className="text-sm text-stone-500">{items.length ? `${kcalOf(items).toLocaleString('ja-JP')} kcal` : ''}</p>
              </div>
              <SlotTemplates
                slot={slot}
                onApply={(added, name) => {
                  setMeals([...meals, ...added]);
                  flash(`${MEAL_SLOT_LABEL[slot]}に「${name}」を追加しました`);
                }}
              />
              {items.length > 0 && <ul className="mb-1 divide-y divide-stone-100">{items.map(itemRow)}</ul>}
              <div className="flex items-center gap-2">
                <button onClick={() => setPicking(slot)} className="h-11 flex-1 rounded-xl border-2 border-dashed border-brand-200 text-sm font-bold text-brand-500">
                  ＋ 追加
                </button>
                {items.length > 0 && (
                  <button onClick={() => setSaveAs({ slot, items })} className="h-11 shrink-0 px-1 text-xs text-stone-400">
                    テンプレートにする
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {unsorted.length > 0 && (
          <div className="rounded-xl border-2 border-stone-100 p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="font-bold text-stone-700">区分なし</p>
              <p className="text-sm text-stone-500">{kcalOf(unsorted).toLocaleString('ja-JP')} kcal</p>
            </div>
            <p className="mb-1 text-[11px] text-stone-400">区分を分ける前に記録したものです。押すと量の変更や、朝・昼・夜への移動ができます。</p>
            <ul className="divide-y divide-stone-100">{unsorted.map(itemRow)}</ul>
          </div>
        )}
      </div>
      <button onClick={() => setManaging(true)} className="mt-3 h-11 w-full text-sm text-stone-500">
        テンプレートの作成・編集 ›
      </button>

      {msg && (
        <p className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-max max-w-[90%] rounded-full bg-stone-700/85 px-4 py-1.5 text-sm text-white" style={{ bottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
          {msg}
        </p>
      )}

      {picking && (
        <FoodPicker
          onClose={() => setPicking(undefined)}
          onPick={(food) => {
            const slot = picking;
            setPicking(undefined);
            setAmountFor({ food, slot });
          }}
        />
      )}
      {amountFor && (
        <AmountSheet
          food={amountFor.food}
          item={amountFor.item}
          slot={amountFor.item ? amountFor.item.slot : amountFor.slot}
          showSlot
          onClose={() => setAmountFor(undefined)}
          onDone={(item) => {
            setMeals(amountFor.item ? meals.map((m) => (m.id === item.id ? item : m)) : [...meals, item]);
            setAmountFor(undefined);
          }}
        />
      )}
      {detail && <NutritionDetail meals={meals} onClose={() => setDetail(false)} />}
      {managing && <TemplateManager onClose={() => setManaging(false)} />}
      {saveAs && <TemplateEditor fromMeals={saveAs.items} initialSlot={saveAs.slot} onClose={() => setSaveAs(undefined)} />}
    </FoldCard>
  );
}

export function FoodPicker({ onClose, onPick }: { onClose: () => void; onPick: (f: Food) => void }) {
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

export function AmountSheet({ food: f0, item, slot: slot0, showSlot, onClose, onDone }: { food?: Food; item?: MealItem; slot?: MealSlot; showSlot?: boolean; onClose: () => void; onDone: (m: MealItem) => void }) {
  const [slot, setSlot] = useState<MealSlot | undefined>(slot0);
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
      {showSlot && (
        <div className="mt-4">
          <p className="mb-1 text-xs text-stone-400">いつ食べた？</p>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`h-10 rounded-xl border-2 text-sm ${slot === s ? 'border-brand-500 bg-brand-50 font-bold text-brand-600' : 'border-stone-200 text-stone-500'}`}
              >
                {MEAL_SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        disabled={!valid}
        onClick={() => onDone({ id: item?.id ?? newId(), foodId: food?.id ?? item!.foodId, name, grams: g, nutrients: n, ...(slot ? { slot } : {}) })}
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
