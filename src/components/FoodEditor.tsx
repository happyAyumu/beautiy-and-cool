import { useState } from 'react';
import { db, newId, type Food } from '../db';
import { NUTRIENTS, type NutrientKey, type Nutrients } from '../lib/nutrients';
import Sheet from './Sheet';

const num = (s: string) => {
  const t = s.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[，,．]/g, '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** 食材の追加・編集。パッケージの「○g あたり」の値をそのまま入れられる */
export default function FoodEditor({ food, onClose }: { food?: Food; onClose: () => void }) {
  const [name, setName] = useState(food?.name ?? '');
  const [note, setNote] = useState(food?.note ?? '');
  const [basis, setBasis] = useState('100');
  const [vals, setVals] = useState<Record<NutrientKey, string>>(() => {
    const o = {} as Record<NutrientKey, string>;
    NUTRIENTS.forEach((n) => (o[n.key] = food?.per100[n.key]?.toString() ?? ''));
    return o;
  });
  const [presets, setPresets] = useState(() => [...(food?.presets ?? []), { label: '', grams: 0 }].map((p) => ({ label: p.label, grams: p.grams ? String(p.grams) : '' })));
  const [error, setError] = useState<string>();

  // 「何g あたり」を変えたら、表示中の値もその量に合わせて換算する
  const changeBasis = (b: string) => {
    const from = num(basis);
    const to = num(b);
    setBasis(b);
    if (!from || !to || Number.isNaN(from) || Number.isNaN(to)) return;
    const next = { ...vals };
    NUTRIENTS.forEach((n) => {
      const v = num(vals[n.key]);
      if (v !== undefined && !Number.isNaN(v)) next[n.key] = String(Math.round(((v * to) / from) * 1000) / 1000);
    });
    setVals(next);
  };

  const save = async () => {
    if (!name.trim()) return setError('名前を入れてください');
    const b = num(basis);
    if (!b || Number.isNaN(b)) return setError('「何g あたり」を正しく入れてください');
    const per100: Nutrients = {};
    for (const n of NUTRIENTS) {
      const v = num(vals[n.key]);
      if (Number.isNaN(v)) return setError(`${n.label}の値が数字ではありません`);
      if (v !== undefined) per100[n.key] = Math.round(((v * 100) / b) * 1000) / 1000;
    }
    if (per100.kcal === undefined) return setError('エネルギー（kcal）は必ず入れてください');
    const ps = presets
      .map((p) => ({ label: p.label.trim(), grams: num(p.grams) }))
      .filter((p): p is { label: string; grams: number } => !!p.label && !!p.grams && !Number.isNaN(p.grams));
    const data = { name: name.trim(), note: note.trim() || undefined, per100, presets: ps, needsCheck: undefined };
    if (food) await db.foods.update(food.id, data);
    else await db.foods.add({ id: newId(), ...data, active: true, createdAt: new Date().toISOString() });
    onClose();
  };

  const input = 'h-11 w-full min-w-0 rounded-xl border-2 border-stone-200 px-3 text-right';

  return (
    <Sheet
      title={food ? '食材を編集' : '食材を登録'}
      onClose={onClose}
      right={
        <button onClick={save} className="h-10 shrink-0 rounded-full bg-brand-500 px-5 font-bold text-white">
          保存
        </button>
      }
    >
      {food?.needsCheck && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          この食材の値は目安です。パッケージの栄養成分表示を見て直し、保存してください。保存すると「要確認」が消えます。
        </p>
      )}
      <label className="text-sm font-bold text-stone-600">名前</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="mb-3 mt-1 h-11 w-full rounded-xl border-2 border-stone-200 px-3" />
      <label className="text-sm font-bold text-stone-600">メモ（何の重さか など）</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} className="mb-4 mt-1 h-11 w-full rounded-xl border-2 border-stone-200 px-3 text-sm" />

      <div className="mb-2 flex items-center gap-2 rounded-xl bg-brand-50 p-3">
        <input value={basis} onChange={(e) => changeBasis(e.target.value)} inputMode="decimal" className="h-10 w-20 rounded-lg border-2 border-brand-200 bg-white px-2 text-right" />
        <span className="text-sm text-brand-700">g あたりの値を入れる</span>
      </div>
      <p className="mb-3 text-[11px] text-stone-400">
        パッケージに「1本（60g）当たり」とあれば 60 にして、その値をそのまま入れてください。100g あたりに直して保存します。わからない項目は空欄で大丈夫です。
      </p>

      <div className="space-y-2">
        {NUTRIENTS.map((n) => (
          <div key={n.key} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-sm text-stone-600">{n.label}</span>
            <input
              value={vals[n.key]}
              inputMode="decimal"
              onChange={(e) => setVals({ ...vals, [n.key]: e.target.value })}
              className={input}
              placeholder={n.key === 'kcal' ? '必須' : ''}
            />
            <span className="w-10 shrink-0 text-xs text-stone-400">{n.unit}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm font-bold text-stone-600">よく使う量（ボタンになります）</p>
      <div className="mt-2 space-y-2">
        {presets.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={p.label}
              placeholder="例: 1本"
              onChange={(e) => {
                const next = presets.map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
                if (i === presets.length - 1 && e.target.value) next.push({ label: '', grams: '' });
                setPresets(next);
              }}
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-stone-200 px-3"
            />
            <input
              value={p.grams}
              inputMode="decimal"
              placeholder="g"
              onChange={(e) => setPresets(presets.map((x, j) => (j === i ? { ...x, grams: e.target.value } : x)))}
              className="h-11 w-20 rounded-xl border-2 border-stone-200 px-3 text-right"
            />
            <span className="text-xs text-stone-400">g</span>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {food && (
        <button
          onClick={async () => {
            if (!confirm(`「${food.name}」を一覧から外しますか？（過去の記録は残ります）`)) return;
            await db.foods.update(food.id, { active: false });
            onClose();
          }}
          className="mt-6 h-11 w-full text-sm text-stone-400"
        >
          この食材を一覧から外す
        </button>
      )}
    </Sheet>
  );
}
