import type { Subscription, SubscriptionChangeLog } from "@/shared/db/types";

/**
 * サブスク値上げ影響（今年）。amount の改定ログを月額換算の差分に直して合算する。
 * 増額=danger / 減額=success のシグナル色（§3）に対応する正負つきで返す。
 * 実体を持たない派生データ（ログから毎回再計算・端末内完結）。
 */

export interface RaiseImpact {
  /** 今年の改定による月額換算の純増減（円・整数。正=値上げ、負=値下げ）。 */
  monthlyDelta: number;
  /** 増額があった契約数。 */
  raisedCount: number;
  /** 減額があった契約数。 */
  loweredCount: number;
}

export function raiseImpact(
  logs: SubscriptionChangeLog[],
  subs: Subscription[],
  year: number,
): RaiseImpact {
  const cycleOf = new Map(subs.map((s) => [s.id, s.billingCycle]));
  const prefix = `${year}-`;

  // 契約ごとに今年の純増減（周期 1 回あたりの実額）を集める
  const deltaBySub = new Map<string, number>();
  for (const log of logs) {
    if (log.field !== "amount" || !log.changedAt.startsWith(prefix)) continue;
    const diff = Number(log.newValue) - Number(log.oldValue);
    deltaBySub.set(
      log.subscriptionId,
      (deltaBySub.get(log.subscriptionId) ?? 0) + diff,
    );
  }

  let monthlyDelta = 0;
  let raisedCount = 0;
  let loweredCount = 0;
  for (const [subId, delta] of deltaBySub) {
    if (delta === 0) continue;
    // 月額換算: yearly は 12 で割って丸める（円・整数の不変条件）
    const monthly =
      cycleOf.get(subId) === "yearly" ? Math.round(delta / 12) : delta;
    monthlyDelta += monthly;
    if (delta > 0) raisedCount += 1;
    else loweredCount += 1;
  }

  return { monthlyDelta, raisedCount, loweredCount };
}
