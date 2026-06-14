"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type Subscription,
  type SubscriptionChangeLog,
} from "@/lib/db";
import { uid } from "@/lib/utils";
import { isRecentRaise } from "@/lib/changelog";

/** サブスク登録フォームの入力値（id・createdAt はストア側で付与）。 */
export type SubscriptionDraft = Omit<Subscription, "id" | "createdAt">;

/** changelog を残す対象フィールド（PROJECT_PLAN §4 / 設計判断 5）。 */
const TRACKED_FIELDS = ["amount", "planName"] as const;

interface SubscriptionState {
  addSubscription: (draft: SubscriptionDraft) => Promise<void>;
  /**
   * サブスクを更新する。amount / planName に変更があれば
   * subChangeLogs に diff を 1 件ずつ記録する（変更なしなら記録しない）。
   */
  updateSubscription: (
    id: string,
    patch: Partial<SubscriptionDraft>,
  ) => Promise<void>;
  /** 解約は論理削除（canceledAt をセット）。レコードは消さない。 */
  cancelSubscription: (id: string, canceledAt: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>(() => ({
  addSubscription: async (draft) => {
    await db.subscriptions.add({
      ...draft,
      id: uid(),
      createdAt: new Date().toISOString(),
    });
  },

  updateSubscription: async (id, patch) => {
    await db.transaction(
      "rw",
      db.subscriptions,
      db.subChangeLogs,
      async () => {
        const current = await db.subscriptions.get(id);
        if (!current) return;

        const changedAt = new Date().toISOString();
        const logs: SubscriptionChangeLog[] = [];
        for (const field of TRACKED_FIELDS) {
          const next = patch[field];
          if (next === undefined) continue;
          const prev = current[field];
          if (next === prev) continue;
          logs.push({
            id: uid(),
            subscriptionId: id,
            field,
            oldValue: prev,
            newValue: next,
            changedAt,
          });
        }

        await db.subscriptions.update(id, patch);
        if (logs.length > 0) await db.subChangeLogs.bulkAdd(logs);
      },
    );
  },

  cancelSubscription: async (id, canceledAt) => {
    await db.subscriptions.update(id, { canceledAt });
  },
}));

// --- Dexie ライブクエリ読み取りフック ---

/** 全サブスクを返す（解約済みも含む。フィルタは呼び出し側で）。 */
export function useSubscriptions(): Subscription[] | undefined {
  return useLiveQuery(() =>
    db.subscriptions.orderBy("serviceName").toArray(),
  );
}

/** 指定サブスクの改定ログを新しい順で返す。 */
export function useSubscriptionLogs(
  subscriptionId: string,
): SubscriptionChangeLog[] | undefined {
  return useLiveQuery(
    () =>
      db.subChangeLogs
        .where("subscriptionId")
        .equals(subscriptionId)
        .reverse()
        .sortBy("changedAt"),
    [subscriptionId],
  );
}

/** 直近30日に増額があったサブスクの id 集合（一覧の「改定あり」バッジ用）。 */
export function useRecentlyRaisedSubIds(): Set<string> {
  const logs = useLiveQuery(() => db.subChangeLogs.toArray());
  return useMemo(() => {
    const now = new Date();
    const ids = new Set<string>();
    for (const l of logs ?? []) {
      if (isRecentRaise(l, now)) ids.add(l.subscriptionId);
    }
    return ids;
  }, [logs]);
}
