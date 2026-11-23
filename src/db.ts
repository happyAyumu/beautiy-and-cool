import Dexie, { type EntityTable } from 'dexie';

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

export type DailyLog = {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  sleepHours?: number;
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
  constructor() {
    super('body-log');
    this.version(1).stores({ logs: 'date', photos: 'id, date', meta: 'key' });
    this.version(2).stores({ logs: 'date', photos: 'id, date', meta: 'key', products: 'id' });
  }
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
