import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, type PurchaseSheet, type TrialResult, type Verdict } from '../db';
import { daysBetween, formatLong, todayTokyo } from '../lib/date';
import { CONCERN_LABEL, CONCERNS, ingredientName, type Concern } from '../data/ingredients';
import { concernsText, DISCLAIMER, judge, VERDICT_LABEL, type Judgement } from '../lib/judge';
import Card from '../components/Card';
import Sheet from '../components/Sheet';
import { Choice, Field, IngredientPicker, MultiChoice, TYPE_LABEL, TYPES } from './common';

export const RESULT_LABEL: Record<TrialResult, string> = { good: '良い', no_change: '変化なし', worse: '悪化' };
const VERDICT_STYLE: Record<Verdict, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hold: 'bg-amber-50 text-amber-800 border-amber-200',
  skip: 'bg-stone-100 text-stone-600 border-stone-200',
};

export function VerdictBadge({ v }: { v: Verdict }) {
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${VERDICT_STYLE[v]}`}>{VERDICT_LABEL[v]}</span>;
}

/** 2週間たって結果がまだのシート */
export const isResultDue = (s: PurchaseSheet, today: string) => !!s.startedOn && !s.result && daysBetween(s.startedOn, today) >= 14;

export default function PurchaseSheets({ openId, onOpened }: { openId?: string; onOpened?: () => void }) {
  const sheets = useLiveQuery(() => db.sheets.orderBy('id').toArray().then((a) => a.sort((x, y) => y.createdAt.localeCompare(x.createdAt))));
  const [editing, setEditing] = useState<PurchaseSheet | 'new'>();
  const today = todayTokyo();

  useEffect(() => {
    if (!openId || !sheets) return;
    const s = sheets.find((x) => x.id === openId);
    if (s) setEditing(s);
    onOpened?.();
  }, [openId, sheets, onOpened]);

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-stone-600">商品を買う前に入力すると、固定のルールで「買ってよい（条件付き）／保留／見送り」と理由を出します。</p>
        <button onClick={() => setEditing('new')} className="mt-3 h-12 w-full rounded-full bg-brand-500 font-bold text-white">
          ＋ 新しい商品を判断する
        </button>
      </Card>
      {sheets && sheets.length > 0 && (
        <Card title="これまでの判断">
          <ul className="divide-y divide-stone-100">
            {sheets.map((s) => (
              <li key={s.id}>
                <button onClick={() => setEditing(s)} className="flex min-h-14 w-full items-center justify-between gap-2 py-2 text-left">
                  <span className="min-w-0">
                    <span className="block text-stone-700">
                      {s.name}
                      <span className="ml-2 text-xs text-stone-400">{TYPE_LABEL[s.type]}</span>
                    </span>
                    <span className="block text-xs text-stone-400">
                      {s.result
                        ? `使ってみた結果: ${RESULT_LABEL[s.result]}`
                        : s.startedOn
                          ? isResultDue(s, today)
                            ? '2週間たちました。結果を記録してください'
                            : `使用中（${daysBetween(s.startedOn, today) + 1}日目）`
                          : `狙う悩み: ${concernsText(s.targetConcerns)}`}
                    </span>
                  </span>
                  <VerdictBadge v={s.verdict} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {editing && <SheetEditor sheet={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

const empty = (): PurchaseSheet => ({
  id: newId(), name: '', type: 'serum', targetConcerns: [], mainIngredients: [], freeIngredients: '', ingredientPosition: 'unknown',
  fullListChecked: undefined, irritationFlags: [], oilLevel: 'unknown', quasiDrug: 'unknown', area: 'face', timing: 'night_no_retinol',
  currentSkin: [], evidence: 'general', verdict: 'hold', reasons: [], createdAt: new Date().toISOString(), updatedAt: '',
});

function SheetEditor({ sheet, onClose }: { sheet?: PurchaseSheet; onClose: () => void }) {
  const [d, setD] = useState<PurchaseSheet>(sheet ?? empty());
  const [error, setError] = useState<string>();
  const [starting, setStarting] = useState(false);
  const owned = useLiveQuery(() => db.owned.toArray()) ?? [];
  const changes = useLiveQuery(() => db.changes.toArray()) ?? [];
  const today = todayTokyo();
  const j = judge(d, { owned, changes, today });
  const set = <K extends keyof PurchaseSheet>(k: K, v: PurchaseSheet[K]) => setD({ ...d, [k]: v });
  const saved = !!sheet;

  const save = async (patch: Partial<PurchaseSheet> = {}) => {
    if (!d.name.trim()) return setError('商品名を入れてください'), false;
    if (!d.targetConcerns.length) return setError('狙う悩みを1つ以上選んでください'), false;
    const next = { ...d, ...patch, name: d.name.trim(), verdict: j.verdict, reasons: j.hits.map((h) => h.rule), updatedAt: new Date().toISOString() };
    await db.sheets.put(next);
    setD(next);
    setError(undefined);
    return true;
  };

  return (
    <Sheet
      title={saved ? d.name || '購入判断' : '購入判断シート'}
      onClose={onClose}
      right={
        <button
          onClick={async () => {
            if (await save()) onClose();
          }}
          className="h-10 shrink-0 rounded-full bg-brand-500 px-5 font-bold text-white"
        >
          保存
        </button>
      }
    >
      <div className="space-y-5">
        <Field label="商品名">
          <input value={d.name} onChange={(e) => set('name', e.target.value)} className="h-12 w-full rounded-xl border-2 border-stone-200 px-3" />
        </Field>
        <Field label="種類">
          <Choice value={d.type} options={TYPES.map((t) => [t, TYPE_LABEL[t]])} onChange={(v) => set('type', v)} />
        </Field>
        <Field label="① 狙う悩み" hint="最大2つ">
          <MultiChoice value={d.targetConcerns} max={2} options={CONCERNS.map((c) => [c, CONCERN_LABEL[c]] as [Concern, string])} onChange={(v) => set('targetConcerns', v)} />
        </Field>
        <Field label="主な成分" hint="辞書から選びます。辞書にないものは下の欄に">
          <IngredientPicker value={d.mainIngredients} onChange={(v) => set('mainIngredients', v)} />
          <input
            value={d.freeIngredients ?? ''}
            onChange={(e) => set('freeIngredients', e.target.value)}
            placeholder="辞書にない成分（自由記入）"
            className="mt-2 h-11 w-full rounded-xl border-2 border-stone-200 px-3 text-sm"
          />
        </Field>
        <Field label="主な成分の位置" hint="全成分表示は配合量の多い順に並びます">
          <Choice
            value={d.ingredientPosition}
            options={[['upper', '上位'], ['middle', '中位'], ['lower', '下位'], ['unknown', '不明']]}
            onChange={(v) => set('ingredientPosition', v)}
          />
        </Field>
        <Field label="全成分表示を確認した">
          <Choice value={d.fullListChecked === undefined ? undefined : d.fullListChecked ? 'yes' : 'no'} options={[['yes', 'はい'], ['no', 'いいえ']]} onChange={(v) => set('fullListChecked', v === 'yes')} />
        </Field>
        <Field label="② 今の肌の状態" hint="当てはまるものがあれば（刺激が出やすい成分は保留になります）">
          <MultiChoice value={d.currentSkin} options={[['rough', '荒れている'], ['wound', '傷がある'], ['shaved', '剃った直後']]} onChange={(v) => set('currentSkin', v)} />
        </Field>
        <Field label="刺激リスク" hint="サリチル酸・AHA・レチノールを選ぶと自動でチェックされます">
          <MultiChoice
            value={j.flags}
            options={[['fragrance', '香料・精油'], ['ethanol', 'エタノール'], ['acid', 'AHA・サリチル酸'], ['retinoid', 'レチノイド'], ['other', 'その他']]}
            onChange={(v) => set('irritationFlags', v)}
          />
        </Field>
        <Field label="油分の多さ">
          <Choice value={d.oilLevel} options={[['oil_free', 'オイルフリー表記あり'], ['oily', '油分多め'], ['unknown', '不明']]} onChange={(v) => set('oilLevel', v)} />
        </Field>
        <Field label="医薬部外品か化粧品か">
          <Choice value={d.quasiDrug} options={[['quasi', '医薬部外品'], ['cosmetic', '化粧品'], ['unknown', '不明']]} onChange={(v) => set('quasiDrug', v)} />
        </Field>
        <Field label="使う場所">
          <Choice value={d.area} options={[['face', '顔全体'], ['cheeks_only', '頬だけ'], ['t_zone_only', 'Tゾーンだけ'], ['avoid_mouth', '顎・口周りは避ける']]} onChange={(v) => set('area', v)} />
        </Field>
        <Field label="使うタイミング">
          <Choice value={d.timing} options={[['morning', '朝'], ['night', '夜'], ['night_no_retinol', 'レチノールを使わない日の夜']]} onChange={(v) => set('timing', v)} />
        </Field>
        <Field label="アレルギー確認">
          <div className="space-y-1">
            {d.mainIngredients.includes('pdrn') && (
              <label className="flex min-h-10 items-center gap-3 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={!!d.allergySeafood} onChange={(e) => set('allergySeafood', e.target.checked)} />
                魚介類（PDRN 配合）を確認した
              </label>
            )}
            <label className="flex min-h-10 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={!!d.allergyPast} onChange={(e) => set('allergyPast', e.target.checked)} />
              過去に合わなかった成分が入っていないか確認した
            </label>
          </div>
        </Field>
        <Field label="④ 根拠の強さ">
          <Choice value={d.evidence} options={[['general', '一般的な説明'], ['maker', 'メーカー表記だけ'], ['unconfirmed', '未確認']]} onChange={(v) => set('evidence', v)} />
        </Field>
        <Field label="③ 既存品との重複" hint="手持ち品の登録と自動で照合します">
          {j.duplicates.length ? (
            <ul className="text-sm text-amber-800">
              {j.duplicates.map((x) => (
                <li key={x.item.id}>
                  {x.item.name}（{x.shared.map(ingredientName).join('・')}）
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">重なる手持ち品はありません{owned.length === 0 && '（手持ち品が未登録）'}</p>
          )}
        </Field>
        <Field label="小範囲テストをした日" hint="頬の端などで数日試す">
          <input type="date" value={d.patchTestDate ?? ''} max={today} onChange={(e) => set('patchTestDate', e.target.value || undefined)} className="h-12 w-full rounded-xl border-2 border-stone-200 bg-white px-3" />
        </Field>

        <ResultCard j={j} />
        {error && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <TrialSection d={d} onStart={() => setStarting(true)} onResult={(r) => save({ result: r })} saved={saved} />
      </div>
      {starting && (
        <StartSheet
          name={d.name}
          onClose={() => setStarting(false)}
          onStart={async (opts) => {
            const ok = await save({ startedOn: opts.date });
            if (!ok) return;
            await db.changes.add({ id: newId(), date: opts.date, kind: 'new_product', text: `${d.name.trim()}を使い始めた`, createdAt: new Date().toISOString() });
            if (opts.owned && !(await db.owned.filter((o) => o.sheetId === d.id).count()))
              await db.owned.add({ id: newId(), name: d.name.trim(), type: d.type, mainIngredients: d.mainIngredients, startedOn: opts.date, inUse: true, sheetId: d.id, createdAt: new Date().toISOString() });
            if (opts.daily && !(await db.products.filter((p) => p.name === d.name.trim()).count()))
              await db.products.add({ id: newId(), name: d.name.trim(), kind: 'skincare', active: true, createdAt: new Date().toISOString() });
            setStarting(false);
          }}
        />
      )}
    </Sheet>
  );
}

function ResultCard({ j }: { j: Judgement }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${VERDICT_STYLE[j.verdict]}`}>
      <p className="text-xs">判定</p>
      <p className="text-2xl font-bold">{VERDICT_LABEL[j.verdict]}</p>
      <p className="mt-1 text-sm">{j.hits[0].reason}</p>
      {j.hits.length > 1 && (
        <div className="mt-2">
          <p className="text-xs opacity-70">ほかに当たった理由</p>
          <ul className="list-disc pl-5 text-sm">
            {j.hits.slice(1).map((h) => (
              <li key={h.rule}>
                {h.reason}（{VERDICT_LABEL[h.verdict]}）
              </li>
            ))}
          </ul>
        </div>
      )}
      {j.suggestions.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm">
          {j.suggestions.map((s) => (
            <li key={s}>💡 {s}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs opacity-80">根拠: {j.evidence}</p>
      <p className="mt-3 border-t border-current/20 pt-2 text-xs font-bold">{DISCLAIMER}</p>
    </div>
  );
}

function TrialSection({ d, onStart, onResult, saved }: { d: PurchaseSheet; onStart: () => void; onResult: (r: TrialResult) => void; saved: boolean }) {
  const today = todayTokyo();
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <p className="mb-2 font-bold text-stone-700">買ったあと（使い始めの手順）</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600">
        <li>頬の端などの小範囲で数日試す（上の「小範囲テストをした日」に記録）</li>
        <li>問題なければ使い始め、下のボタンで記録する</li>
        <li>2〜4週間は、ほかのものを変えない</li>
        <li>悪化したら、直前に足したもの（これ）をやめる</li>
        <li>2週間後に「良い / 変化なし / 悪化」を記録する</li>
      </ol>
      {!d.startedOn ? (
        <button onClick={onStart} className="mt-3 h-12 w-full rounded-full border-2 border-brand-500 font-bold text-brand-600">
          買った・使い始めた{!saved && '（保存もします）'}
        </button>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-stone-600">
            使い始め: {formatLong(d.startedOn)}（{daysBetween(d.startedOn, today) + 1}日目）
          </p>
          {daysBetween(d.startedOn, today) >= 14 || d.result ? (
            <>
              <p className="mt-2 text-sm font-bold text-stone-700">2週間使ってみてどうでしたか？</p>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(['good', 'no_change', 'worse'] as TrialResult[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => onResult(r)}
                    className={`h-11 rounded-xl border-2 ${d.result === r ? 'border-brand-500 bg-brand-50 font-bold text-brand-600' : 'border-stone-200 bg-white text-stone-600'}`}
                  >
                    {RESULT_LABEL[r]}
                  </button>
                ))}
              </div>
              {d.result === 'worse' && <p className="mt-2 text-xs text-stone-500">悪化したときは、直前に足したもの（この商品）をやめるのが基本方針です。</p>}
            </>
          ) : (
            <p className="mt-1 text-xs text-stone-400">あと{14 - daysBetween(d.startedOn, today)}日で、結果を聞く画面が出ます。</p>
          )}
        </div>
      )}
    </div>
  );
}

function StartSheet({ name, onClose, onStart }: { name: string; onClose: () => void; onStart: (o: { date: string; owned: boolean; daily: boolean }) => void }) {
  const [date, setDate] = useState(todayTokyo());
  const [owned, setOwned] = useState(true);
  const [daily, setDaily] = useState(true);
  return (
    <Sheet title="使い始めを記録" onClose={onClose}>
      <p className="mb-3 text-sm text-stone-600">「{name || 'この商品'}」を使い始めた日を記録し、変更メモにも残します。</p>
      <Field label="使い始めた日">
        <input type="date" value={date} max={todayTokyo()} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-12 w-full rounded-xl border-2 border-stone-200 bg-white px-3" />
      </Field>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={owned} onChange={(e) => setOwned(e.target.checked)} />
        手持ち品に追加する（重複チェックに使います）
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
        「入力する」の使用中の肌ケア用品にも追加する（毎日 朝・夜 を記録できます）
      </label>
      <button onClick={() => onStart({ date, owned, daily })} className="mt-4 h-14 w-full rounded-full bg-brand-500 text-lg font-bold text-white">
        記録する
      </button>
    </Sheet>
  );
}
