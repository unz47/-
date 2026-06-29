import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import type { Subscription } from "@/shared/db/types";
import { subscriptionsQuery, toSubscription } from "./subscription-repo";

/** サブスク一覧（解約済み含む全件）。DB 変更で自動再描画。 */
export function useSubscriptions(): Subscription[] {
  const { data } = useLiveQuery(subscriptionsQuery);
  return (data ?? []).map(toSubscription);
}
