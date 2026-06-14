/**
 * カテゴリ別グラフ用パレット（PROJECT_PLAN §3）。
 * 円グラフ・凡例・カテゴリ色の初期値にこの順で割り当て、グラフ間で同じ順序を共有する。
 * 赤・緑・黄のシグナル色は混ぜない。
 */
export const CATEGORY_PALETTE = [
  "#2DD4BF",
  "#818CF8",
  "#F472B6",
  "#FBBF24",
  "#34D399",
  "#22D3EE",
] as const;

/** index 番目のカテゴリ色を返す（パレットを循環）。 */
export function categoryColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}
