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
