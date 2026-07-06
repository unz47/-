import { describe, expect, it } from "vitest";

import type { Expense, Subscription } from "@/shared/db/types";
import {
  actualChargeInMonth,
  activeSubsInMonth,
  categoryBreakdown,
  monthSummary,
  monthlyEquivalent,
  recentMonthTotals,
  toMonthKey,
} from "./aggregate";

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: "s1",
    serviceName: "Netflix",
    planName: "スタンダード",
    amount: 1590,
    billingCycle: "monthly",
    categoryId: "cat-subscription",
    billingDay: 1,
    startedAt: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function exp(over: Partial<Expense> = {}): Expense {
  return {
    id: "e1",
    date: "2026-07-01",
    amount: 1000,
    categoryId: "cat-food",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

describe("monthlyEquivalent", () => {
  it("monthly はそのまま", () => {
    expect(monthlyEquivalent(sub({ amount: 1590 }))).toBe(1590);
  });
  it("yearly は 12 で割って整数に丸める", () => {
    expect(
      monthlyEquivalent(sub({ billingCycle: "yearly", amount: 5900 })),
    ).toBe(492);
  });
});

describe("actualChargeInMonth", () => {
  it("yearly は請求月だけ満額、他月は 0", () => {
    const y = sub({ billingCycle: "yearly", amount: 12000, billingMonth: 7 });
    expect(actualChargeInMonth(y, "2026-07")).toBe(12000);
    expect(actualChargeInMonth(y, "2026-08")).toBe(0);
  });
  it("billingMonth 未設定の yearly は startedAt の月にフォールバック", () => {
    const y = sub({
      billingCycle: "yearly",
      amount: 12000,
      startedAt: "2026-03-15",
    });
    expect(actualChargeInMonth(y, "2026-03")).toBe(12000);
    expect(actualChargeInMonth(y, "2026-04")).toBe(0);
  });
});

describe("activeSubsInMonth", () => {
  it("開始前・解約後は除外、月内解約は含む（§4 の境界）", () => {
    const s = sub({ startedAt: "2026-07-10", canceledAt: "2026-08-15" });
    expect(activeSubsInMonth([s], "2026-06")).toHaveLength(0); // 開始前
    expect(activeSubsInMonth([s], "2026-07")).toHaveLength(1); // 月中開始
    expect(activeSubsInMonth([s], "2026-08")).toHaveLength(1); // 月中解約（月初以降）
    expect(activeSubsInMonth([s], "2026-09")).toHaveLength(0); // 解約後
  });
});

describe("monthSummary", () => {
  it("当月総支出 = 都度 + サブスク実請求（動的合算・実体を作らない）", () => {
    const expenses = [exp({ amount: 800 }), exp({ id: "e2", amount: 200 })];
    const subs = [
      sub({ amount: 1000 }),
      sub({
        id: "s2",
        billingCycle: "yearly",
        amount: 12000,
        billingMonth: 7,
      }),
    ];
    const s = monthSummary(expenses, subs, "2026-07");
    expect(s.expenseTotal).toBe(1000);
    expect(s.subscriptionActual).toBe(13000); // 1000 + 年額スパイク 12000
    expect(s.subscriptionMonthly).toBe(2000); // 1000 + 12000/12
    expect(s.total).toBe(14000);
  });
});

describe("categoryBreakdown", () => {
  it("カテゴリごとに合算し金額降順", () => {
    const expenses = [
      exp({ amount: 300, categoryId: "cat-food" }),
      exp({ id: "e2", amount: 900, categoryId: "cat-fun" }),
    ];
    const subs = [sub({ amount: 500 })];
    const b = categoryBreakdown(expenses, subs, "2026-07");
    expect(b.map((x) => x.categoryId)).toEqual([
      "cat-fun",
      "cat-subscription",
      "cat-food",
    ]);
  });
});

describe("recentMonthTotals", () => {
  it("古い月→新しい月の順で count ヶ月返す", () => {
    const totals = recentMonthTotals([], [], new Date(2026, 6, 15), 3);
    expect(totals.map((t) => t.ym)).toEqual(["2026-05", "2026-06", "2026-07"]);
  });
});

describe("toMonthKey", () => {
  it("Date と YYYY-MM-DD の両方を受ける", () => {
    expect(toMonthKey(new Date(2026, 0, 31))).toBe("2026-01");
    expect(toMonthKey("2026-12-01")).toBe("2026-12");
  });
});
