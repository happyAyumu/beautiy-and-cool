import type { Score } from '../db';

export const chip = (on: boolean) =>
  `h-11 rounded-xl border-2 text-base transition-colors ${on ? 'border-brand-500 bg-brand-50 font-bold text-brand-600' : 'border-stone-200 bg-white text-stone-500'}`;

/** 1〜5 のボタン。選択中をもう一度押すと未入力に戻る */
export default function ScoreButtons({ value, onChange }: { value?: Score; onChange: (v?: Score) => void }) {
  return (
    <div className="flex gap-2">
      {([1, 2, 3, 4, 5] as Score[]).map((n) => (
        <button key={n} type="button" onClick={() => onChange(value === n ? undefined : n)} className={`${chip(value === n)} flex-1`}>
          {n}
        </button>
      ))}
    </div>
  );
}
