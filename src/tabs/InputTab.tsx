import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db, hasBeautyFields, KIND_LABEL, photoId, SLOT_LABEL, SLOTS, TIMING_LABEL, TIMINGS,
  type DailyLog, type PhotoSlot, type Product, type ProductKind, type Score, type Timing,
} from '../db';
import { addDays, formatLong, formatShort, todayTokyo } from '../lib/date';
import { resizeToJpeg } from '../lib/image';
import { useObjectUrl } from '../lib/useObjectUrl';
import ScoreButtons, { chip } from '../components/ScoreButtons';
import PhotoViewer from '../components/PhotoViewer';
import Card from '../components/Card';
import Motivation from '../components/Motivation';
import ProductEditor from '../components/ProductEditor';
import { BackupNotice, InstallNotice } from '../components/Notices';

export default function InputTab({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const today = todayTokyo();
  return (
    <div>
      <InstallNotice />
      <BackupNotice />
      <Motivation />
      <div className="mb-4 flex items-center gap-2">
        <button className="h-11 w-11 rounded-full bg-white text-xl text-stone-500 shadow-sm" onClick={() => setDate(addDays(date, -1))} aria-label="前の日">
          ‹
        </button>
        <label className="relative flex h-12 flex-1 items-center justify-center text-xl font-bold text-stone-700">
          {formatLong(date)}
          <span className="ml-1 text-sm text-stone-400">▾</span>
          {date === today && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-600">今日</span>}
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="absolute inset-0 opacity-0"
            aria-label="日付を選ぶ"
          />
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
      <DayForm key={date} date={date} />
    </div>
  );
}

type Form = {
  weight: string;
  sleep: string;
  acne: string;
  redness?: Score;
  oiliness?: Score;
  poresScars?: Score;
  dryness?: boolean;
  beardArea?: Score;
  beardNote: string;
  note: string;
  usage: Record<string, Timing[]>;
};

type PhotoState = Partial<Record<PhotoSlot, Blob>>;

function toForm(l: DailyLog | undefined, prevWeight: number | undefined): Form {
  const usage: Record<string, Timing[]> = {};
  l?.usage?.forEach((u) => (usage[u.productId] = u.times));
  return {
    weight: l ? (l.weightKg?.toFixed(1) ?? '') : (prevWeight?.toFixed(1) ?? ''),
    sleep: l?.sleepHours?.toFixed(1) ?? '',
    acne: l?.newAcneCount?.toString() ?? '',
    redness: l?.redness,
    oiliness: l?.oiliness,
    poresScars: l?.poresScars,
    dryness: l?.dryness,
    beardArea: l?.beardArea,
    beardNote: l?.beardNote ?? '',
    note: l?.note ?? '',
    usage,
  };
}

const norm = (s: string) => s.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[，,．。]/g, '.');

function parseDecimal(s: string, min: number, max: number): number | undefined | 'error' {
  const t = norm(s);
  if (t === '') return undefined;
  if (!/^\d+(\.\d*)?$/.test(t)) return 'error';
  const n = Math.round(Number(t) * 10) / 10;
  return n < min || n > max ? 'error' : n;
}

function parseInt0(s: string, max = 999): number | undefined | 'error' {
  const t = norm(s);
  if (t === '') return undefined;
  if (!/^\d+$/.test(t)) return 'error';
  const n = Number(t);
  return n > max ? 'error' : n;
}

function DayForm({ date }: { date: string }) {
  const [form, setForm] = useState<Form>();
  const [photos, setPhotos] = useState<PhotoState>({});
  const [dirtySlots, setDirtySlots] = useState<Set<PhotoSlot>>(new Set());
  const [prefilled, setPrefilled] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ProductKind>();
  const products = useLiveQuery(() => db.products.toCollection().sortBy('createdAt')) ?? [];

  useEffect(() => {
    let alive = true;
    (async () => {
      const [log, ps, prev] = await Promise.all([
        db.logs.get(date),
        db.photos.where('date').equals(date).toArray(),
        db.logs.where('date').below(date).reverse().filter((l) => l.weightKg !== undefined).first(),
      ]);
      if (!alive) return;
      const p: PhotoState = {};
      ps.forEach((x) => (p[x.slot] = x.blob));
      setForm(toForm(log, prev?.weightKg));
      setPrefilled(!log && prev ? formatShort(prev.date) : undefined);
      setPhotos(p);
    })();
    return () => {
      alive = false;
    };
  }, [date]);

  if (!form) return <p className="text-stone-400">読み込み中…</p>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm({ ...form, [k]: v });
    setMessage(undefined);
  };

  const toggleUsage = (id: string, t: Timing) => {
    const cur = form.usage[id] ?? [];
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : TIMINGS.filter((x) => x === t || cur.includes(x));
    set('usage', { ...form.usage, [id]: next });
  };

  const setPhoto = (slot: PhotoSlot, blob: Blob | undefined) => {
    setPhotos((p) => ({ ...p, [slot]: blob }));
    setDirtySlots((s) => new Set(s).add(slot));
    setMessage(undefined);
  };

  const save = async () => {
    const weightKg = parseDecimal(form.weight, 20, 300);
    const sleepHours = parseDecimal(form.sleep, 0, 24);
    const newAcneCount = parseInt0(form.acne);
    if (weightKg === 'error') return setError('体重は 20〜300 の数字で入力してください');
    if (sleepHours === 'error') return setError('睡眠時間は 0〜24 の数字で入力してください');
    if (newAcneCount === 'error') return setError('新規ニキビは 0 以上の整数で入力してください');
    setError(undefined);
    setSaving(true);
    const usage = Object.entries(form.usage)
      .filter(([, times]) => times.length)
      .map(([productId, times]) => ({ productId, times }));
    const log: DailyLog = {
      date,
      weightKg,
      sleepHours,
      newAcneCount,
      redness: form.redness,
      oiliness: form.oiliness,
      poresScars: form.poresScars,
      dryness: form.dryness,
      beardArea: form.beardArea,
      beardNote: form.beardNote.trim() || undefined,
      note: form.note.trim() || undefined,
      usage: usage.length ? usage : undefined,
      updatedAt: new Date().toISOString(),
    };
    let empty = false;
    try {
      await db.transaction('rw', db.logs, db.photos, async () => {
        // カロリー・食べたものは「カロリー」タブで保存しているので、そのまま残す
        const cur = await db.logs.get(date);
        if (cur?.calories !== undefined) log.calories = cur.calories;
        if (cur?.meals) log.meals = cur.meals;
        (Object.keys(log) as (keyof DailyLog)[]).forEach((k) => log[k] === undefined && delete log[k]);
        empty = Object.keys(log).length === 2 && SLOTS.every((s) => !photos[s]);
        for (const slot of dirtySlots) {
          const blob = photos[slot];
          if (blob) await db.photos.put({ id: photoId(date, slot), date, slot, blob });
          else await db.photos.delete(photoId(date, slot));
        }
        if (empty) await db.logs.delete(date);
        else await db.logs.put(log);
      });
      setDirtySlots(new Set());
      setPrefilled(undefined);
      setMessage(empty ? '空の記録なので削除しました' : hasBeautyFields(log) || SLOTS.some((s) => photos[s]) ? '保存しました。おつかれさまです！' : '保存しました');
    } catch (e) {
      setError('保存に失敗しました: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 使用中のもの＋この日に記録がある「やめたもの」
  const listFor = (kind: ProductKind) => products.filter((p) => p.kind === kind && (p.active || form.usage[p.id]?.length));

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-sm font-bold text-stone-600">体重</p>
            <div className="flex items-baseline gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={form.weight}
                onChange={(e) => set('weight', e.target.value)}
                placeholder="65.4"
                className="h-12 w-full min-w-0 rounded-xl border-2 border-stone-200 px-3 text-right text-xl focus:border-brand-300 focus:outline-none"
              />
              <span className="shrink-0 text-sm text-stone-500">kg</span>
            </div>
            {prefilled && <p className="mt-1 text-[11px] text-stone-400">前回（{prefilled}）の値</p>}
          </div>
          <div>
            <p className="mb-1 text-sm font-bold text-stone-600">睡眠時間</p>
            <div className="flex items-baseline gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={form.sleep}
                onChange={(e) => set('sleep', e.target.value)}
                placeholder="6.5"
                className="h-12 w-full min-w-0 rounded-xl border-2 border-stone-200 px-3 text-right text-xl focus:border-brand-300 focus:outline-none"
              />
              <span className="shrink-0 text-sm text-stone-500">時間</span>
            </div>
          </div>
        </div>
      </Card>

      {(['medicine', 'skincare'] as ProductKind[]).map((kind) => (
        <FoldCard
          key={kind}
          title={`使用中の${KIND_LABEL[kind]}`}
          summary={usageSummary(listFor(kind), form.usage)}
          action={<EditButton onClick={() => setEditing(kind)} />}
        >
          <UsageList items={listFor(kind)} usage={form.usage} toggle={toggleUsage} kind={kind} onAdd={() => setEditing(kind)} />
        </FoldCard>
      ))}

      <FoldCard title="今日の写真" summary={photoSummary(photos)}>
        <div className="grid grid-cols-3 gap-2">
          {SLOTS.map((s) => (
            <PhotoInput key={s} slot={s} blob={photos[s]} onChange={(b) => setPhoto(s, b)} />
          ))}
        </div>
      </FoldCard>

      <FoldCard title="今日の肌" summary={skinSummary(form)}>
        <div className="space-y-5">
          <Field label="新規ニキビ" hint="その日に気づいた新しいニキビの個数">
            <div className="flex items-center gap-2">
              <button className="h-11 w-11 rounded-full border-2 border-stone-200 text-lg text-stone-500" onClick={() => set('acne', String(Math.max(0, (Number(norm(form.acne)) || 0) - 1)))}>
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={form.acne}
                onChange={(e) => set('acne', e.target.value)}
                className="h-11 w-16 rounded-xl border-2 border-stone-200 text-center text-lg"
              />
              <button className="h-11 w-11 rounded-full border-2 border-stone-200 text-lg text-stone-500" onClick={() => set('acne', String((Number(norm(form.acne)) || 0) + 1))}>
                ＋
              </button>
              <span className="text-stone-500">個</span>
              {form.acne !== '' && (
                <button className="ml-auto h-11 text-sm text-stone-400" onClick={() => set('acne', '')}>
                  クリア
                </button>
              )}
            </div>
          </Field>
          <Field label="赤み" hint="1 = ほぼ目立たない / 5 = 遠目でも赤いとわかる">
            <ScoreButtons value={form.redness} onChange={(v) => set('redness', v)} />
          </Field>
          <Field label="テカリ（昼時点）" hint="1 = ほぼ出ない / 5 = 午前中からはっきり出る">
            <ScoreButtons value={form.oiliness} onChange={(v) => set('oiliness', v)} />
          </Field>
          <Field label="毛穴・跡" hint="1 = 近くで見てもほぼわからない / 5 = 会話距離でも目に入る">
            <ScoreButtons value={form.poresScars} onChange={(v) => set('poresScars', v)} />
          </Field>
          <Field label="乾燥" hint="粉吹き・突っ張りがあったか">
            <div className="flex gap-2">
              {[
                { v: true, l: 'あり' },
                { v: false, l: 'なし' },
              ].map(({ v, l }) => (
                <button key={l} onClick={() => set('dryness', form.dryness === v ? undefined : v)} className={`${chip(form.dryness === v)} flex-1`}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="ひげ周り" hint="剃り跡の青み・赤み・剃刀負け。1 = ほぼなし / 5 = 青みや赤みが目立つ">
            <ScoreButtons value={form.beardArea} onChange={(v) => set('beardArea', v)} />
          </Field>
          <Field label="ひげ周りメモ">
            <textarea value={form.beardNote} onChange={(e) => set('beardNote', e.target.value)} rows={2} className="w-full rounded-xl border-2 border-stone-200 p-2" />
          </Field>
        </div>
      </FoldCard>

      <Card title="メモ">
        <p className="-mt-2 mb-2 text-xs text-stone-400">食事・薬など、その日の気づき</p>
        <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} className="w-full rounded-xl border-2 border-stone-200 p-2" />
      </Card>

      <div className="sticky z-10 pt-2" style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}>
        {error && <p className="mb-2 rounded-xl bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {message && <p className="mb-2 rounded-xl bg-brand-50 p-2 text-center text-sm font-bold text-brand-700">{message}</p>}
        <button onClick={save} disabled={saving} className="h-14 w-full rounded-full bg-brand-500 text-lg font-bold text-white shadow-lg shadow-brand-300/40 disabled:opacity-50">
          {saving ? '保存中…' : '保存する'}
        </button>
      </div>

      {editing && <ProductEditor kind={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function photoSummary(photos: PhotoState): string {
  const n = SLOTS.filter((s) => photos[s]).length;
  return n ? `${SLOTS.filter((s) => photos[s]).map((s) => SLOT_LABEL[s]).join('・')}（${n}枚）` : 'まだありません';
}

function skinSummary(f: Form): string {
  const parts: string[] = [];
  if (norm(f.acne) !== '') parts.push(`ニキビ${norm(f.acne)}個`);
  if (f.redness) parts.push(`赤み${f.redness}`);
  if (f.oiliness) parts.push(`テカリ${f.oiliness}`);
  if (f.poresScars) parts.push(`毛穴・跡${f.poresScars}`);
  if (f.dryness !== undefined) parts.push(`乾燥${f.dryness ? 'あり' : 'なし'}`);
  if (f.beardArea) parts.push(`ひげ周り${f.beardArea}`);
  if (f.beardNote.trim()) parts.push('メモあり');
  return parts.length ? parts.join('・') : 'まだ記録なし';
}

/** 閉じた状態で見せる「ベピオゲル 朝・夜 / 化粧水 朝」のような要約 */
function usageSummary(items: Product[], usage: Record<string, Timing[]>): string {
  if (items.length === 0) return 'まだ登録がありません';
  const used = items.filter((p) => usage[p.id]?.length);
  if (used.length === 0) return `${items.length}件・まだ記録なし`;
  return used.map((p) => `${p.name} ${usage[p.id].map((t) => TIMING_LABEL[t]).join('・')}`).join(' / ');
}

/** 見出しを押すと開閉するカード（最初は閉じている） */
function FoldCard({ title, summary, action, children }: { title: string; summary: string; action?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl bg-white shadow-[0_1px_6px_rgba(120,60,70,0.06)]">
      <div className="flex items-center">
        <button onClick={() => setOpen(!open)} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 py-3 pl-4 text-left" aria-expanded={open}>
          <span className={`shrink-0 text-xs text-stone-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          <span className="min-w-0">
            <span className="block text-base font-bold text-stone-700">{title}</span>
            {!open && <span className="block truncate text-xs text-stone-400">{summary}</span>}
          </span>
        </button>
        {open && action && <div className="shrink-0 pr-3">{action}</div>}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-9 items-center gap-1 text-sm text-stone-400">
      編集する
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
      </svg>
    </button>
  );
}

function UsageList({
  items, usage, toggle, kind, onAdd,
}: {
  items: Product[];
  usage: Record<string, Timing[]>;
  toggle: (id: string, t: Timing) => void;
  kind: ProductKind;
  onAdd: () => void;
}) {
  if (items.length === 0)
    return (
      <button onClick={onAdd} className="h-12 w-full rounded-xl border-2 border-dashed border-stone-200 text-sm text-stone-400">
        ＋ {kind === 'medicine' ? '使っている薬' : '使っている化粧水など'}を追加する
      </button>
    );
  return (
    <ul className="divide-y divide-stone-100">
      {items.map((p) => (
        <li key={p.id} className="py-3 first:pt-0 last:pb-0">
          <p className="mb-2 text-stone-700">
            {p.name}
            {!p.active && <span className="ml-2 text-xs text-stone-400">（使用をやめたもの）</span>}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TIMINGS.map((t) => (
              <button key={t} onClick={() => toggle(p.id, t)} className={chip(!!usage[p.id]?.includes(t))}>
                {TIMING_LABEL[t]}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold text-stone-600">{label}</p>
      {hint && <p className="mb-1.5 text-xs text-stone-400">{hint}</p>}
      <div className={hint ? '' : 'mt-1'}>{children}</div>
    </div>
  );
}

function PhotoInput({ slot, blob, onChange }: { slot: PhotoSlot; blob?: Blob; onChange: (b?: Blob) => void }) {
  const url = useObjectUrl(blob);
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(false);
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => (blob ? setView(true) : ref.current?.click())}
        className="flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-brand-200 bg-brand-50 text-sm text-brand-500"
      >
        {busy ? (
          '処理中…'
        ) : url ? (
          <img src={url} alt={SLOT_LABEL[slot]} className="h-full w-full object-cover" />
        ) : (
          <>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="mt-1 text-xs">追加</span>
          </>
        )}
      </button>
      <p className="mt-1 text-xs text-stone-500">{SLOT_LABEL[slot]}</p>
      {blob && (
        <div className="flex justify-center gap-3 text-xs">
          <button className="h-8 text-brand-600" onClick={() => ref.current?.click()}>
            変更
          </button>
          <button className="h-8 text-stone-400" onClick={() => onChange(undefined)}>
            削除
          </button>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            onChange(await resizeToJpeg(f));
          } catch {
            alert('画像を読み込めませんでした');
          } finally {
            setBusy(false);
          }
        }}
      />
      {view && blob && <PhotoViewer blob={blob} onClose={() => setView(false)} />}
    </div>
  );
}
