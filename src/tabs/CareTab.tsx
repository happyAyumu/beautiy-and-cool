import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { todayTokyo } from '../lib/date';
import WeeklyCheck, { weekOf } from '../care/WeeklyCheck';
import PurchaseSheets, { isResultDue } from '../care/PurchaseSheets';
import OwnedAndChanges from '../care/OwnedAndChanges';
import Dictionary from '../care/Dictionary';

type View = 'weekly' | 'purchase' | 'owned' | 'dict';
const VIEWS: [View, string][] = [
  ['weekly', '週間チェック'],
  ['purchase', '購入判断'],
  ['owned', '手持ち・変更'],
  ['dict', '成分辞書'],
];

/** ケア: 週間チェック・購入判断・手持ち品と変更メモ・成分辞書 */
export default function CareTab() {
  const [view, setView] = useState<View>('weekly');
  const [openSheet, setOpenSheet] = useState<string>();
  const today = todayTokyo();
  const status = useLiveQuery(async () => {
    const [sheets, week] = await Promise.all([db.sheets.toArray(), db.weekly.get(weekOf(today))]);
    return { due: sheets.filter((s) => isResultDue(s, today)), weekDone: !!week };
  }, [today]);
  const onOpened = useCallback(() => setOpenSheet(undefined), []);

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 shadow-sm">
        {VIEWS.map(([v, label]) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              window.scrollTo(0, 0);
            }}
            className={`relative min-h-10 rounded-xl px-0.5 text-[12px] leading-tight ${view === v ? 'bg-brand-500 font-bold text-white' : 'text-stone-500'}`}
          >
            {label}
            {v === 'weekly' && status && !status.weekDone && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />}
            {v === 'purchase' && !!status?.due.length && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />}
          </button>
        ))}
      </div>

      {status?.due.map((s) => (
        <button
          key={s.id}
          onClick={() => {
            setView('purchase');
            setOpenSheet(s.id);
          }}
          className="mb-3 w-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900"
        >
          「{s.name}」を使い始めて2週間です。良い / 変化なし / 悪化 を記録してください ›
        </button>
      ))}

      {view === 'weekly' && <WeeklyCheck />}
      {view === 'purchase' && <PurchaseSheets openId={openSheet} onOpened={onOpened} />}
      {view === 'owned' && <OwnedAndChanges />}
      {view === 'dict' && <Dictionary />}
    </div>
  );
}
