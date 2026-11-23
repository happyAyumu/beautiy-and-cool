import type { Nutrients } from '../lib/nutrients';

export type FoodSeed = {
  id: string;
  name: string;
  per100: Nutrients; // 100g あたり
  presets: { label: string; grams: number }[];
  note?: string;
  needsCheck?: boolean; // 値が目安なので、パッケージで確認してほしいもの
};

// 一般的な食材は「日本食品標準成分表（八訂）」の 100g あたりの値
export const FOOD_SEEDS: FoodSeed[] = [
  {
    id: 'seed-rice',
    name: '白米（ごはん）',
    per100: { kcal: 156, protein: 2.5, fat: 0.3, carbs: 37.1, fiber: 1.5, salt: 0, potassium: 29, calcium: 3, iron: 0.1, vitA: 0, vitD: 0, vitB1: 0.02, vitB2: 0.01, vitB6: 0.02, vitB12: 0, vitC: 0 },
    presets: [{ label: '小盛', grams: 100 }, { label: '茶碗1杯', grams: 150 }, { label: '大盛', grams: 200 }],
    note: '炊いたごはんの重さ',
  },
  {
    id: 'seed-chicken-breast',
    name: '鶏胸肉（皮なし）',
    per100: { kcal: 105, protein: 23.3, fat: 1.9, carbs: 0.1, fiber: 0, salt: 0.1, potassium: 370, calcium: 4, iron: 0.3, vitA: 9, vitD: 0.1, vitB1: 0.1, vitB2: 0.11, vitB6: 0.64, vitB12: 0.2, vitC: 3 },
    presets: [{ label: '100g', grams: 100 }, { label: '150g', grams: 150 }, { label: '200g', grams: 200 }],
    note: '生の重さ',
  },
  {
    id: 'seed-egg',
    name: '卵',
    per100: { kcal: 142, protein: 12.2, fat: 10.2, carbs: 0.4, fiber: 0, salt: 0.4, potassium: 130, calcium: 46, iron: 1.5, vitA: 210, vitD: 3.8, vitB1: 0.06, vitB2: 0.37, vitB6: 0.09, vitB12: 1.1, vitC: 0 },
    presets: [{ label: '1個', grams: 50 }, { label: '2個', grams: 100 }, { label: '3個', grams: 150 }],
    note: '殻を除いた重さ（Mサイズ1個 約50g）',
  },
  {
    id: 'seed-natto',
    name: '納豆',
    per100: { kcal: 190, protein: 16.5, fat: 10, carbs: 12.1, fiber: 6.7, salt: 0, potassium: 690, calcium: 90, iron: 3.3, vitA: 0, vitD: 0, vitB1: 0.07, vitB2: 0.56, vitB6: 0.24, vitB12: 0, vitC: 0 },
    presets: [{ label: '1パック', grams: 45 }, { label: '2パック', grams: 90 }],
    note: '付属のたれ・からしは含まない',
  },
  {
    id: 'seed-yogurt',
    name: '無糖ヨーグルト',
    per100: { kcal: 56, protein: 3.6, fat: 3, carbs: 4.9, fiber: 0, salt: 0.1, potassium: 170, calcium: 120, iron: 0, vitA: 33, vitD: 0, vitB1: 0.04, vitB2: 0.14, vitB6: 0.04, vitB12: 0.1, vitC: 1 },
    presets: [{ label: '100g', grams: 100 }, { label: '200g', grams: 200 }],
    note: '全脂無糖（プレーン）',
  },
  {
    id: 'seed-banana',
    name: 'バナナ',
    per100: { kcal: 93, protein: 1.1, fat: 0.2, carbs: 22.5, fiber: 1.1, salt: 0, potassium: 360, calcium: 6, iron: 0.3, vitA: 5, vitD: 0, vitB1: 0.05, vitB2: 0.04, vitB6: 0.38, vitB12: 0, vitC: 16 },
    presets: [{ label: '1本', grams: 100 }, { label: '半分', grams: 50 }],
    note: '皮を除いた重さ（1本 約100g）',
  },
  {
    id: 'seed-blueberry',
    name: 'ブルーベリー',
    per100: { kcal: 48, protein: 0.5, fat: 0.1, carbs: 12.9, fiber: 3.3, salt: 0, potassium: 70, calcium: 8, iron: 0.2, vitA: 5, vitD: 0, vitB1: 0.03, vitB2: 0.03, vitB6: 0.05, vitB12: 0, vitC: 9 },
    presets: [{ label: '50g', grams: 50 }, { label: '100g', grams: 100 }],
    note: '生',
  },
  {
    id: 'seed-miso-soup',
    name: '豆腐の味噌汁',
    per100: { kcal: 26, protein: 2, fat: 1, carbs: 2.2, fiber: 0.4, salt: 0.9, potassium: 70, calcium: 25, iron: 0.4 },
    presets: [{ label: 'お椀1杯', grams: 180 }],
    note: '味噌・豆腐・だしで作った場合の目安。作り方で変わります',
  },
  {
    id: 'seed-frugra',
    name: 'フルグラ',
    per100: { kcal: 438, protein: 7.8, fat: 15.6, carbs: 71.8, salt: 0.6 },
    presets: [{ label: '40g', grams: 40 }, { label: '50g', grams: 50 }],
    note: '目安の値です。袋の表示と違えば直してください',
  },
  {
    id: 'seed-protein',
    name: 'プロテイン',
    per100: { kcal: 390, protein: 75, fat: 6, carbs: 10, salt: 0.5 },
    presets: [{ label: '1杯', grams: 30 }],
    note: '一般的なホエイの目安です。商品の表示と違えば直してください',
  },
  {
    id: 'seed-yangnyeom',
    name: 'ヤンニョムチキン（セブン）',
    per100: { kcal: 260, protein: 15, fat: 14, carbs: 18, salt: 1.5 },
    presets: [{ label: '100g', grams: 100 }],
    note: '目安の値です。パッケージの栄養成分表示と内容量を見て直してください',
    needsCheck: true,
  },
  {
    id: 'seed-dango',
    name: '串団子（ヤマザキ）',
    per100: { kcal: 202, protein: 2.5, fat: 0.7, carbs: 46.5, salt: 0.8 },
    presets: [{ label: '1本', grams: 60 }, { label: '3本', grams: 180 }],
    note: '「串団子たれ」1本 約121kcal をもとにした目安です',
  },
];
