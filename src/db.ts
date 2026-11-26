import Dexie, { type EntityTable } from 'dexie';
import type { Nutrients } from './lib/nutrients';
import { FOOD_SEEDS } from './data/foods';
import type { Concern } from './data/ingredients';

export type Score = 1 | 2 | 3 | 4 | 5;
export type PhotoSlot = 'front' | 'right' | 'left';
export type Timing = 'morning' | 'noon' | 'night' | 'other';
export const TIMINGS: Timing[] = ['morning', 'noon', 'night', 'other'];
export const TIMING_LABEL: Record<Timing, string> = { morning: '朝', noon: '昼', night: '夜', other: 'その他' };

export type ProductKind = 'medicine' | 'skincare';
export const KIND_LABEL: Record<ProductKind, string> = { medicine: 'おくすり', skincare: '肌ケア用品' };

/** 使っている薬・化粧水など */
export type Product = {
  id: string;
  name: string;
  kind: ProductKind;
  active: boolean; // false = 使用をやめた（過去の記録には残る）
  createdAt: string;
};

export type Usage = { productId: string; times: Timing[] };

/** 食材（100g あたりの栄養） */
export type Food = {
  id: string;
  name: string;
  per100: Nutrients;
  presets: { label: string; grams: number }[];
  note?: string;
  needsCheck?: boolean;
  active: boolean;
  createdAt: string;
};

// ---- ケア（週間チェック・購入判断・手持ち品・変更メモ）----
export type WeeklyItem = 'oil' | 'moisture' | 'pores' | 'texture' | 'clarity' | 'firmness';
export type WeeklyAnswer = 'better' | 'same' | 'worse';
/** 週間チェック。id は その週の月曜日 YYYY-MM-DD */
export type WeeklyCheck = {
  id: string;
  answers: Partial<Record<WeeklyItem, WeeklyAnswer>>;
  notes: Partial<Record<WeeklyItem, string>>;
  photoTaken?: boolean;
  updatedAt: string;
};

export type SkinProductType = 'cleanser' | 'lotion' | 'serum' | 'pack' | 'emulsion' | 'sunscreen' | 'other';
export type IrritationFlag = 'fragrance' | 'ethanol' | 'acid' | 'retinoid' | 'other';
export type Verdict = 'ok' | 'hold' | 'skip';
export type TrialResult = 'good' | 'no_change' | 'worse';

/** 購入判断シート */
export type PurchaseSheet = {
  id: string;
  name: string;
  type: SkinProductType;
  targetConcerns: Concern[];
  mainIngredients: string[]; // 辞書の id
  freeIngredients?: string; // 辞書にない成分（自由記入）
  ingredientPosition: 'upper' | 'middle' | 'lower' | 'unknown';
  fullListChecked?: boolean;
  irritationFlags: IrritationFlag[];
  oilLevel: 'oil_free' | 'oily' | 'unknown';
  quasiDrug: 'quasi' | 'cosmetic' | 'unknown';
  area: 'face' | 'cheeks_only' | 't_zone_only' | 'avoid_mouth';
  timing: 'morning' | 'night' | 'night_no_retinol';
  allergySeafood?: boolean;
  allergyPast?: boolean;
  currentSkin: ('rough' | 'wound' | 'shaved')[];
  evidence: 'general' | 'maker' | 'unconfirmed';
  patchTestDate?: string;
  verdict: Verdict;
  reasons: string[]; // rule_1 など
  startedOn?: string;
  result?: TrialResult;
  createdAt: string;
  updatedAt: string;
};

/** 手持ち品（重複チェック用） */
export type OwnedItem = {
  id: string;
  name: string;
  type: SkinProductType;
  mainIngredients: string[];
  startedOn?: string;
  inUse: boolean;
  sheetId?: string;
  createdAt: string;
};

/** 変更メモ（新しい商品・薬の開始など） */
export type ChangeNote = { id: string; date: string; kind: 'new_product' | 'medicine' | 'other'; text: string; createdAt: string };

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_SLOT_LABEL: Record<MealSlot, string> = { breakfast: '朝', lunch: '昼', dinner: '夜', snack: '間食' };

/** 食事のテンプレート（朝の定番 など） */
export type MealTemplate = { id: string; name: string; slot?: MealSlot; items: { foodId: string; grams: number }[]; createdAt: string };

/** テンプレートの区分。未設定なら名前から推測する */
export function templateSlot(t: MealTemplate): MealSlot | undefined {
  if (t.slot) return t.slot;
  if (t.name.includes('朝')) return 'breakfast';
  if (t.name.includes('昼')) return 'lunch';
  if (t.name.includes('夜') || t.name.includes('夕')) return 'dinner';
  if (t.name.includes('間食') || t.name.includes('おやつ')) return 'snack';
  return undefined;
}

/** 区分のない食べたもの（区分を分ける前の記録）に区分を付ける。
 *  その食材が入っている区分付きテンプレートの区分にし、見つからなければ間食にする */
export function assignSlots(meals: MealItem[], templates: MealTemplate[]): MealItem[] {
  if (meals.every((m) => m.slot)) return meals;
  const bySlotFood = new Map<string, MealSlot>();
  for (const t of templates) {
    const s = templateSlot(t);
    if (s) for (const it of t.items) if (!bySlotFood.has(it.foodId)) bySlotFood.set(it.foodId, s);
  }
  return meals.map((m) => (m.slot ? m : { ...m, slot: bySlotFood.get(m.foodId) ?? 'snack' }));
}

/** その日に食べたもの。食材をあとで直しても過去の記録が変わらないよう、栄養はその時点の値で保存する */
export type MealItem = { id: string; foodId: string; name: string; grams: number; nutrients: Nutrients; slot?: MealSlot };

export type DailyLog = {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  sleepHours?: number;
  calories?: number;       // 摂取カロリー kcal（整数）。食べたものがある日は、その合計
  meals?: MealItem[];
  newAcneCount?: number;
  redness?: Score;
  oiliness?: Score;
  poresScars?: Score;
  dryness?: boolean;
  beardArea?: Score;
  beardNote?: string;
  note?: string;
  usage?: Usage[]; // その日に使ったもの
  updatedAt: string;
};

export type Photo = {
  id: string; // `${date}_${slot}`
  date: string;
  slot: PhotoSlot;
  blob: Blob;
};

export type MetaRow = { key: string; value: string };

class AppDB extends Dexie {
  logs!: EntityTable<DailyLog, 'date'>;
  photos!: EntityTable<Photo, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;
  products!: EntityTable<Product, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  templates!: EntityTable<MealTemplate, 'id'>;
  weekly!: EntityTable<WeeklyCheck, 'id'>;
  sheets!: EntityTable<PurchaseSheet, 'id'>;
  owned!: EntityTable<OwnedItem, 'id'>;
  changes!: EntityTable<ChangeNote, 'id'>;
  constructor() {
    super('body-log');
    this.version(1).stores({ logs: 'date', photos: 'id, date', meta: 'key' });
    this.version(2).stores({ logs: 'date', photos: 'id, date', meta: 'key', products: 'id' });
    this.version(3)
      .stores({ logs: 'date', photos: 'id, date', meta: 'key', products: 'id', foods: 'id' })
      .upgrade((tx) => tx.table('foods').bulkPut(seedFoods()));
    // 要確認はヤンニョムチキンだけにする
    this.version(4)
      .stores({ logs: 'date', photos: 'id, date', meta: 'key', products: 'id', foods: 'id' })
      .upgrade((tx) =>
        tx
          .table('foods')
          .toCollection()
          .modify((f: Food) => {
            if (f.id !== 'seed-yangnyeom') delete f.needsCheck;
          }),
      );
    this.version(5).stores({ logs: 'date', photos: 'id, date', meta: 'key', products: 'id', foods: 'id', templates: 'id' });
    // 区分のない食べたものに区分を付ける
    this.version(6)
      .stores({ logs: 'date', photos: 'id, date', meta: 'key', products: 'id', foods: 'id', templates: 'id' })
      .upgrade(async (tx) => {
        const templates = (await tx.table('templates').toArray()) as MealTemplate[];
        await tx
          .table('logs')
          .toCollection()
          .modify((l: DailyLog) => {
            if (l.meals?.some((m) => !m.slot)) l.meals = assignSlots(l.meals, templates);
          });
      });
    // ケア機能の表を追加（既存の記録には手を付けない）
    this.version(7).stores({
      logs: 'date', photos: 'id, date', meta: 'key', products: 'id', foods: 'id', templates: 'id',
      weekly: 'id', sheets: 'id', owned: 'id', changes: 'id, date',
    });
    this.on('populate', (tx) => {
      tx.table('foods').bulkAdd(seedFoods());
    });
  }
}

export function seedFoods(): Food[] {
  const now = Date.now();
  return FOOD_SEEDS.map((f, i) => ({ ...f, active: true, createdAt: new Date(now + i).toISOString() }));
}

export const db = new AppDB();

export const SLOTS: PhotoSlot[] = ['front', 'right', 'left'];
export const SLOT_LABEL: Record<PhotoSlot, string> = { front: '正面', right: '右斜め', left: '左斜め' };
export const photoId = (date: string, slot: PhotoSlot) => `${date}_${slot}`;

/** 美容の項目（写真以外）が1つでも入っているか */
export function hasBeautyFields(l: DailyLog | undefined): boolean {
  if (!l) return false;
  return (
    l.newAcneCount !== undefined ||
    l.redness !== undefined ||
    l.oiliness !== undefined ||
    l.poresScars !== undefined ||
    l.dryness !== undefined ||
    l.beardArea !== undefined ||
    !!l.beardNote ||
    !!l.note ||
    !!l.usage?.length
  );
}

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value;
}
export async function setMeta(key: string, value: string) {
  await db.meta.put({ key, value });
}

export function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 使用状況を「ベピオ: 朝・夜 / 化粧水: 朝」の形に */
export function usageText(usage: Usage[] | undefined, products: Map<string, Product>): string {
  return (usage ?? [])
    .filter((u) => u.times.length)
    .map((u) => `${products.get(u.productId)?.name ?? '（削除済み）'}: ${u.times.map((t) => TIMING_LABEL[t]).join('・')}`)
    .join(' / ');
}
