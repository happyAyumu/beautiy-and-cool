import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DailyLog, type MealItem } from '../db';
import { addDays, formatLong, todayTokyo } from '../lib/date';
import { sumNutrients } from '../lib/nutrients';
import MealCard from '../components/MealCard';
import TrendTab from '../components/TrendTab';

/** カロリーの入力（食べたもの）と推移。上の切り替えで「記録」と「グラフ」を行き来する */
export default function CalorieTab() {
  const today = todayTokyo();
  const [date, setDate] = useState(today);
  const [view, setView] = useState<'input' | 'trend'>('input');
  const avg7 = useLiveQuery(async () => {
    const logs = await db.logs.where('date').between(addDays(today, -6), today, true, true).filter((l) => l.calories !== undefined).toArray();
    return logs.length ? Math.round(logs.reduce((s, l) => s + l.calories!, 0) / logs.length) : undefined;
  }, [today]);

  return (
    <div>
      <div className="mb-4 flex rounded-full bg-white p-1 shadow-sm">
        {(
          [
            ['input', '記録'],
            ['trend', 'グラフ・推移'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              window.scrollTo(0, 0);
            }}
            className={`h-10 flex-1 rounded-full text-sm ${view === v ? 'bg-brand-500 font-bold text-white' : 'text-stone-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'input' ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button className="h-11 w-11 rounded-full bg-white text-xl text-stone-500 shadow-sm" onClick={() => setDate(addDays(date, -1))} aria-label="前の日">
              ‹
            </button>
            <label className="relative flex h-11 flex-1 items-center justify-center text-lg font-bold text-stone-700">
              {formatLong(date)}
              <span className="ml-1 text-sm text-stone-400">▾</span>
              {date === today && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-600">今日</span>}
              <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0" aria-label="日付を選ぶ" />
            </label>
            <button
              className="h-11 w-11 rounded-full bg-white text-xl text-stone-500 shadow-sm disabled:opacity-30"
              onClick={() => setDate(addDays(date, 1))}
              disabled={date >= today}
              aria-label="次の日"
            >
              ›
            </button>
          </div>
          <DayMeals key={date} date={date} />
          <button onClick={() => setView('trend')} className="mt-3 flex h-12 w-full items-center justify-between rounded-2xl bg-white px-4 text-sm shadow-sm">
            <span className="text-stone-500">
              直近7日の平均
              <span className="ml-2 text-lg font-bold text-stone-700">{avg7 !== undefined ? avg7.toLocaleString('ja-JP') : '—'}</span>
              <span className="ml-0.5 text-xs text-stone-400">kcal</span>
            </span>
            <span className="text-brand-600">グラフを見る ›</span>
          </button>
        </>
      ) : (
        <TrendTab
          field="calories"
          unit="kcal"
          kind="bar"
          decimals={0}
          showChange={false}
          emptyText="記録するとグラフが出ます。"
          openInput={(d) => {
            setDate(d);
            setView('input');
            window.scrollTo(0, 0);
          }}
        />
      )}
    </div>
  );
}

const norm = (s: string) => s.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[,，]/g, '');

/** その日の食べたもの。変更するとすぐ保存する */
function DayMeals({ date }: { date: string }) {
  const [meals, setMeals] = useState<MealItem[]>();
  const [calories, setCalories] = useState('');
  const [savedCalories, setSavedCalories] = useState('');
  const [msg, setMsg] = useState<string>();

  useEffect(() => {
    db.logs.get(date).then((l) => {
      setMeals(l?.meals ?? []);
      const c = l?.meals?.length ? '' : (l?.calories?.toString() ?? '');
      setCalories(c);
      setSavedCalories(c);
    });
  }, [date]);

  /** カロリー・食べたものだけを書き換える（ほかの項目はそのまま） */
  const persist = async (nextMeals: MealItem[], manual: number | undefined) => {
    await db.transaction('rw', db.logs, db.photos, async () => {
      const cur: DailyLog = (await db.logs.get(date)) ?? { date, updatedAt: '' };
      const log: DailyLog = { ...cur, updatedAt: new Date().toISOString() };
      if (nextMeals.length) {
        log.meals = nextMeals;
        log.calories = Math.round(sumNutrients(nextMeals.map((m) => m.nutrients)).total.kcal ?? 0);
      } else {
        delete log.meals;
        if (manual === undefined) delete log.calories;
        else log.calories = manual;
      }
      const empty = Object.keys(log).length === 2 && (await db.photos.where('date').equals(date).count()) === 0;
      if (empty) await db.logs.delete(date);
      else await db.logs.put(log);
    });
    setMsg('保存しました');
    setTimeout(() => setMsg(undefined), 1500);
  };

  if (!meals) return <p className="text-stone-400">読み込み中…</p>;

  const saveManual = async () => {
    const t = norm(calories);
    if (t === savedCalories) return;
    if (t !== '' && (!/^\d+$/.test(t) || Number(t) > 20000)) return setMsg('カロリーは 0〜20000 の整数で入力してください');
    await persist([], t === '' ? undefined : Number(t));
    setSavedCalories(t);
  };

  return (
    <div className="relative">
      <MealCard
        meals={meals}
        setMeals={(m) => {
          setMeals(m);
          persist(m, undefined);
          if (!m.length) {
            setCalories('');
            setSavedCalories('');
          }
        }}
        calories={calories}
        setCalories={setCalories}
        onCaloriesBlur={saveManual}
      />
      {msg && (
        <p className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-max rounded-full bg-stone-700/85 px-4 py-1.5 text-sm text-white" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>{msg}</p>
      )}
    </div>
  );
}
