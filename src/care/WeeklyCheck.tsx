import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type WeeklyAnswer, type WeeklyCheck as WC, type WeeklyItem } from '../db';
import { addDays, dayOfWeekIndex, formatShort, todayTokyo } from '../lib/date';
import Card from '../components/Card';
import { chip } from '../components/ScoreButtons';

export const WEEKLY_ITEMS: { key: WeeklyItem; label: string; daily?: string; question: string; better: string }[] = [
  { key: 'oil', label: '油分', daily: 'テカリ', question: '午後にテカる場所が、増えたか、減ったか', better: 'テカる場所が減った' },
  { key: 'moisture', label: '水分', daily: '乾燥', question: '洗顔後に突っ張るか', better: '突っ張りが減った' },
  { key: 'pores', label: '毛穴', daily: '毛穴・跡', question: '頬の点々が、目立つか、薄くなったか', better: '点々が薄くなった' },
  { key: 'texture', label: 'キメ', question: '近くで見て、ざらつくか、なめらかか', better: 'なめらかになった' },
  { key: 'clarity', label: '透明感・シミ', question: '顔色が明るく見えるか、跡が薄くなったか', better: '明るくなった、跡が薄くなった' },
  { key: 'firmness', label: 'ハリ', question: '朝の顔が、むくんで平らか、ふっくらしているか', better: 'ふっくらしている' },
];
export const ANSWER_LABEL: Record<WeeklyAnswer, string> = { better: '良くなった', same: '同じ', worse: '悪くなった' };
const ANSWER_MARK: Record<WeeklyAnswer, string> = { better: '↑', same: '→', worse: '↓' };

/** その日を含む週の月曜日 */
export const weekOf = (d: string) => addDays(d, -((dayOfWeekIndex(d) + 6) % 7));

export default function WeeklyCheck() {
  const thisWeek = weekOf(todayTokyo());
  const [week, setWeek] = useState(thisWeek);
  const history = useLiveQuery(() => db.weekly.orderBy('id').reverse().toArray());
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2">
          <button className="h-11 w-11 rounded-full bg-stone-50 text-xl text-stone-500" onClick={() => setWeek(addDays(week, -7))} aria-label="前の週">
            ‹
          </button>
          <p className="flex-1 text-center font-bold text-stone-700">
            {formatShort(week)}〜{formatShort(addDays(week, 6))} の週
            {week === thisWeek && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-600">今週</span>}
          </p>
          <button className="h-11 w-11 rounded-full bg-stone-50 text-xl text-stone-500 disabled:opacity-30" onClick={() => setWeek(addDays(week, 7))} disabled={week >= thisWeek} aria-label="次の週">
            ›
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">先週と比べて、3択で答えます。写真を見比べながら答える想定です。どれも空欄のままで大丈夫です。</p>
      </Card>
      <WeekForm key={week} week={week} />
      {history && history.length > 0 && (
        <Card title="これまでの週間チェック">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm">
              <thead>
                <tr className="text-[11px] text-stone-400">
                  <th className="py-1 text-left font-normal">週</th>
                  {WEEKLY_ITEMS.map((i) => (
                    <th key={i.key} className="px-1 font-normal">
                      {i.label.replace('・シミ', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-stone-100" onClick={() => setWeek(h.id)}>
                    <td className="py-2 text-left text-stone-600">{formatShort(h.id)}〜</td>
                    {WEEKLY_ITEMS.map((i) => {
                      const a = h.answers[i.key];
                      return (
                        <td key={i.key} className={`font-bold ${a === 'better' ? 'text-emerald-600' : a === 'worse' ? 'text-red-500' : 'text-stone-400'}`}>
                          {a ? ANSWER_MARK[a] : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-stone-400">↑ 良くなった ・ → 同じ ・ ↓ 悪くなった。行を押すとその週を開きます。</p>
        </Card>
      )}
    </div>
  );
}

function WeekForm({ week }: { week: string }) {
  const [data, setData] = useState<WC>();
  const [msg, setMsg] = useState<string>();
  useEffect(() => {
    db.weekly.get(week).then((w) => setData(w ?? { id: week, answers: {}, notes: {}, updatedAt: '' }));
  }, [week]);
  if (!data) return null;

  const save = async () => {
    const empty = !Object.values(data.answers).some(Boolean) && !Object.values(data.notes).some((n) => n?.trim()) && !data.photoTaken;
    if (empty) await db.weekly.delete(week);
    else await db.weekly.put({ ...data, updatedAt: new Date().toISOString() });
    setMsg(empty ? '空なので保存しませんでした' : '保存しました');
    setTimeout(() => setMsg(undefined), 2000);
  };

  return (
    <>
      <Card title="写真">
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={!!data.photoTaken} onChange={(e) => setData({ ...data, photoTaken: e.target.checked })} />
          <span className="text-stone-700">今週の写真を撮った</span>
        </label>
        <p className="mt-1 text-xs text-stone-500">
          撮影条件をそろえると比べやすくなります: 同じ場所・同じ時間帯（例: 朝の洗顔後）・同じ明るさで、正面・右斜め・左斜め。この画面では写真は保存しません（毎日の写真は「入力する」から）。
        </p>
      </Card>
      {WEEKLY_ITEMS.map((it) => (
        <Card key={it.key}>
          <div className="mb-1 flex items-baseline justify-between">
            <p className="font-bold text-stone-700">{it.label}</p>
            {it.daily && <p className="text-[11px] text-stone-400">毎日の「{it.daily}」に対応</p>}
          </div>
          <p className="mb-2 text-sm text-stone-600">{it.question}</p>
          <div className="grid grid-cols-3 gap-2">
            {(['better', 'same', 'worse'] as WeeklyAnswer[]).map((a) => (
              <button
                key={a}
                onClick={() => setData({ ...data, answers: { ...data.answers, [it.key]: data.answers[it.key] === a ? undefined : a } })}
                className={`${chip(data.answers[it.key] === a)} text-sm`}
              >
                {ANSWER_LABEL[a]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">良くなった = {it.better}</p>
          <input
            value={data.notes[it.key] ?? ''}
            onChange={(e) => setData({ ...data, notes: { ...data.notes, [it.key]: e.target.value } })}
            placeholder="メモ（任意）"
            className="mt-2 h-10 w-full rounded-xl border-2 border-stone-200 px-3 text-sm"
          />
        </Card>
      ))}
      <div className="sticky z-10 pt-1" style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}>
        {msg && <p className="mb-2 rounded-xl bg-brand-50 p-2 text-center text-sm font-bold text-brand-700">{msg}</p>}
        <button onClick={save} className="h-14 w-full rounded-full bg-brand-500 text-lg font-bold text-white shadow-lg shadow-brand-300/40">
          週間チェックを保存
        </button>
      </div>
    </>
  );
}
