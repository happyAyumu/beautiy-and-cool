import JSZip from 'jszip';
import { NUTRIENT_KEYS } from '../lib/nutrients';
import { assignSlots, db, MEAL_SLOTS, seedFoods, SLOTS, type MealSlot, TIMINGS, photoId, setMeta, type DailyLog, type Photo, type PhotoSlot, type Food, type MealItem, type MealTemplate, type Product, type Score, type Timing, type Usage } from '../db';
import { stampTokyo } from '../lib/date';

type PhotoEntry = { id: string; date: string; slot: PhotoSlot; file: string };
type BackupJson = { version: 3; exportedAt: string; logs: DailyLog[]; photos: PhotoEntry[]; products: Product[]; foods: Food[]; templates: MealTemplate[] };

export async function createBackup(): Promise<File> {
  const [logs, photos, products, foods, templates] = await Promise.all([db.logs.toArray(), db.photos.toArray(), db.products.toArray(), db.foods.toArray(), db.templates.toArray()]);
  const zip = new JSZip();
  const entries: PhotoEntry[] = photos.map((p) => {
    const file = `photos/${p.date}_${p.slot}.jpg`;
    zip.file(file, p.blob);
    return { id: p.id, date: p.date, slot: p.slot, file };
  });
  const data: BackupJson = { version: 3, exportedAt: new Date().toISOString(), logs, photos: entries, products, foods, templates };
  zip.file('data.json', JSON.stringify(data, null, 1));
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  return new File([blob], `backup-${stampTokyo()}.zip`, { type: 'application/zip' });
}

/** 共有メニューを開く。非対応ならダウンロード。成功で true */
export async function shareOrDownload(file: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      // NotAllowedError などはダウンロードに切り替え
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

export async function markBackedUp() {
  await setMeta('lastBackupAt', new Date().toISOString());
}

export type ParsedBackup = {
  logs: DailyLog[];
  photos: Photo[];
  products: Product[];
  foods: Food[];
  templates: MealTemplate[];
  dates: string[]; // 含まれる日付
  conflicts: string[]; // すでに端末にある日付
  exportedAt?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const score = (v: unknown) => (typeof v === 'number' && [1, 2, 3, 4, 5].includes(v) ? (v as Score) : undefined);
const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);

function cleanNutrients(v: unknown): Record<string, number> {
  const o: Record<string, number> = {};
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (NUTRIENT_KEYS.includes(k as never) && typeof x === 'number' && Number.isFinite(x)) o[k] = x;
  return o;
}

function cleanMeals(v: unknown): MealItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((m) => typeof m?.name === 'string' && typeof m?.grams === 'number')
    .map((m) => ({
      id: str(m.id) ?? crypto.randomUUID(), foodId: str(m.foodId) ?? '', name: m.name as string, grams: m.grams as number, nutrients: cleanNutrients(m.nutrients),
      ...(MEAL_SLOTS.includes(m.slot) ? { slot: m.slot as MealSlot } : {}),
    }));
  return out.length ? out : undefined;
}

function cleanFood(r: Record<string, unknown>): Food | undefined {
  if (typeof r?.id !== 'string' || typeof r?.name !== 'string') return undefined;
  const presets = Array.isArray(r.presets)
    ? (r.presets as Record<string, unknown>[]).filter((p) => typeof p?.label === 'string' && typeof p?.grams === 'number').map((p) => ({ label: p.label as string, grams: p.grams as number }))
    : [];
  return {
    id: r.id, name: r.name, per100: cleanNutrients(r.per100), presets, note: str(r.note),
    needsCheck: r.needsCheck === true ? true : undefined, active: r.active !== false, createdAt: str(r.createdAt) ?? new Date().toISOString(),
  };
}

function cleanTemplate(r: Record<string, unknown>): MealTemplate | undefined {
  if (typeof r?.id !== 'string' || typeof r?.name !== 'string' || !Array.isArray(r.items)) return undefined;
  const items = (r.items as Record<string, unknown>[])
    .filter((i) => typeof i?.foodId === 'string' && typeof i?.grams === 'number')
    .map((i) => ({ foodId: i.foodId as string, grams: i.grams as number }));
  return { id: r.id, name: r.name, ...(MEAL_SLOTS.includes(r.slot as MealSlot) ? { slot: r.slot as MealSlot } : {}), items, createdAt: str(r.createdAt) ?? new Date().toISOString() };
}

function cleanUsage(v: unknown): Usage[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((u) => typeof u?.productId === 'string' && Array.isArray(u?.times))
    .map((u) => ({ productId: u.productId as string, times: TIMINGS.filter((t) => (u.times as Timing[]).includes(t)) }))
    .filter((u) => u.times.length);
  return out.length ? out : undefined;
}

function cleanProduct(r: Record<string, unknown>): Product | undefined {
  if (typeof r?.id !== 'string' || typeof r?.name !== 'string' || (r.kind !== 'medicine' && r.kind !== 'skincare')) return undefined;
  return { id: r.id, name: r.name, kind: r.kind, active: r.active !== false, createdAt: str(r.createdAt) ?? new Date().toISOString() };
}

function cleanLog(r: Record<string, unknown>): DailyLog | undefined {
  if (typeof r.date !== 'string' || !DATE_RE.test(r.date)) return undefined;
  const l: DailyLog = {
    date: r.date,
    weightKg: num(r.weightKg),
    sleepHours: num(r.sleepHours),
    calories: num(r.calories),
    meals: cleanMeals(r.meals),
    newAcneCount: num(r.newAcneCount),
    redness: score(r.redness),
    oiliness: score(r.oiliness),
    poresScars: score(r.poresScars),
    dryness: typeof r.dryness === 'boolean' ? r.dryness : undefined,
    beardArea: score(r.beardArea),
    beardNote: str(r.beardNote),
    note: str(r.note),
    usage: cleanUsage(r.usage),
    updatedAt: str(r.updatedAt) ?? new Date().toISOString(),
  };
  (Object.keys(l) as (keyof DailyLog)[]).forEach((k) => l[k] === undefined && delete l[k]);
  return l;
}

export async function parseBackup(file: Blob): Promise<ParsedBackup> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('zip ファイルを読み込めませんでした');
  }
  const json = zip.file('data.json');
  if (!json) throw new Error('data.json が見つかりません。このアプリのバックアップではないようです');
  const data = JSON.parse(await json.async('string'));
  if (![1, 2, 3].includes(data?.version)) throw new Error(`対応していない形式です（version: ${data?.version}）`);

  const logs = (Array.isArray(data.logs) ? data.logs : []).map(cleanLog).filter(Boolean) as DailyLog[];
  const photos: Photo[] = [];
  for (const p of Array.isArray(data.photos) ? data.photos : []) {
    if (!DATE_RE.test(p?.date) || !SLOTS.includes(p?.slot) || typeof p?.file !== 'string') continue;
    const f = zip.file(p.file);
    if (!f) continue;
    const blob = new Blob([await f.async('arraybuffer')], { type: 'image/jpeg' });
    photos.push({ id: photoId(p.date, p.slot), date: p.date, slot: p.slot, blob });
  }
  const products = (Array.isArray(data.products) ? data.products : []).map(cleanProduct).filter(Boolean) as Product[];
  const foods = (Array.isArray(data.foods) ? data.foods : []).map(cleanFood).filter(Boolean) as Food[];
  const templates = (Array.isArray(data.templates) ? data.templates : []).map(cleanTemplate).filter(Boolean) as MealTemplate[];
  const dates = [...new Set([...logs.map((l) => l.date), ...photos.map((p) => p.date)])].sort();
  const existing = new Set<string>([...((await db.logs.toCollection().primaryKeys()) as string[]), ...((await db.photos.orderBy('date').uniqueKeys()) as string[])]);
  return { logs, photos, products, foods, templates, dates, conflicts: dates.filter((d) => existing.has(d)), exportedAt: str(data.exportedAt) };
}

export async function applyBackup(b: ParsedBackup, mode: 'overwrite' | 'skip'): Promise<number> {
  const skip = new Set(mode === 'skip' ? b.conflicts : []);
  const target = b.dates.filter((d) => !skip.has(d));
  const set = new Set(target);
  await db.transaction('rw', [db.logs, db.photos, db.products, db.foods, db.templates], async () => {
    await db.templates.bulkPut(b.templates);
    // 食材は、バックアップの値で上書き（端末で直した値より新しいとは限らないが、復元時はバックアップを正とする）
    await db.foods.bulkPut(b.foods);
    // 薬・肌ケア用品は、端末にないものだけ追加する（名前の変更は端末側を優先）
    const have = new Set((await db.products.toCollection().primaryKeys()) as string[]);
    await db.products.bulkAdd(b.products.filter((p) => !have.has(p.id)));
    // 上書きする日は、その日の既存の記録と写真をいったん消してから入れる
    await db.logs.bulkDelete(target);
    await db.photos.where('date').anyOf(target).delete();
    const templates = await db.templates.toArray();
    await db.logs.bulkPut(b.logs.filter((l) => set.has(l.date)).map((l) => (l.meals ? { ...l, meals: assignSlots(l.meals, templates) } : l)));
    await db.photos.bulkPut(b.photos.filter((p) => set.has(p.date)));
  });
  return target.length;
}

export async function deleteAll() {
  await db.transaction('rw', [db.logs, db.photos, db.products, db.foods, db.templates], async () => {
    await db.templates.clear();
    await db.logs.clear();
    await db.photos.clear();
    await db.products.clear();
    await db.foods.clear();
    await db.foods.bulkAdd(seedFoods());
  });
}
