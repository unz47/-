// データ全削除（初期化）。永続化は端末内のみ。
import { db } from "./client";
import { categories, expenses, subChangeLogs, subscriptions } from "./schema";
import { seedDefaultCategories } from "./seed";

/** すべての支出・サブスク・ログ・カテゴリを削除し、既定カテゴリを再投入する。 */
export async function clearAllData(): Promise<void> {
  await db.delete(expenses);
  await db.delete(subChangeLogs);
  await db.delete(subscriptions);
  await db.delete(categories);
  await seedDefaultCategories();
}
