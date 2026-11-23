import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMeta } from '../db';
import { addDays, daysBetween, todayTokyo } from '../lib/date';

/** 連続記録日数と、大会までの日数 */
export default function Motivation() {
  const data = useLiveQuery(async () => {
    const dates = new Set((await db.logs.toCollection().primaryKeys()) as string[]);
    const contest = await getMeta('contestDate');
    return { dates, contest };
  });
  if (!data) return null;
  const today = todayTokyo();
  let d = data.dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (data.dates.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  const left = data.contest ? daysBetween(today, data.contest) : undefined;
  const recordedToday = data.dates.has(today);

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 px-4 py-3">
      <div className="flex items-end justify-around text-center">
        <div>
          <p className="text-xs text-brand-700">連続記録</p>
          <p className="text-brand-600">
            <span className="text-3xl font-bold">{streak}</span>
            <span className="ml-0.5 text-sm">日</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-brand-700">これまでの記録</p>
          <p className="text-brand-600">
            <span className="text-3xl font-bold">{data.dates.size}</span>
            <span className="ml-0.5 text-sm">日</span>
          </p>
        </div>
        {left !== undefined && left >= 0 && (
          <div>
            <p className="text-xs text-brand-700">大会まで</p>
            <p className="text-brand-600">
              <span className="text-sm">あと</span>
              <span className="text-3xl font-bold">{left}</span>
              <span className="ml-0.5 text-sm">日</span>
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-sm font-bold text-brand-700">
        {recordedToday
          ? streak >= 2
            ? `今日も記録できました。${streak}日連続です！`
            : '今日の記録ができました！'
          : streak > 0
            ? `今日も記録して、${streak + 1}日連続にしよう！`
            : '今日の記録をつけよう！'}
      </p>
      {left === undefined && <p className="mt-1 text-center text-[11px] text-brand-700/70">歯車の設定から大会の日を入れると、残り日数が出ます</p>}
    </div>
  );
}
