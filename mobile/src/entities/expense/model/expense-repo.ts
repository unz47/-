// 支出の永続化（Drizzle）。ドメイン型（null↔undefined）への変換もここで吸収する。
import { desc, eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { expenses } from "@/shared/db/schema";
import type { Expense } from "@/shared/db/types";
import { newId } from "@/shared/lib/id";

type Row = typeof expenses.$inferSelect;

/** Drizzle 行 → ドメイン Expense（null を undefined に正規化）。 */
export function toExpense(r: Row): Expense {
  return {
    id: r.id,
    date: r.date,
    amount: r.amount,
    categoryId: r.categoryId,
    createdAt: r.createdAt,
    memo: r.memo ?? undefined,
    merchant: r.merchant ?? undefined,
    merchantKey: r.merchantKey ?? undefined,
    occurredAt: r.occurredAt ?? undefined,
    address: r.address ?? undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
  };
}

export interface NewExpenseInput {
  date: string; // YYYY-MM-DD
  amount: number; // 円・整数
  categoryId: string;
  memo?: string;
  merchant?: string;
  merchantKey?: string;
  occurredAt?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

/** 日付降順の支出一覧（リアクティブ取得は use-expenses 側）。 */
export const expensesQuery = db
  .select()
  .from(expenses)
  .orderBy(desc(expenses.date), desc(expenses.createdAt));

export async function addExpense(input: NewExpenseInput): Promise<void> {
  await db.insert(expenses).values({
    id: newId(),
    date: input.date,
    amount: Math.round(input.amount),
    categoryId: input.categoryId,
    memo: input.memo ?? null,
    merchant: input.merchant ?? null,
    merchantKey: input.merchantKey ?? null,
    occurredAt: input.occurredAt ?? null,
    address: input.address ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    createdAt: new Date().toISOString(),
  });
}

export interface ExpenseLocation {
  lat: number;
  lng: number;
  address?: string;
}

/** 単一支出に店の位置を設定（§11.5 C）。 */
export async function setExpenseLocation(
  id: string,
  loc: ExpenseLocation,
): Promise<void> {
  await db
    .update(expenses)
    .set({ lat: loc.lat, lng: loc.lng, address: loc.address ?? null })
    .where(eq(expenses.id, id));
}

/**
 * 同じ merchantKey の支出すべてに位置を反映（「一度登録すれば次回から」）。
 * 店ごとに一度ピンを置けば、その店の過去・未来の記録に座標が行き渡る。
 */
export async function setMerchantLocation(
  merchantKey: string,
  loc: ExpenseLocation,
): Promise<void> {
  await db
    .update(expenses)
    .set({ lat: loc.lat, lng: loc.lng, address: loc.address ?? null })
    .where(eq(expenses.merchantKey, merchantKey));
}

export interface UpdateExpenseInput {
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  memo?: string;
  address?: string;
}

export async function updateExpense(input: UpdateExpenseInput): Promise<void> {
  await db
    .update(expenses)
    .set({
      date: input.date,
      amount: Math.round(input.amount),
      categoryId: input.categoryId,
      memo: input.memo ?? null,
      address: input.address ?? null,
    })
    .where(eq(expenses.id, input.id));
}

export async function deleteExpense(id: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
}
