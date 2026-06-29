// サブスク改定ログ（価格改定検知 / §1）。
import { db } from "@/shared/db/client";
import { subChangeLogs } from "@/shared/db/schema";
import type { SubscriptionChangeLog } from "@/shared/db/types";
import { newId } from "@/shared/lib/id";

type Row = typeof subChangeLogs.$inferSelect;

/** Drizzle 行 → ドメイン。amount フィールドは数値に戻す。 */
export function toChangeLog(r: Row): SubscriptionChangeLog {
  const cast = (v: string) => (r.field === "amount" ? Number(v) : v);
  return {
    id: r.id,
    subscriptionId: r.subscriptionId,
    field: r.field,
    oldValue: cast(r.oldValue),
    newValue: cast(r.newValue),
    changedAt: r.changedAt,
  };
}

export interface NewChangeLogInput {
  subscriptionId: string;
  field: "amount" | "planName";
  oldValue: string | number;
  newValue: string | number;
}

export async function addChangeLog(entry: NewChangeLogInput): Promise<void> {
  await db.insert(subChangeLogs).values({
    id: newId(),
    subscriptionId: entry.subscriptionId,
    field: entry.field,
    oldValue: String(entry.oldValue),
    newValue: String(entry.newValue),
    changedAt: new Date().toISOString(),
  });
}
