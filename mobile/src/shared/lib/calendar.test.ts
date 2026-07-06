import { describe, expect, it } from "vitest";

import type { Expense, Subscription } from "@/shared/db/types";
import { monthSummary } from "./aggregate";
import { buildCalendarMonth, subscriptionChargeDay } from "./calendar";

const sub: Subscription = {
  id: "s1",
  serviceName: "Netflix",
  planName: "スタンダード",
  amount: 1590,
  billingCycle: "monthly",
  categoryId: "cat-subscription",
  billingDay: 31,
  startedAt: "2026-01-01",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const expense: Expense = {
  id: "e1",
  date: "2026-02-10",
  amount: 500,
  categoryId: "cat-food",
  createdAt: "2026-02-10T00:00:00.000Z",
};

describe("subscriptionChargeDay", () => {
  it("billingDay を月日数でクランプ（2月の31日→28日）", () => {
    expect(subscriptionChargeDay(sub, "2026-02")).toBe(28);
    expect(subscriptionChargeDay(sub, "2026-03")).toBe(31);
  });
  it("実請求のない月（年額の非請求月）は null", () => {
    const yearly: Subscription = {
      ...sub,
      billingCycle: "yearly",
      billingMonth: 7,
    };
    expect(subscriptionChargeDay(yearly, "2026-02")).toBeNull();
  });
});

describe("buildCalendarMonth", () => {
  it("月合計は monthSummary.total と一致（§6 受け入れ条件）", () => {
    const m = buildCalendarMonth([expense], [sub], "2026-02", new Date());
    expect(m.total).toBe(monthSummary([expense], [sub], "2026-02").total);
  });

  it("支出は date の日、サブスクはクランプ後の課金日に置かれる", () => {
    const m = buildCalendarMonth([expense], [sub], "2026-02", new Date());
    const day10 = m.days.find((d) => d.day === 10)!;
    const day28 = m.days.find((d) => d.day === 28)!;
    expect(day10.expenses).toHaveLength(1);
    expect(day28.subCharges).toHaveLength(1);
    expect(day28.subCharges[0].amount).toBe(1590);
  });

  it("週は常に 7 マス（前後を null 詰め）", () => {
    const m = buildCalendarMonth([], [], "2026-07", new Date());
    for (const week of m.weeks) expect(week).toHaveLength(7);
  });
});
