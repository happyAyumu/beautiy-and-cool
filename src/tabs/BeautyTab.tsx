import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, hasBeautyFields, KIND_LABEL, SLOT_LABEL, SLOTS, TIMING_LABEL, type DailyLog, type Photo, type Product, type ProductKind } from '../db';
import { dayOfWeekIndex, formatLong, todayTokyo } from '../lib/date';
import PhotoThumb from '../components/PhotoThumb';
import PhotoViewer from '../components/PhotoViewer';

const pad = (n: number) => String(n).padStart(2, '0');

export default function BeautyTab({ openInput }: { openInput: (date: string) => void }) {
  const today = todayTokyo();
  const [ym, setYm] = useState(today.slice(0, 7)); // YYYY-MM
  const [selected, setSelected] = useState<string>();

  const [y, m] = ym.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = `${ym}-01`;
  const last = `${ym}-${pad(daysInMonth)}`;

  const marked = useLiveQuery(async () => {
    const [logs, photoDates] = await Promise.all([
      db.logs.where('date').between(first, last, true, true).toArray(),
      db.photos.where('date').between(first, last, true, true).keys(),
    ]);
    const s = new Set<string>(photoDates as string[]);
    logs.forEach((l) => hasBeautyFields(l) && s.add(l.date));
    return s;
  }, [first, last]);

  const move = (d: number) => {
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    setYm(`${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`);
    setSelected(undefined);
  };

  const lead = dayOfWeekIndex(first);
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${ym}-${pad(d)}`);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button className="h-11 w-11 rounded-full bg-white text-xl text-stone-500 shadow-sm" onClick={() => move(-1)} aria-label="前の月">
          ‹
        </button>
        <span className="font-bold">
          {y}年{m}月
        </span>
        <button className="h-11 w-11 rounded-full bg-white text-xl text-stone-500 shadow-sm" onClick={() => move(1)} aria-label="次の月">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 rounded-xl bg-white p-2 text-center shadow-sm">
        {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
          <div key={w} className={`py-1 text-xs ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-stone-500'}`}>
            {w}
          </div>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`flex h-11 flex-col items-center justify-center rounded-lg text-sm ${selected === d ? 'bg-brand-500 text-white' : d === today ? 'bg-brand-50 font-bold' : ''}`}
            >
              {Number(d.slice(8))}
              <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${marked?.has(d) ? (selected === d ? 'bg-white' : 'bg-brand-500') : 'bg-transparent'}`} />
            </button>
          ) : (
            <div key={`e${i}`} />
          ),
        )}
      </div>
      {selected && <DayDetail key={selected} date={selected} openInput={openInput} />}
    </div>
  );
}

function DayDetail({ date, openInput }: { date: string; openInput: (d: string) => void }) {
  const data = useLiveQuery(async () => {
    const [log, photos, products] = await Promise.all([db.logs.get(date), db.photos.where('date').equals(date).toArray(), db.products.toArray()]);
    return { log, photos, products: new Map(products.map((p) => [p.id, p])) };
  }, [date]);
  const [view, setView] = useState<Blob>();
  if (!data) return null;
  const { log, photos, products } = data;
  const has = hasBeautyFields(log) || photos.length > 0;

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(120,60,70,0.06)]">
      <h2 className="mb-3 font-bold">{formatLong(date)}</h2>
      {!has ? (
        <>
          <p className="text-stone-500">この日の美容の記録はありません</p>
          <button onClick={() => openInput(date)} className="mt-3 h-12 w-full rounded-xl bg-brand-500 font-bold text-white">
            記録する
          </button>
        </>
      ) : (
        <>
          <UsageRows log={log} products={products} />
          <BeautyRows log={log} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SLOTS.map((s) => {
              const p = photos.find((x: Photo) => x.slot === s);
              return (
                <div key={s} className="text-center">
                  <p className="mb-1 text-xs text-stone-600">{SLOT_LABEL[s]}</p>
                  <PhotoThumb blob={p?.blob} label={SLOT_LABEL[s]} onClick={() => p && setView(p.blob)} />
                </div>
              );
            })}
          </div>
          <button onClick={() => openInput(date)} className="mt-4 h-12 w-full rounded-xl border border-brand-500 font-bold text-brand-500">
            編集
          </button>
        </>
      )}
      {view && <PhotoViewer blob={view} onClose={() => setView(undefined)} />}
    </div>
  );
}

function UsageRows({ log, products }: { log?: DailyLog; products: Map<string, Product> }) {
  if (!log?.usage?.length) return null;
  return (
    <div className="mb-3 space-y-2">
      {(['medicine', 'skincare'] as ProductKind[]).map((kind) => {
        const rows = log.usage!.filter((u) => products.get(u.productId)?.kind === kind && u.times.length);
        if (!rows.length) return null;
        return (
          <div key={kind}>
            <p className="text-xs text-stone-400">{KIND_LABEL[kind]}</p>
            {rows.map((u) => (
              <div key={u.productId} className="flex justify-between border-b border-stone-100 py-1 text-sm">
                <span>{products.get(u.productId)!.name}</span>
                <span className="font-bold text-brand-600">{u.times.map((t) => TIMING_LABEL[t]).join('・')}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function BeautyRows({ log }: { log?: DailyLog }) {
  const v = (x: unknown, unit = '') => (x === undefined || x === '' ? '—' : `${x}${unit}`);
  const rows: [string, string][] = [
    ['新規ニキビ', v(log?.newAcneCount, '個')],
    ['赤み', v(log?.redness)],
    ['テカリ', v(log?.oiliness)],
    ['毛穴・跡', v(log?.poresScars)],
    ['乾燥', log?.dryness === undefined ? '—' : log.dryness ? 'あり' : 'なし'],
    ['ひげ周り', v(log?.beardArea)],
  ];
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between border-b border-stone-100 py-1">
            <dt className="text-stone-500">{k}</dt>
            <dd className="font-bold">{val}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-stone-500">ひげ周りメモ</p>
      <p className="whitespace-pre-wrap text-sm">{log?.beardNote || '—'}</p>
      <p className="mt-2 text-xs text-stone-500">メモ</p>
      <p className="whitespace-pre-wrap text-sm">{log?.note || '—'}</p>
    </div>
  );
}
