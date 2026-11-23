import { describe, expect, it } from "vitest";

import type { Subscription } from "@/shared/db/types";
import { planRenewalReminders } from "./renewal-plan";

const NOW = new Date(2026, 10, 22, 12, 0); // 2026-11-22 12:00

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: "s1",
    serviceName: "Netflix",
    planName: "スタンダード",
    amount: 1590,
    billingCycle: "monthly",
    categoryId: "cat-sub",
    billingDay: 5,
    startedAt: "2026-01-10",
    createdAt: "2026-01-10T00:00:00.000Z",
    ...over,
  };
}

describe("planRenewalReminders", () => {
  it("年額は請求日の N 日前 9 時に通知する", () => {
    const s = sub({ billingCycle: "yearly", billingMonth: 12, amount: 5900 });
    const plan = planRenewalReminders([s], NOW, {
      daysBefore: 3,
      scope: "yearlyAndTrial",
    });
    expect(plan[0].key).toBe("renewal-s1-2026-12-05");
    expect(plan[0].fireAt).toEqual(new Date(2026, 11, 2, 9, 0));
    expect(plan[0].body).toBe(
      "Netflix（年額） の更新日は3日後（12/5）です。",
    );
  });

  it("本文に金額を載せない", () => {
    const plan = planRenewalReminders([sub()], NOW, {
      daysBefore: 1,
      scope: "all",
    });
    expect(plan.length).toBe(12);
    for (const p of plan) {
      expect(p.body).not.toMatch(/¥|1,?590/);
    }
    expect(plan[0].body).toContain("明日");
  });

  it("yearlyAndTrial では月額の通常更新を通知しない", () => {
    const plan = planRenewalReminders([sub()], NOW, {
      daysBefore: 3,
      scope: "yearlyAndTrial",
    });
    expect(plan).toEqual([]);
  });

  it("無料体験の終了は月額でも通知する", () => {
    const s = sub({
      startedAt: "2026-12-10",
      trialEndsAt: "2026-12-10",
      billingDay: 10,
    });
    const plan = planRenewalReminders([s], NOW, {
      daysBefore: 3,
      scope: "yearlyAndTrial",
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].title).toBe("無料体験がまもなく終了します");
    expect(plan[0].fireAt).toEqual(new Date(2026, 11, 7, 9, 0));
  });

  it("通知時刻が過ぎた請求と解約済みは除く", () => {
    const soon = sub({ id: "soon", billingDay: 23 }); // 3日前=11/20 は過去
    const canceled = sub({ id: "x", canceledAt: "2026-11-01" });
    const plan = planRenewalReminders([soon, canceled], NOW, {
      daysBefore: 3,
      scope: "all",
    });
    expect(plan[0].key).toBe("renewal-soon-2026-12-23");
    expect(plan.every((p) => !p.key.startsWith("renewal-x-"))).toBe(true);
  });

  it("上限件数で打ち切り、近い順に並ぶ", () => {
    const subs = Array.from({ length: 10 }, (_, i) =>
      sub({ id: `s${i}`, billingDay: i + 1 }),
    );
    const plan = planRenewalReminders(subs, NOW, {
      daysBefore: 1,
      scope: "all",
      limit: 20,
    });
    expect(plan).toHaveLength(20);
    const times = plan.map((p) => p.fireAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
