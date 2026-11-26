import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import type { SubscriptionReview } from "@/shared/db/types";
import { latestReviews } from "@/shared/lib/sub-review";
import { subReviewsQuery, toSubscriptionReview } from "./sub-review-repo";

/** 全判定（新しい順）。DB 変更で自動再描画。 */
export function useSubscriptionReviews(): SubscriptionReview[] {
  const { data } = useLiveQuery(subReviewsQuery);
  return (data ?? []).map(toSubscriptionReview);
}

/** サブスク id → 最新の判定。 */
export function useLatestReviews(): Map<string, SubscriptionReview> {
  return latestReviews(useSubscriptionReviews());
}
