import { desc } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { categories } from "@/shared/db/schema";
import { newId } from "@/shared/lib/id";

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
