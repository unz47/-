import { count, min } from "drizzle-orm";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";

import { db } from "@/shared/db/client";
import { expenses, subscriptions } from "@/shared/db/schema";
import {
  getReviewPromptHistory,
  recordReviewPrompt,
} from "@/shared/db/settings";
import { shouldRequestReview } from "@/shared/lib/review-prompt";

// 保存シートが閉じきってから出す（モーダルの重なりを避ける）。
const AFTER_SAVE_MS = 1200;

/**
 * 記録を保存した直後（＝使えている実感がある瞬間）に、条件を満たせば
 * OS 標準のレビュー依頼を出す。表示するかどうかは最終的に iOS が決める。
 * 失敗しても保存フローには影響させない（ベストエフォート）。
 */
export function maybeRequestReviewAfterSave(): void {
  setTimeout(() => {
    run().catch(() => {});
  }, AFTER_SAVE_MS);
}

async function run(): Promise<void> {
  const version = Constants.expoConfig?.version;
  if (!version) return;
  const [[e], [s], history] = await Promise.all([
    db.select({ n: count(), first: min(expenses.createdAt) }).from(expenses),
    db
      .select({ n: count(), first: min(subscriptions.createdAt) })
      .from(subscriptions),
    getReviewPromptHistory(),
  ]);
  const firsts = [e?.first, s?.first].filter((v): v is string => !!v).sort();
  const now = new Date();
  const ok = shouldRequestReview({
    now,
    records: (e?.n ?? 0) + (s?.n ?? 0),
    firstRecordAt: firsts[0] ?? null,
    ...history,
    version,
  });
  // hasAction() はストアへの遷移も含むため使わない。OS のレビューダイアログが出せる時だけ。
  if (!ok || !(await StoreReview.isAvailableAsync())) return;
  await recordReviewPrompt(now, version);
  await StoreReview.requestReview();
}
