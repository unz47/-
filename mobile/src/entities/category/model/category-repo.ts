import { desc, eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { categories, expenses, subscriptions } from "@/shared/db/schema";
import { newId } from "@/shared/lib/id";

/** 削除時の付け替え先（既定カテゴリ「その他」。isDefault は削除不可）。 */
export const FALLBACK_CATEGORY_ID = "cat-other";

/** カテゴリを追加（ユーザー定義。isDefault=false、表示順は末尾）。 */
export async function addCategory(input: {
  name: string;
  color: string;
}): Promise<void> {
  const last = await db
    .select({ order: categories.order })
    .from(categories)
    .orderBy(desc(categories.order))
    .limit(1);
  await db.insert(categories).values({
    id: newId(),
    name: input.name,
    color: input.color,
    isDefault: false,
    order: (last[0]?.order ?? 0) + 1,
  });
}

/** カテゴリの名前・色を更新（ユーザー定義カテゴリのみ想定）。 */
export async function updateCategory(
  id: string,
  input: { name: string; color: string },
): Promise<void> {
  await db
    .update(categories)
    .set({ name: input.name, color: input.color })
    .where(eq(categories.id, id));
}

/**
 * カテゴリを削除（ユーザー定義のみ想定）。参照している支出・サブスクは
 * 「その他」へ付け替えてから消す＝レコードを孤児にしない。
 */
export async function deleteCategory(id: string): Promise<void> {
  await db
    .update(expenses)
    .set({ categoryId: FALLBACK_CATEGORY_ID })
    .where(eq(expenses.categoryId, id));
  await db
    .update(subscriptions)
    .set({ categoryId: FALLBACK_CATEGORY_ID })
    .where(eq(subscriptions.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}
