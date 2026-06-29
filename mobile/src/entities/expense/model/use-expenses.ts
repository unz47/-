import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import type { Expense } from "@/shared/db/types";
import { expensesQuery, toExpense } from "./expense-repo";

/** 支出一覧（日付降順）。DB 変更で自動再描画。 */
export function useExpenses(): Expense[] {
  const { data } = useLiveQuery(expensesQuery);
  return (data ?? []).map(toExpense);
}
