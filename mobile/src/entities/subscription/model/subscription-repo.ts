// サブスクの永続化（Drizzle）。読み取り中心（追加/解約は features 側で順次）。
import { db } from "@/shared/db/client";
import { subscriptions } from "@/shared/db/schema";
import type { Subscription } from "@/shared/db/types";

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
