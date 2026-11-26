import { db, type WeeklyItem, MEAL_SLOT_LABEL, MEAL_SLOTS, usageText, type DailyLog, type MealItem } from '../db';
import { sumNutrients } from '../lib/nutrients';
import { addDays, periodStart, todayTokyo, type Period } from '../lib/date';

/** 「朝: ヨーグルト 200g、バナナ 100g / 昼: …」 */
function mealsText(meals: MealItem[] | undefined): string | undefined {
  if (!meals?.length) return undefined;
  const list = (ms: MealItem[]) => ms.map((m) => `${m.name} ${m.grams}g`).join('、');
  const groups = MEAL_SLOTS.filter((s) => meals.some((m) => (m.slot ?? 'snack') === s)).map((s) => `${MEAL_SLOT_LABEL[s]}: ${list(meals.filter((m) => (m.slot ?? 'snack') === s))}`);
  return groups.join(' / ');
}

function pfc(l: DailyLog): (string | undefined)[] {
  if (!l.meals?.length) return [undefined, undefined, undefined];
  const { total } = sumNutrients(l.meals.map((m) => m.nutrients));
  return [total.protein?.toFixed(1), total.fat?.toFixed(1), total.carbs?.toFixed(1)];
}

const cell = (v: unknown) => (v === undefined || v === null ? '' : String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' / '));

export async function buildAiMarkdown(period: Period): Promise<string> {
  const today = todayTokyo();
  const firstLog = await db.logs.orderBy('date').first();
  const start = periodStart(period, today, firstLog?.date);
  const logs: DailyLog[] = await db.logs.where('date').between(start, today, true, true).toArray();
  const products = new Map((await db.products.toArray()).map((p) => [p.id, p]));

  const header = ['日付', '体重(kg)', '睡眠時間(時間)', '摂取カロリー(kcal)', 'たんぱく質(g)', '脂質(g)', '炭水化物(g)', '食べたもの', '新規ニキビ(個)', '赤み', 'テカリ', '毛穴・跡', '乾燥', 'ひげ周り', 'ひげ周りメモ', 'メモ', '使った薬・肌ケア用品'];
  const lines = [
    '# 体重・睡眠・美容の記録',
    '',
    `期間: ${start} 〜 ${today}（記録日数: ${logs.length}日）`,
    '赤み・テカリ・毛穴・跡・ひげ周りは 1〜5 の自己評価（1 = 目立たない、5 = 強く目立つ）。新規ニキビはその日に気づいた新しいニキビの個数、乾燥は粉吹き・突っ張りの有無、体重は起床直後の値、摂取カロリーはその日に食べたものの合計（たんぱく質・脂質・炭水化物は食べたものを登録した日だけ）、使った薬・肌ケア用品は名前と使った時間帯（朝・昼・夜・その他）。空欄は未入力。',
    '',
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...logs.map(
      (l) =>
        `| ${[
          l.date,
          l.weightKg?.toFixed(1),
          l.sleepHours?.toFixed(1),
          l.calories,
          ...pfc(l),
          mealsText(l.meals),
          l.newAcneCount,
          l.redness,
          l.oiliness,
          l.poresScars,
          l.dryness === undefined ? undefined : l.dryness ? 'あり' : 'なし',
          l.beardArea,
          l.beardNote,
          l.note,
          usageText(l.usage, products) || undefined,
        ]
          .map(cell)
          .join(' | ')} |`,
    ),
  ];
  // 週間チェックと変更メモ（期間内にあるときだけ）
  const [weekly, changes] = await Promise.all([
    db.weekly.where('id').between(addDays(start, -6), today, true, true).toArray(),
    db.changes.where('date').between(start, today, true, true).sortBy('date'),
  ]);
  if (weekly.length) {
    const items: [WeeklyItem, string][] = [['oil', '油分'], ['moisture', '水分'], ['pores', '毛穴'], ['texture', 'キメ'], ['clarity', '透明感・シミ'], ['firmness', 'ハリ']];
    const ans = { better: '良くなった', same: '同じ', worse: '悪くなった' } as const;
    lines.push('', '## 週間チェック（先週と比べて）', '', `| 週（月曜〜） | ${items.map((i) => i[1]).join(' | ')} | 写真 | メモ |`, `| --- | ${items.map(() => '---').join(' | ')} | --- | --- |`);
    for (const w of weekly)
      lines.push(
        `| ${[w.id, ...items.map(([k]) => (w.answers[k] ? ans[w.answers[k]!] : '')), w.photoTaken ? '撮った' : '', items.filter(([k]) => w.notes[k]?.trim()).map(([k, l]) => `${l}: ${w.notes[k]}`).join('、')].map(cell).join(' | ')} |`,
      );
  }
  if (changes.length) {
    const kind = { new_product: '新しい商品を使い始めた', medicine: '薬を始めた・変えた', other: 'その他' } as const;
    lines.push('', '## 変更メモ', '', ...changes.map((c) => `- ${c.date} ${kind[c.kind]}: ${c.text}`));
  }
  return lines.join('\n') + '\n';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
