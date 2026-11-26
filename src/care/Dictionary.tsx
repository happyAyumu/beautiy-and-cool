import { useState } from 'react';
import { CATEGORY_LABEL, CAUTIONS, CONCERN_GUIDES, INGREDIENTS, INGREDIENT_BY_ID, type Ingredient, type IngredientCategory } from '../data/ingredients';
import Card from '../components/Card';
import Sheet from '../components/Sheet';

export const effectText = (i: Ingredient) => `${i.mainEffect}${i.effectCount === 2 ? '（2つ）' : ''}`;

export default function Dictionary() {
  const [guide, setGuide] = useState<string>();
  const [detail, setDetail] = useState<Ingredient>();
  const g = CONCERN_GUIDES.find((x) => x.key === guide);
  const cats = Object.keys(CATEGORY_LABEL) as IngredientCategory[];

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-stone-100 p-3 text-xs text-stone-600">
        一般的な説明です。メーカー資料や臨床試験などの一次情報は確認していません。成分の効果は「1成分に主な効果1つ」、2つあるものは「（2つ）」と書いています。
      </p>
      <Card title="悩み別: まず覚える主成分">
        <div className="grid grid-cols-3 gap-2">
          {CONCERN_GUIDES.map((x) => (
            <button
              key={x.key}
              onClick={() => setGuide(guide === x.key ? undefined : x.key)}
              className={`min-h-11 rounded-xl border-2 px-1 text-sm ${guide === x.key ? 'border-brand-500 bg-brand-50 font-bold text-brand-600' : 'border-stone-200 text-stone-600'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        {g && (
          <div className="mt-3 rounded-xl bg-brand-50 p-3">
            <p className="text-xs text-brand-700">主成分（まず1つ）</p>
            <button onClick={() => setDetail(INGREDIENT_BY_ID.get(g.main))} className="text-left text-lg font-bold text-brand-700 underline decoration-brand-200">
              {INGREDIENT_BY_ID.get(g.main)!.name}
            </button>
            <p className="mt-2 text-xs text-brand-700">補助</p>
            <div className="flex flex-wrap gap-2">
              {g.support.slice(0, 2).map((id) => (
                <button key={id} onClick={() => setDetail(INGREDIENT_BY_ID.get(id))} className="rounded-full bg-white px-3 py-1 text-sm text-brand-700">
                  {INGREDIENT_BY_ID.get(id)!.name}
                </button>
              ))}
            </div>
            {g.supportNote && <p className="mt-1 text-[11px] text-brand-700/70">{g.supportNote}</p>}
          </div>
        )}
      </Card>

      {cats.map((c) => (
        <Card key={c} title={CATEGORY_LABEL[c]}>
          <ul className="divide-y divide-stone-100">
            {INGREDIENTS.filter((i) => i.category === c).map((i) => (
              <li key={i.id}>
                <button onClick={() => setDetail(i)} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left">
                  <span>
                    <span className="block text-stone-700">{i.name}</span>
                    <span className="block text-xs text-stone-400">{effectText(i)}</span>
                  </span>
                  <span className="text-stone-300">›</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card title="併用・使い方の注意">
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
          {CAUTIONS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      {detail && (
        <Sheet title={detail.name} onClose={() => setDetail(undefined)}>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-stone-400">分類</dt>
              <dd>{CATEGORY_LABEL[detail.category]}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">主な効果</dt>
              <dd className="font-bold text-stone-700">{effectText(detail)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">関係する悩み</dt>
              <dd>{detail.concernText}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">補足</dt>
              <dd>{detail.note}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[11px] text-stone-400">一般的な説明です。一次情報は確認していません。</p>
        </Sheet>
      )}
    </div>
  );
}
