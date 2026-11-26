// サブスク見直し判定の永続化（Drizzle）。追記のみ＝履歴が残り、各サブスクの最新行が現在の判定。
import { desc, eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { subReviews } from "@/shared/db/schema";
import type {
  ReviewVerdict,
  SubscriptionReview,
  UsageFrequency,
} from "@/shared/db/types";
import { newId } from "@/shared/lib/id";

type Row = typeof subReviews.$inferSelect;

export function toSubscriptionReview(r: Row): SubscriptionReview {
  return {
    id: r.id,
    subscriptionId: r.subscriptionId,
    verdict: r.verdict,
    usage: r.usage ?? undefined,
    reviewedAt: r.reviewedAt,
  };
}

/** 全判定（新しい順）。 */
export const subReviewsQuery = db
  .select()
  .from(subReviews)
  .orderBy(desc(subReviews.reviewedAt));

export interface NewReviewInput {
  subscriptionId: string;
  verdict: ReviewVerdict;
  usage?: UsageFrequency;
}

/** 判定を1件記録し、その id を返す（見直しモードの「1つ戻る」で取り消すため）。 */
export async function addSubscriptionReview(
  input: NewReviewInput,
): Promise<string> {
  const id = newId();
  await db.insert(subReviews).values({
    id,
    subscriptionId: input.subscriptionId,
    verdict: input.verdict,
    usage: input.usage ?? null,
    reviewedAt: new Date().toISOString(),
  });
  return id;
}

/** 直前の判定の取り消し（見直しモードの「1つ戻る」専用）。 */
export async function deleteSubscriptionReview(id: string): Promise<void> {
  await db.delete(subReviews).where(eq(subReviews.id, id));
}
