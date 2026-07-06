import { describe, expect, it } from "vitest";

import type { Expense } from "@/shared/db/types";
import { binOfHour, buildTimeOfDayInsight } from "./time-of-day";

function exp(over: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    date: "2026-07-02",
    amount: 1000,
    categoryId: "cat-food",
    createdAt: "2026-07-02T00:00:00.000Z",
    ...over,
  };
}

const NOW = new Date(2026, 6, 3); // 2026-07-03

describe("binOfHour", () => {
  it("境界どおりに振り分ける", () => {
    expect(binOfHour(5)).toBe("earlyMorning");
    expect(binOfHour(8)).toBe("earlyMorning");
    expect(binOfHour(9)).toBe("midday");
    expect(binOfHour(13)).toBe("midday");
    expect(binOfHour(14)).toBe("afternoon");
    expect(binOfHour(17)).toBe("afternoon");
    expect(binOfHour(18)).toBe("evening");
    expect(binOfHour(21)).toBe("evening");
    expect(binOfHour(22)).toBe("lateNight");
    expect(binOfHour(0)).toBe("lateNight");
    expect(binOfHour(4)).toBe("lateNight");
  });
});

describe("buildTimeOfDayInsight", () => {
  it("時刻つきはビンへ、日付のみの occurredAt は時刻不明に数える（深夜誤集計の回避）", () => {
    const insight = buildTimeOfDayInsight(
      [
        exp({ occurredAt: "2026-07-02T23:30:00", amount: 2000 }),
        exp({ occurredAt: "2026-07-02" }), // 時刻なし
        exp({}), // occurredAt なし
      ],
      { now: NOW },
    );
    expect(insight.countWithTime).toBe(1);
    expect(insight.countWithoutTime).toBe(2);
    expect(insight.peak?.bin).toBe("lateNight");
    expect(insight.peak?.amount).toBe(2000);
  });

  it("期間外（8日以上前）は無視する", () => {
    const insight = buildTimeOfDayInsight(
      [exp({ date: "2026-06-20", occurredAt: "2026-06-20T12:00:00" })],
      { now: NOW },
    );
    expect(insight.countWithTime).toBe(0);
    expect(insight.peak).toBeNull();
  });
});
