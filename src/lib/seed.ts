import { db, type Category } from "./db";
import { CATEGORY_PALETTE } from "./colors";

/** サブスクの既定カテゴリ id（Subscription.categoryId の既定値に使う）。 */
export const SUBSCRIPTION_CATEGORY_ID = "cat-subscription";

/**
 * 初期カテゴリ（PROJECT_PLAN §7）。id は固定し、色・表示順はパレット順で割り当てる。
 * isDefault のカテゴリは設定画面でも削除不可にする想定。
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-food", name: "食費" },
  { id: "cat-daily", name: "日用品" },
  { id: "cat-transport", name: "交通" },
  { id: "cat-fun", name: "娯楽" },
  { id: SUBSCRIPTION_CATEGORY_ID, name: "サブスク" },
  { id: "cat-other", name: "その他" },
].map((c, i) => ({
  ...c,
  color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  isDefault: true,
  order: i,
}));

/**
 * 初回起動時に既定カテゴリを投入する。
 * 既に投入済み（categories が空でない）なら何もしない（冪等）。
 */
export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count();
  if (count > 0) return;
  await db.categories.bulkAdd(DEFAULT_CATEGORIES);
}
