import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { desc, eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { subChangeLogs } from "@/shared/db/schema";
import type { SubscriptionChangeLog } from "@/shared/db/types";
import { toChangeLog } from "./change-log-repo";

/** あるサブスクの改定ログ（新しい順）。DB 変更で自動再描画。 */
export function useChangeLogs(subscriptionId: string): SubscriptionChangeLog[] {
  const { data } = useLiveQuery(
    db
      .select()
      .from(subChangeLogs)
      .where(eq(subChangeLogs.subscriptionId, subscriptionId))
      .orderBy(desc(subChangeLogs.changedAt)),
  );
  return (data ?? []).map(toChangeLog);
}

/** 全サブスクの改定ログ（新しい順）。値上げバッジ・値上げ影響の集計に使う。 */
export function useAllChangeLogs(): SubscriptionChangeLog[] {
  const { data } = useLiveQuery(
    db.select().from(subChangeLogs).orderBy(desc(subChangeLogs.changedAt)),
  );
  return (data ?? []).map(toChangeLog);
}

/**
 * 直近 days 日（既定 30）に増額があったサブスク id の集合（「改定あり」バッジ用）。
 * Web版 useRecentlyRaisedSubIds の移植。増額のみ＝バッジは danger（赤=値上げ専用）。
 */
export function useRecentlyRaisedSubIds(days = 30): Set<string> {
  const logs = useAllChangeLogs();
  const cutoff = new Date(
    new Date().getTime() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const ids = new Set<string>();
  for (const log of logs) {
    if (log.field !== "amount" || log.changedAt < cutoff) continue;
    if (Number(log.newValue) > Number(log.oldValue)) ids.add(log.subscriptionId);
  }
  return ids;
}
