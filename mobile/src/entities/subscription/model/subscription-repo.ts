// サブスクの永続化（Drizzle）。
import { eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { subscriptions } from "@/shared/db/schema";
import type { BillingCycle, Subscription } from "@/shared/db/types";
import { newId } from "@/shared/lib/id";

type Row = typeof subscriptions.$inferSelect;

/** Drizzle 行 → ドメイン Subscription（null を undefined に正規化）。 */
export function toSubscription(r: Row): Subscription {
  return {
    id: r.id,
    serviceName: r.serviceName,
    planName: r.planName,
    amount: r.amount,
    billingCycle: r.billingCycle,
    categoryId: r.categoryId,
    billingDay: r.billingDay,
    billingMonth: r.billingMonth ?? undefined,
    startedAt: r.startedAt,
    canceledAt: r.canceledAt ?? undefined,
    presetId: r.presetId ?? undefined,
    createdAt: r.createdAt,
  };
}

export const subscriptionsQuery = db.select().from(subscriptions);

export interface NewSubscriptionInput {
  serviceName: string;
  planName: string;
  amount: number;
  billingCycle: BillingCycle;
  categoryId: string;
  billingDay: number;
  billingMonth?: number;
  startedAt: string; // YYYY-MM-DD
  presetId?: string;
}

export async function addSubscription(
  input: NewSubscriptionInput,
): Promise<void> {
  await db.insert(subscriptions).values({
    id: newId(),
    serviceName: input.serviceName,
    planName: input.planName,
    amount: Math.round(input.amount),
    billingCycle: input.billingCycle,
    categoryId: input.categoryId,
    billingDay: input.billingDay,
    billingMonth: input.billingMonth ?? null,
    startedAt: input.startedAt,
    canceledAt: null,
    presetId: input.presetId ?? null,
    createdAt: new Date().toISOString(),
  });
}

export interface UpdateSubscriptionInput {
  id: string;
  planName: string;
  amount: number;
  billingDay: number;
}

/**
 * 契約内容の更新（行のみ）。改定ログの記録は features/edit-subscription が合成する
 * （エンティティ間 import を避ける Bulletproof 規約）。
 */
export async function updateSubscription(
  input: UpdateSubscriptionInput,
): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      planName: input.planName,
      amount: Math.round(input.amount),
      billingDay: input.billingDay,
    })
    .where(eq(subscriptions.id, input.id));
}

/** 解約＝論理削除（canceledAt をセット。レコードは消さない）。§10 */
export async function cancelSubscription(
  id: string,
  canceledAt: string,
): Promise<void> {
  await db
    .update(subscriptions)
    .set({ canceledAt })
    .where(eq(subscriptions.id, id));
}

/**
 * 再契約＝新しい契約レコードを作る（§10）。canceledAt クリアや startedAt 変更は
 * 履歴破壊になるため、再契約日を startedAt とする別レコードにする。金額等は引き継ぐ。
 */
export async function reactivateSubscription(s: Subscription): Promise<void> {
  await addSubscription({
    serviceName: s.serviceName,
    planName: s.planName,
    amount: s.amount,
    billingCycle: s.billingCycle,
    categoryId: s.categoryId,
    billingDay: s.billingDay,
    billingMonth: s.billingMonth,
    startedAt: new Date().toISOString().slice(0, 10),
    presetId: s.presetId,
  });
}
