import { describe, expect, it } from "vitest";

import type { Expense } from "@/shared/db/types";
import { topMerchants } from "./merchants";

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

describe("topMerchants", () => {
  it("merchantKey で束ねて金額降順、表示名は最新の生店名", () => {
    const insight = topMerchants(
      [
        exp({
          date: "2026-07-01",
          amount: 300,
          merchant: "セブンイレブン No.1",
          merchantKey: "セブンイレブン",
        }),
        exp({
          date: "2026-07-05",
          amount: 700,
          merchant: "セブンイレブン No.2",
          merchantKey: "セブンイレブン",
        }),
        exp({ amount: 500, merchant: "スギ薬局", merchantKey: "スギ薬局" }),
        exp({ amount: 9999 }), // 店名なし
      ],
      "2026-07",
    );
    expect(insight.top.map((m) => m.merchantKey)).toEqual([
      "セブンイレブン",
      "スギ薬局",
    ]);
    expect(insight.top[0].amount).toBe(1000);
    expect(insight.top[0].count).toBe(2);
    expect(insight.top[0].label).toBe("セブンイレブン No.2"); // 最新日付
    expect(insight.countWithoutMerchant).toBe(1);
  });

  it("別月の支出は含めない", () => {
    const insight = topMerchants(
      [exp({ date: "2026-06-30", merchant: "A", merchantKey: "a" })],
      "2026-07",
    );
    expect(insight.top).toHaveLength(0);
  });
});
