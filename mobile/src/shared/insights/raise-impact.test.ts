import { describe, expect, it } from "vitest";

import type { Subscription, SubscriptionChangeLog } from "@/shared/db/types";
import { raiseImpact } from "./raise-impact";

function sub(id: string, cycle: "monthly" | "yearly"): Subscription {
  return {
    id,
    serviceName: id,
    planName: "標準",
    amount: 1000,
    billingCycle: cycle,
    categoryId: "cat-subscription",
    billingDay: 1,
    startedAt: "2025-01-01",
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

function log(
  subscriptionId: string,
  oldValue: number,
  newValue: number,
  changedAt: string,
): SubscriptionChangeLog {
  return {
    id: Math.random().toString(36).slice(2),
    subscriptionId,
    field: "amount",
    oldValue,
    newValue,
    changedAt,
  };
}

describe("raiseImpact", () => {
  const subs = [sub("m1", "monthly"), sub("y1", "yearly"), sub("m2", "monthly")];

  it("月額換算の純増減を返す（yearly は 12 で割って丸める）", () => {
    const impact = raiseImpact(
      [
        log("m1", 1000, 1300, "2026-02-01T00:00:00.000Z"), // +300/月
        log("y1", 12000, 13200, "2026-03-01T00:00:00.000Z"), // +1200/年 = +100/月
        log("m2", 500, 400, "2026-04-01T00:00:00.000Z"), // -100/月
      ],
      subs,
      2026,
    );
    expect(impact.monthlyDelta).toBe(300);
    expect(impact.raisedCount).toBe(2);
    expect(impact.loweredCount).toBe(1);
  });

  it("対象年以外のログ・planName ログは無視する", () => {
    const impact = raiseImpact(
      [
        log("m1", 1000, 2000, "2025-12-31T00:00:00.000Z"),
        {
          id: "p1",
          subscriptionId: "m1",
          field: "planName",
          oldValue: "A",
          newValue: "B",
          changedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      subs,
      2026,
    );
    expect(impact.monthlyDelta).toBe(0);
    expect(impact.raisedCount).toBe(0);
  });

  it("同一契約の複数改定は純増減に合算する", () => {
    const impact = raiseImpact(
      [
        log("m1", 1000, 1500, "2026-01-01T00:00:00.000Z"),
        log("m1", 1500, 1200, "2026-06-01T00:00:00.000Z"),
      ],
      subs,
      2026,
    );
    expect(impact.monthlyDelta).toBe(200);
    expect(impact.raisedCount).toBe(1); // 純増なので値上げ 1 件
  });
});
