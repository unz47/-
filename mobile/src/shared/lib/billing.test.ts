import { describe, expect, it } from "vitest";

import type { Subscription } from "@/shared/db/types";
import {
  daysUntil,
  formatDaysLeft,
  isInTrial,
  lifetimePaid,
  monthsSubscribed,
  nextBillingDate,
  sortSubscriptions,
  upcomingBillingDates,
  upcomingCharges,
  yearlyCost,
} from "./billing";

const TODAY = new Date(2026, 10, 22); // 2026-11-22

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

describe("nextBillingDate", () => {
  it("今月の課金日が過ぎていれば来月", () => {
    expect(nextBillingDate(sub(), TODAY)).toBe("2026-12-05");
  });

  it("今月の課金日がこれからなら今月", () => {
    expect(nextBillingDate(sub({ billingDay: 28 }), TODAY)).toBe("2026-11-28");
  });

  it("課金日が今日なら今日", () => {
    expect(nextBillingDate(sub({ billingDay: 22 }), TODAY)).toBe("2026-11-22");
  });

  it("31日課金は月末にクランプする", () => {
    expect(nextBillingDate(sub({ billingDay: 31 }), TODAY)).toBe("2026-11-30");
  });

  it("年額は請求月まで待つ（今年分が過ぎていれば翌年）", () => {
    const s = sub({ billingCycle: "yearly", billingMonth: 3, billingDay: 15 });
    expect(nextBillingDate(s, TODAY)).toBe("2027-03-15");
  });

  it("年額で billingMonth 未設定なら開始月を請求月とする", () => {
    const s = sub({ billingCycle: "yearly", startedAt: "2025-12-01" });
    expect(nextBillingDate(s, TODAY)).toBe("2026-12-05");
  });

  it("開始日が未来なら開始日以降の最初の請求日", () => {
    const s = sub({ startedAt: "2026-12-20", billingDay: 20 });
    expect(nextBillingDate(s, TODAY)).toBe("2026-12-20");
  });

  it("解約日より後の請求は無い", () => {
    expect(nextBillingDate(sub({ canceledAt: "2026-11-22" }), TODAY)).toBeNull();
  });
});

describe("upcomingBillingDates", () => {
  it("月額は月ごとに並ぶ", () => {
    expect(upcomingBillingDates(sub(), TODAY, 3)).toEqual([
      "2026-12-05",
      "2027-01-05",
      "2027-02-05",
    ]);
  });
});

describe("upcomingCharges", () => {
  it("期間内の請求だけを日付順に返す", () => {
    const subs = [
      sub({ id: "a", billingDay: 5 }), // 12/5
      sub({ id: "b", billingDay: 25, amount: 980 }), // 11/25
      sub({
        id: "c",
        billingCycle: "yearly",
        billingMonth: 6,
        amount: 5900,
      }), // 圏外
      sub({ id: "d", canceledAt: "2026-11-01" }), // 解約済み
    ];
    const list = upcomingCharges(subs, TODAY, 30);
    expect(list.map((c) => c.subscription.id)).toEqual(["b", "a"]);
    expect(list[0].daysLeft).toBe(3);
    expect(list[1].amount).toBe(1590);
  });
});

describe("yearlyCost / monthsSubscribed / lifetimePaid", () => {
  it("年間コストは月額×12、年額はそのまま", () => {
    expect(yearlyCost(sub())).toBe(19080);
    expect(yearlyCost(sub({ billingCycle: "yearly", amount: 5900 }))).toBe(5900);
  });

  it("契約月数は開始月を 1 ヶ月目と数える", () => {
    expect(monthsSubscribed(sub(), TODAY)).toBe(11);
    expect(monthsSubscribed(sub({ startedAt: "2026-12-01" }), TODAY)).toBe(0);
  });

  it("累計は到来済みの請求だけ数える（当月の未到来分は含めない）", () => {
    // 1〜11月の 11 回（11/5 は到来済み）
    expect(lifetimePaid(sub(), TODAY)).toBe(1590 * 11);
    // 課金日 28 日: 11/28 は未到来なので 10 回
    expect(lifetimePaid(sub({ billingDay: 28 }), TODAY)).toBe(1590 * 10);
  });

  it("年額の累計は請求月の回数ぶん", () => {
    const s = sub({
      billingCycle: "yearly",
      billingMonth: 3,
      amount: 5900,
      startedAt: "2024-03-01",
    });
    expect(lifetimePaid(s, TODAY)).toBe(5900 * 3);
  });

  it("解約済みは解約日までで止まる", () => {
    const s = sub({ canceledAt: "2026-03-20" });
    expect(lifetimePaid(s, TODAY)).toBe(1590 * 3);
  });
});

describe("isInTrial", () => {
  it("終了日より前だけ体験中", () => {
    expect(isInTrial(sub({ trialEndsAt: "2026-12-01" }), TODAY)).toBe(true);
    expect(isInTrial(sub({ trialEndsAt: "2026-11-22" }), TODAY)).toBe(false);
    expect(isInTrial(sub(), TODAY)).toBe(false);
  });
});

describe("sortSubscriptions", () => {
  const subs = [
    sub({ id: "a", serviceName: "Spotify", billingDay: 5, amount: 980 }),
    sub({ id: "b", serviceName: "Netflix", billingDay: 25, amount: 1590 }),
    sub({
      id: "c",
      serviceName: "Amazon Prime",
      billingCycle: "yearly",
      billingMonth: 6,
      amount: 5900,
    }),
  ];

  it("next は次回請求日の近い順", () => {
    expect(sortSubscriptions(subs, "next", TODAY).map((s) => s.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("amount は月額換算の高い順（年額は 12 で割って比べる）", () => {
    expect(sortSubscriptions(subs, "amount", TODAY).map((s) => s.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("name は名前順", () => {
    expect(sortSubscriptions(subs, "name", TODAY).map((s) => s.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });
});

describe("daysUntil / formatDaysLeft", () => {
  it("日数とラベル", () => {
    expect(daysUntil("2026-11-25", TODAY)).toBe(3);
    expect(formatDaysLeft(0)).toBe("今日");
    expect(formatDaysLeft(1)).toBe("明日");
    expect(formatDaysLeft(13)).toBe("あと13日");
  });
});
