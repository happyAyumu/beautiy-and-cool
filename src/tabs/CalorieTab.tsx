import { useEffect, useState } from 'react';
import { db, type DailyLog, type MealItem } from '../db';
import { addDays, formatLong, todayTokyo } from '../lib/date';
import { sumNutrients } from '../lib/nutrients';
import MealCard from '../components/MealCard';
import TrendTab from '../components/TrendTab';

/** カロリーの入力（食べたもの）と推移 */
export default function CalorieTab() {
  const today = todayTokyo();
  const [date, setDate] = useState(today);
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button className="h-11 w-11 rounded-full bg-white text-xl text-stone-500 shadow-sm" onClick={() => setDate(addDays(date, -1))} aria-label="前の日">
          ‹
        </button>
        <label className="relative flex h-12 flex-1 items-center justify-center text-xl font-bold text-stone-700">
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
      <h2 className="mb-2 mt-6 font-bold text-stone-700">カロリーの推移</h2>
      <TrendTab
        field="calories"
        unit="kcal"
        kind="bar"
        decimals={0}
        showChange={false}
        emptyText="記録するとグラフが出ます。"
        openInput={(d) => {
          setDate(d);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
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
