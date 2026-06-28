// 初回起動時の既定カテゴリ投入（PROJECT_PLAN §7）。Web版 seed.ts の移行。
import { CATEGORY_PALETTE } from "@/shared/config/colors";
import { db } from "./client";
import { categories } from "./schema";

/** サブスクの既定カテゴリ id（Subscription.categoryId の既定値に使う）。 */
export const SUBSCRIPTION_CATEGORY_ID = "cat-subscription";

/** 初期カテゴリ。id は固定し、色・表示順はパレット順で割り当てる。isDefault は削除不可想定。 */
export const DEFAULT_CATEGORIES = [
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

/** 既定カテゴリを投入（冪等: 既に1件でもあれば何もしない）。 */
export async function seedDefaultCategories(): Promise<void> {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) return;
  await db.insert(categories).values(DEFAULT_CATEGORIES);
}
