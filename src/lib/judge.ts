import type { ChangeNote, IrritationFlag, OwnedItem, PurchaseSheet, Verdict } from '../db';
import { CONCERN_LABEL, INGREDIENT_BY_ID, ingredientName, matchingIngredients } from '../data/ingredients';
import { addDays } from './date';

export type RuleHit = { rule: string; verdict: Verdict; reason: string };
export type Judgement = {
  verdict: Verdict;
  hits: RuleHit[]; // 当たったルール（上から順）。先頭が判定
  suggestions: string[];
  duplicates: { item: OwnedItem; shared: string[] }[];
  evidence: string;
  flags: IrritationFlag[]; // 自動で足したものを含む刺激リスク
};

export const VERDICT_LABEL: Record<Verdict, string> = { ok: '買ってよい（条件付き）', hold: '保留', skip: '見送り' };
export const DISCLAIMER = 'これは医療上の判断ではありません。処方薬との併用は医師・薬剤師に確認してください。';

type Input = Pick<
  PurchaseSheet,
  'type' | 'targetConcerns' | 'mainIngredients' | 'freeIngredients' | 'fullListChecked' | 'irritationFlags' | 'oilLevel' | 'timing' | 'currentSkin' | 'evidence' | 'allergySeafood'
>;

/** 手持ち品との重複（同じ悩みに関係する、同じ主成分） */
export function findDuplicates(s: Pick<Input, 'targetConcerns' | 'mainIngredients'>, owned: OwnedItem[]) {
  return owned
    .filter((o) => o.inUse)
    .map((o) => ({
      item: o,
      shared: s.mainIngredients.filter((id) => o.mainIngredients.includes(id) && s.targetConcerns.some((c) => matchingIngredients(c).includes(id) || INGREDIENT_BY_ID.get(id)?.concerns.includes(c))),
    }))
    .filter((d) => d.shared.length > 0);
}

/** 判定ルール（指示書の 1〜8 を上から順に当てる） */
export function judge(s: Input, ctx: { owned: OwnedItem[]; changes: ChangeNote[]; today: string }): Judgement {
  const hits: RuleHit[] = [];
  const suggestions: string[] = [];
  const auto = s.mainIngredients.map((id) => INGREDIENT_BY_ID.get(id)?.irritation).filter(Boolean) as IrritationFlag[];
  const flags = [...new Set([...s.irritationFlags, ...auto])];

  // 1. 狙う悩みに合う成分がない
  const matching = new Set(s.targetConcerns.flatMap(matchingIngredients));
  if (!s.mainIngredients.some((id) => matching.has(id))) hits.push({ rule: 'rule_1', verdict: 'skip', reason: '狙う悩みに合う成分が見当たらない' });
  // 2. 全成分表示を確認していない
  if (!s.fullListChecked) hits.push({ rule: 'rule_2', verdict: 'hold', reason: '成分表示の確認が先' });
  // 3. 手持ち品と重複
  const duplicates = findDuplicates(s, ctx.owned);
  if (duplicates.length)
    hits.push({ rule: 'rule_3', verdict: 'hold', reason: `すでに同じ成分を使っている（${duplicates.map((d) => d.item.name).join('、')}）。足す必要が薄い可能性` });
  // 4. 直近2週間に新しい商品・薬の変更
  const from = addDays(ctx.today, -13);
  const recent = ctx.changes.filter((c) => c.date >= from && c.date <= ctx.today && (c.kind === 'new_product' || c.kind === 'medicine'));
  if (recent.length) hits.push({ rule: 'rule_4', verdict: 'hold', reason: `1つずつ足す。落ち着いてから（直近: ${recent.map((c) => c.text).join('、')}）` });
  // 5. 荒れ・傷・剃った直後 ＋ 刺激リスク
  if (s.currentSkin.length && flags.length) hits.push({ rule: 'rule_5', verdict: 'hold', reason: '肌が落ち着いてから' });
  // 6. 酸・レチノイドをレチノールと同じ夜に
  if ((flags.includes('acid') || flags.includes('retinoid')) && s.timing === 'night') {
    hits.push({ rule: 'rule_6', verdict: 'hold', reason: '同じ夜に重ねると刺激が強くなりやすい' });
    suggestions.push('使う日を「レチノールを使わない日の夜」にずらす案があります');
  }
  // 7. 乳液・クリームで油分が多め・不明
  if (s.type === 'emulsion' && s.oilLevel !== 'oil_free') {
    hits.push({ rule: 'rule_7', verdict: 'hold', reason: 'ニキビが増えた経験があるため、頬の小範囲から' });
    suggestions.push('使うなら、乾く所（頬など）の小範囲から試す');
  }
  // 8. どれにも当たらない
  if (!hits.length) {
    hits.push({ rule: 'rule_8', verdict: 'ok', reason: '小範囲で試して、2週間見る' });
  }
  if (s.mainIngredients.includes('pdrn') && !s.allergySeafood) suggestions.push('PDRN 配合: 魚介類アレルギーの確認がまだです');
  const unknownFree = !!s.freeIngredients?.trim();
  const evidence =
    s.evidence === 'unconfirmed' || (unknownFree && s.mainIngredients.length === 0)
      ? '未確認'
      : s.evidence === 'maker'
        ? 'メーカー表記だけ（一次情報は未確認）'
        : `一般的な説明（辞書の範囲・一次情報は未確認）${unknownFree ? '。自由記入の成分は未確認' : ''}`;
  return { verdict: hits[0].verdict, hits, suggestions, duplicates, evidence, flags };
}

export function concernsText(cs: string[]) {
  return cs.map((c) => CONCERN_LABEL[c as keyof typeof CONCERN_LABEL] ?? c).join('・');
}
export { ingredientName };
