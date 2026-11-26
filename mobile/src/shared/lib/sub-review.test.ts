import { describe, expect, it } from "vitest";

import type { Subscription, SubscriptionReview } from "@/shared/db/types";
import {
  buildReviewQueue,
  costPerUse,
  dueReviewCount,
  latestReviews,
  reviewReason,
  summarizeReviews,
  usageInsight,
} from "./sub-review";

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

function review(over: Partial<SubscriptionReview> = {}): SubscriptionReview {
  return {
    id: "r1",
    subscriptionId: "s1",
    verdict: "keep",
    reviewedAt: "2026-11-01T00:00:00.000Z",
    ...over,
  };
}

describe("costPerUse / usageInsight", () => {
  it("月額換算を月あたり利用回数で割る（整数）", () => {
    expect(costPerUse(sub(), "daily")).toBe(64); // 1590/25
    expect(costPerUse(sub(), "monthly")).toBe(530); // 1590/3
  });

  it("年額は月額換算で計算する", () => {
    expect(
      costPerUse(sub({ amount: 5900, billingCycle: "yearly" }), "weekly"),
    ).toBe(
      49, // round(5900/12)=492 → /10
    );
  });

  it("ほとんど使っていないなら null・所感は poor", () => {
    expect(costPerUse(sub(), "rarely")).toBeNull();
    expect(usageInsight(sub(), "rarely")).toEqual({
      text: "使っていないのに月 ¥1,590",
      level: "poor",
    });
  });

  it("1回あたりの金額で good / fair / poor", () => {
    expect(usageInsight(sub(), "daily").level).toBe("good");
    expect(usageInsight(sub(), "weekly").level).toBe("fair");
    expect(usageInsight(sub(), "monthly").level).toBe("poor");
  });
});

describe("latestReviews", () => {
  it("並び順に依らず最新の判定を採る", () => {
    const map = latestReviews([
      review({ id: "a", verdict: "keep", reviewedAt: "2026-10-01T00:00:00Z" }),
      review({
        id: "b",
        verdict: "cancel",
        reviewedAt: "2026-11-01T00:00:00Z",
      }),
      review({ id: "c", verdict: "maybe", reviewedAt: "2026-09-01T00:00:00Z" }),
    ]);
    expect(map.get("s1")?.id).toBe("b");
  });
});

describe("reviewReason", () => {
  it("体験終了が近いものが最優先", () => {
    const s = sub({ trialEndsAt: "2026-11-25", startedAt: "2026-11-25" });
    expect(reviewReason(s, review(), TODAY, true)).toEqual({
      kind: "trial",
      text: "無料体験があと3日で終了",
    });
  });

  it("体験終了が先なら体験扱いしない", () => {
    const s = sub({ trialEndsAt: "2027-01-30", startedAt: "2027-01-30" });
    expect(reviewReason(s, undefined, TODAY, false).kind).toBe("unreviewed");
  });

  it("値上げ → 前回判定 → 未見直しの順", () => {
    expect(reviewReason(sub(), review(), TODAY, true).kind).toBe("raised");
    expect(
      reviewReason(sub(), review({ verdict: "cancel" }), TODAY, false).kind,
    ).toBe("cancel");
    expect(
      reviewReason(sub(), review({ verdict: "maybe" }), TODAY, false).kind,
    ).toBe("maybe");
    expect(reviewReason(sub(), undefined, TODAY, false).kind).toBe(
      "unreviewed",
    );
  });

  it("判定から14日以内は体験終了・値上げ・迷うでも促さない", () => {
    const recent = review({
      verdict: "maybe",
      reviewedAt: "2026-11-20T00:00:00Z",
    });
    const s = sub({ trialEndsAt: "2026-11-25", startedAt: "2026-11-25" });
    expect(reviewReason(s, recent, TODAY, true)).toEqual({
      kind: "none",
      text: "最近「迷う」と判断済み",
    });
  });

  it("「必要」でも90日経てば見直し時期", () => {
    expect(
      reviewReason(
        sub(),
        review({ reviewedAt: "2026-08-01T00:00:00Z" }),
        TODAY,
        false,
      ),
    ).toEqual({ kind: "stale", text: "前回の見直しから3ヶ月" });
    expect(reviewReason(sub(), review(), TODAY, false).kind).toBe("none");
  });
});

describe("buildReviewQueue / dueReviewCount", () => {
  const a = sub({ id: "a", amount: 500 }); // 必要（最近）
  const b = sub({ id: "b", amount: 3000 }); // 未見直し・高い
  const c = sub({ id: "c", amount: 1000 }); // 未見直し
  const d = sub({ id: "d", amount: 200 }); // 迷う
  const latest = latestReviews([
    review({ id: "ra", subscriptionId: "a" }),
    review({ id: "rd", subscriptionId: "d", verdict: "maybe" }),
  ]);

  it("理由の優先度 → 月額の高い順", () => {
    const q = buildReviewQueue([a, b, c, d], latest, TODAY, new Set());
    expect(q.map((s) => s.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("値上げは前回判定より先", () => {
    const q = buildReviewQueue([a, b, c, d], latest, TODAY, new Set(["a"]));
    expect(q[0].id).toBe("a");
  });

  it("見直しが必要な件数", () => {
    expect(dueReviewCount([a, b, c, d], latest, TODAY, new Set())).toBe(3);
  });
});

describe("summarizeReviews", () => {
  it("最新判定で振り分け、月額・年額を合計する", () => {
    const y = sub({ id: "y", amount: 5900, billingCycle: "yearly" });
    const m = sub({ id: "m", amount: 1000 });
    const k = sub({ id: "k" });
    const u = sub({ id: "u" });
    const summary = summarizeReviews(
      [y, m, k, u],
      latestReviews([
        review({ id: "1", subscriptionId: "y", verdict: "cancel" }),
        review({ id: "2", subscriptionId: "m", verdict: "cancel" }),
        review({ id: "3", subscriptionId: "k", verdict: "keep" }),
      ]),
    );
    expect(summary.cancel.subs.map((s) => s.id)).toEqual(["y", "m"]);
    expect(summary.cancel.monthly).toBe(492 + 1000);
    expect(summary.cancel.yearly).toBe(5900 + 12000);
    expect(summary.keep.subs).toHaveLength(1);
    expect(summary.maybe.subs).toHaveLength(0);
    expect(summary.unreviewed.map((s) => s.id)).toEqual(["u"]);
  });
});
