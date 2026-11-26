import { CATEGORY_LABEL, INGREDIENTS, type IngredientCategory } from '../data/ingredients';
import type { SkinProductType } from '../db';

export const TYPE_LABEL: Record<SkinProductType, string> = {
  cleanser: '洗顔', lotion: '化粧水', serum: '美容液', pack: 'パック', emulsion: '乳液・クリーム', sunscreen: '日焼け止め', other: 'その他',
};
export const TYPES = Object.keys(TYPE_LABEL) as SkinProductType[];

export const pill = (on: boolean) =>
  `min-h-10 rounded-full border-2 px-3 text-sm ${on ? 'border-brand-500 bg-brand-50 font-bold text-brand-600' : 'border-stone-200 text-stone-600'}`;

/** 選択肢（1つ選ぶ） */
export function Choice<T extends string>({ value, options, onChange }: { value?: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={pill(value === v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** 複数選択 */
export function MultiChoice<T extends string>({ value, options, onChange, max }: { value: T[]; options: [T, string][]; onChange: (v: T[]) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => {
        const on = value.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => {
              if (on) onChange(value.filter((x) => x !== v));
              else if (!max || value.length < max) onChange([...value, v]);
            }}
            className={pill(on)}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/** 辞書から成分を選ぶ（分類ごと） */
export function IngredientPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {(Object.keys(CATEGORY_LABEL) as IngredientCategory[]).map((c) => (
        <div key={c}>
          <p className="mb-1 text-[11px] text-stone-400">{CATEGORY_LABEL[c]}</p>
          <MultiChoice value={value} options={INGREDIENTS.filter((i) => i.category === c).map((i) => [i.id, i.name] as [string, string])} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold text-stone-600">{label}</p>
      {hint && <p className="mb-1 text-xs text-stone-400">{hint}</p>}
      <div className={hint ? '' : 'mt-1'}>{children}</div>
    </div>
  );
}
