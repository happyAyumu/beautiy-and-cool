export type NutrientKey =
  | 'kcal' | 'protein' | 'fat' | 'carbs' | 'fiber' | 'salt'
  | 'potassium' | 'calcium' | 'iron'
  | 'vitA' | 'vitD' | 'vitB1' | 'vitB2' | 'vitB6' | 'vitB12' | 'vitC';

export type Nutrients = Partial<Record<NutrientKey, number>>;

export type NutrientDef = { key: NutrientKey; label: string; unit: string; decimals: number; group: 'main' | 'mineral' | 'vitamin' };

export const NUTRIENTS: NutrientDef[] = [
  { key: 'kcal', label: 'エネルギー', unit: 'kcal', decimals: 0, group: 'main' },
  { key: 'protein', label: 'たんぱく質', unit: 'g', decimals: 1, group: 'main' },
  { key: 'fat', label: '脂質', unit: 'g', decimals: 1, group: 'main' },
  { key: 'carbs', label: '炭水化物', unit: 'g', decimals: 1, group: 'main' },
  { key: 'fiber', label: '食物繊維', unit: 'g', decimals: 1, group: 'main' },
  { key: 'salt', label: '食塩相当量', unit: 'g', decimals: 1, group: 'main' },
  { key: 'potassium', label: 'カリウム', unit: 'mg', decimals: 0, group: 'mineral' },
  { key: 'calcium', label: 'カルシウム', unit: 'mg', decimals: 0, group: 'mineral' },
  { key: 'iron', label: '鉄', unit: 'mg', decimals: 1, group: 'mineral' },
  { key: 'vitA', label: 'ビタミンA', unit: 'µg', decimals: 0, group: 'vitamin' },
  { key: 'vitD', label: 'ビタミンD', unit: 'µg', decimals: 1, group: 'vitamin' },
  { key: 'vitB1', label: 'ビタミンB1', unit: 'mg', decimals: 2, group: 'vitamin' },
  { key: 'vitB2', label: 'ビタミンB2', unit: 'mg', decimals: 2, group: 'vitamin' },
  { key: 'vitB6', label: 'ビタミンB6', unit: 'mg', decimals: 2, group: 'vitamin' },
  { key: 'vitB12', label: 'ビタミンB12', unit: 'µg', decimals: 1, group: 'vitamin' },
  { key: 'vitC', label: 'ビタミンC', unit: 'mg', decimals: 0, group: 'vitamin' },
];

export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key);

/** 100g あたりの値を、grams 分に換算 */
export function scale(per100: Nutrients, grams: number): Nutrients {
  const out: Nutrients = {};
  for (const k of NUTRIENT_KEYS) {
    const v = per100[k];
    if (v !== undefined) out[k] = Math.round(((v * grams) / 100) * 1000) / 1000;
  }
  return out;
}

/** 合計。どれか1つでも値がない食材があれば missing に入れる */
export function sumNutrients(list: Nutrients[]): { total: Nutrients; missing: Set<NutrientKey> } {
  const total: Nutrients = {};
  const missing = new Set<NutrientKey>();
  for (const k of NUTRIENT_KEYS) {
    let s = 0;
    let any = false;
    for (const n of list) {
      if (n[k] === undefined) missing.add(k);
      else {
        s += n[k]!;
        any = true;
      }
    }
    if (any) total[k] = Math.round(s * 1000) / 1000;
  }
  return { total, missing };
}

export function fmtNutrient(def: NutrientDef, v: number | undefined): string {
  if (v === undefined) return '—';
  return def.decimals === 0 ? Math.round(v).toLocaleString('ja-JP') : v.toFixed(def.decimals);
}
