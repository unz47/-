"use client";

import { create } from "zustand";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Category, type Expense } from "@/lib/db";
import { toMonthKey, type MonthKey } from "@/lib/aggregate";
import { uid } from "@/lib/utils";

/** 支出追加/編集フォームの入力値（id・createdAt はストア側で付与）。 */
export type ExpenseDraft = Omit<Expense, "id" | "createdAt">;

interface ExpenseState {
  /** 一覧・ダッシュボードで参照中の月。 */
  currentMonth: MonthKey;
  setCurrentMonth: (ym: MonthKey) => void;

  addExpense: (draft: ExpenseDraft) => Promise<void>;
  updateExpense: (id: string, patch: Partial<ExpenseDraft>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // カテゴリ管理（設定画面）
  addCategory: (name: string, color: string) => Promise<void>;
  updateCategoryColor: (id: string, color: string) => Promise<void>;
  /** 既定カテゴリ(isDefault)は削除しない。 */
  deleteCategory: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  currentMonth: toMonthKey(new Date()),
  setCurrentMonth: (ym) => set({ currentMonth: ym }),

  addExpense: async (draft) => {
    await db.expenses.add({
      ...draft,
      id: uid(),
      createdAt: new Date().toISOString(),
    });
  },

  updateExpense: async (id, patch) => {
    await db.expenses.update(id, patch);
  },

  deleteExpense: async (id) => {
    await db.expenses.delete(id);
  },

  addCategory: async (name, color) => {
    const maxOrder = await db.categories
      .orderBy("id")
      .toArray()
      .then((cats) => cats.reduce((m, c) => Math.max(m, c.order), -1));
    await db.categories.add({
      id: uid(),
      name: name.trim(),
      color,
      isDefault: false,
      order: maxOrder + 1,
    });
  },

  updateCategoryColor: async (id, color) => {
    await db.categories.update(id, { color });
  },

  deleteCategory: async (id) => {
    const cat = await db.categories.get(id);
    if (!cat || cat.isDefault) return;
    await db.categories.delete(id);
  },
}));

// --- Dexie ライブクエリ読み取りフック（手動リフェッチを増やさない） ---

/** 全支出を日付の新しい順で返す（undefined = 初回ロード中）。 */
export function useExpenses(): Expense[] | undefined {
  return useLiveQuery(() => db.expenses.orderBy("date").reverse().toArray());
}

/** 全カテゴリを order 昇順で返す（選択肢・凡例・グラフで順序を共有）。 */
export function useCategories(): Category[] | undefined {
  return useLiveQuery(async () => {
    const cats = await db.categories.toArray();
    return cats.sort((a, b) => a.order - b.order);
  });
}

/** id → Category の Map を返す（表示時の名前・色引き用）。 */
export function useCategoryMap(): Map<string, Category> {
  const categories = useCategories();
  return new Map((categories ?? []).map((c) => [c.id, c]));
}
