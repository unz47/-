import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import { db } from "@/shared/db/client";
import { categories } from "@/shared/db/schema";
import type { Category } from "@/shared/db/types";

/** カテゴリ一覧（表示順）。DB 変更で自動再描画。 */
export function useCategories(): Category[] {
  const { data } = useLiveQuery(
    db.select().from(categories).orderBy(categories.order),
  );
  return data ?? [];
}

/** id→Category の早見表。 */
export function useCategoryMap(): Map<string, Category> {
  const list = useCategories();
  return new Map(list.map((c) => [c.id, c]));
}
