// 悩み別の成分辞書（指示書 ver1.01 の内容）。一般的な説明で、メーカー資料や臨床試験の一次情報は確認していない。

export type Concern = 'redness' | 'pores' | 'firmness' | 'gloss' | 'moisture' | 'clarity' | 'oil' | 'acne';
export const CONCERNS: Concern[] = ['redness', 'pores', 'firmness', 'gloss', 'moisture', 'clarity', 'oil', 'acne'];
export const CONCERN_LABEL: Record<Concern, string> = {
  redness: '赤み', pores: '毛穴', firmness: 'ハリ', gloss: 'ツヤ', moisture: '水分', clarity: '透明感', oil: 'テカリ', acne: 'ニキビ',
};

export type IngredientCategory = 'hold' | 'seal' | 'calm' | 'clarity' | 'exfoliate' | 'firm';
export const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  hold: '保湿（水分を抱える）', seal: '保湿（逃がさない）', calm: '鎮静・肌荒れ防止', clarity: '透明感・色むら', exfoliate: '角質・毛穴', firm: 'ハリ・弾力',
};

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  mainEffect: string;
  effectCount: 1 | 2;
  concernText: string; // 表示用「関係する悩み」
  concerns: Concern[]; // 判定用
  note: string;
  irritation?: 'acid' | 'retinoid'; // 刺激リスクとして自動でチェックするもの
};

export const INGREDIENTS: Ingredient[] = [
  { id: 'glycerin', name: 'グリセリン', category: 'hold', mainEffect: '水分を抱え込む', effectCount: 1, concernText: '乾燥', concerns: ['moisture'], note: '化粧水の基本成分' },
  { id: 'hyaluronic', name: 'ヒアルロン酸', category: 'hold', mainEffect: '水分を抱えて肌表面をうるおす', effectCount: 1, concernText: '乾燥・ツヤ', concerns: ['moisture', 'gloss'], note: 'もちもち感の元' },
  { id: 'amino', name: 'アミノ酸', category: 'hold', mainEffect: '角質層の水分保持を補う', effectCount: 1, concernText: '乾燥', concerns: ['moisture'], note: '天然保湿因子（NMF）の主成分' },
  { id: 'pca_na', name: 'PCA-Na', category: 'hold', mainEffect: '水分を保つ', effectCount: 1, concernText: '乾燥', concerns: ['moisture'], note: 'NMFの一つ' },
  { id: 'collagen', name: 'コラーゲン（塗るもの）', category: 'hold', mainEffect: '肌表面をうるおす', effectCount: 1, concernText: '乾燥', concerns: ['moisture'], note: '塗っても、肌のコラーゲンが増えるわけではない' },
  { id: 'ceramide', name: 'セラミド', category: 'seal', mainEffect: 'バリアを補い、水分の蒸発を防ぐ', effectCount: 1, concernText: '乾燥・赤み', concerns: ['moisture', 'redness'], note: '角質層のすき間を埋める' },
  { id: 'squalane', name: 'スクワラン', category: 'seal', mainEffect: '油分の膜でうるおいを逃がさない', effectCount: 1, concernText: '乾燥', concerns: ['moisture'], note: '量が多いとベタつく' },
  { id: 'cica', name: 'CICA（ツボクサエキス）', category: 'calm', mainEffect: '赤みやゆらぎを鎮める', effectCount: 1, concernText: '赤み', concerns: ['redness'], note: 'パックで使用中' },
  { id: 'panthenol', name: 'パンテノール', category: 'calm', mainEffect: '荒れた肌を整える', effectCount: 1, concernText: '赤み・肌荒れ', concerns: ['redness'], note: 'ひげ剃り後用のローションにも入っている例がある' },
  { id: 'allantoin', name: 'アラントイン', category: 'calm', mainEffect: '肌荒れを防ぐ', effectCount: 1, concernText: '肌荒れ', concerns: [], note: '医薬部外品の有効成分としてよく使われる' },
  { id: 'dpg', name: 'グリチルリチン酸ジカリウム', category: 'calm', mainEffect: '炎症を抑える', effectCount: 1, concernText: 'ニキビ・肌荒れ', concerns: ['acne'], note: 'ニキビ用の化粧品によく入る' },
  { id: 'niacinamide', name: 'ナイアシンアミド', category: 'clarity', mainEffect: '皮脂と赤み・色むらを整える', effectCount: 2, concernText: 'テカリ・赤み・毛穴', concerns: ['oil', 'redness', 'pores'], note: '効き方は穏やかで、数週間〜数か月' },
  { id: 'vitc', name: 'ビタミンC誘導体', category: 'clarity', mainEffect: 'くすみと、皮脂のテカりを整える', effectCount: 2, concernText: '透明感・テカリ', concerns: ['clarity', 'oil'], note: 'いまの使用品と重ならないか確認' },
  { id: 'tranexamic', name: 'トラネキサム酸', category: 'clarity', mainEffect: 'シミや色素沈着を防ぐ', effectCount: 1, concernText: 'シミ・跡', concerns: ['clarity'], note: '医薬部外品の美白有効成分としても使われる' },
  { id: 'salicylic', name: 'サリチル酸（BHA）', category: 'exfoliate', mainEffect: '毛穴に詰まった角質と皮脂を溶かす', effectCount: 1, concernText: '毛穴（詰まり）・ニキビ', concerns: ['pores', 'acne'], note: '刺激が強め。レチノールと同じ夜に重ねない', irritation: 'acid' },
  { id: 'aha', name: 'AHA（グリコール酸など）', category: 'exfoliate', mainEffect: '古い角質をやさしく取り除く', effectCount: 1, concernText: 'キメ・くすみ', concerns: ['clarity'], note: '刺激が強め。レチノールと同じ夜に重ねない', irritation: 'acid' },
  { id: 'retinol', name: 'レチノール', category: 'firm', mainEffect: 'ターンオーバーを促し、ハリを支える', effectCount: 1, concernText: 'ハリ・毛穴', concerns: ['firmness', 'pores'], note: '効果が見えるまで約2〜3か月', irritation: 'retinoid' },
  { id: 'peptide', name: 'ペプチド', category: 'firm', mainEffect: 'ハリ感を与える', effectCount: 1, concernText: 'ハリ', concerns: ['firmness'], note: '種類が多く、効果は成分による' },
  { id: 'pdrn', name: 'PDRN', category: 'firm', mainEffect: 'ハリとキメを整えるとされる', effectCount: 1, concernText: 'ハリ・キメ', concerns: ['firmness'], note: '塗った場合の研究は発展途上。魚介類アレルギーは成分表示を確認' },
];

export const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));
export const ingredientName = (id: string) => INGREDIENT_BY_ID.get(id)?.name ?? id;

/** 悩み別: まず覚える主成分 */
export type ConcernGuide = { key: string; label: string; concerns: Concern[]; main: string; support: string[]; supportNote?: string };
export const CONCERN_GUIDES: ConcernGuide[] = [
  { key: 'redness', label: '赤み', concerns: ['redness'], main: 'cica', support: ['niacinamide'] },
  { key: 'pores', label: '毛穴', concerns: ['pores'], main: 'retinol', support: ['niacinamide', 'salicylic'], supportNote: 'サリチル酸は詰まりに' },
  { key: 'firm', label: 'ハリ・ツヤ', concerns: ['firmness', 'gloss'], main: 'retinol', support: ['hyaluronic', 'ceramide'] },
  { key: 'moisture', label: 'うるおい（水分）', concerns: ['moisture'], main: 'hyaluronic', support: ['ceramide'], supportNote: 'セラミドは逃がさない役' },
  { key: 'clarity', label: '透明感・色むら', concerns: ['clarity'], main: 'niacinamide', support: ['vitc'] },
  { key: 'oil', label: 'テカリ・皮脂', concerns: ['oil'], main: 'niacinamide', support: ['vitc'], supportNote: '日中は皮脂崩れ防止パウダー' },
];

/** 判定で使う「その悩みに合う成分」。ニキビは指示書の悩み別表にないため、辞書の「関係する悩み」から決める */
export function matchingIngredients(c: Concern): string[] {
  const g = CONCERN_GUIDES.find((x) => x.concerns.includes(c));
  if (g) return [g.main, ...g.support];
  return INGREDIENTS.filter((i) => i.concerns.includes(c)).map((i) => i.id);
}

export const CAUTIONS = [
  'レチノールと、AHA・サリチル酸は、同じ夜に重ねると刺激が強くなりやすい',
  '皮膚科の処方薬とレチノールは、同じ夜に重ねない。併用してよいかは、医師・薬剤師に確認する',
  '新しい成分は、1つずつ、2〜4週間あけて足す',
  '荒れ、傷、剃った直後の部分には、新しい成分を足さない',
  '朝の美容液は必須ではない。朝は日焼け止めを優先する',
  '処方薬の成分（ニキビ用の塗り薬・軟膏など）は、この辞書に入れない。医師・薬剤師の判断の範囲である',
];
