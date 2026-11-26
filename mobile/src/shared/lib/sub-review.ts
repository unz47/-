// サブスクの見直し（取捨選択）の純ロジック。判定はユーザーの主観メモで、集計（§4）には影響しない。
// 「本当に要る？」を素早く決めるための材料（1回あたりコスト・見直す理由・節約見込み）をここで作る。
import { differenceInCalendarMonths } from "date-fns";

import type {
  ReviewVerdict,
  Subscription,
  SubscriptionReview,
  UsageFrequency,
} from "@/shared/db/types";
import { monthlyEquivalent } from "./aggregate";
import { daysUntil, isInTrial, yearlyCost } from "./billing";

export const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  keep: "必要",
  maybe: "迷う",
  cancel: "解約候補",
};

/** 利用頻度の選択肢と、1回あたりコストの目安に使う月あたり利用回数。 */
export const USAGE_OPTIONS: {
  key: UsageFrequency;
  label: string;
  usesPerMonth: number;
}[] = [
  { key: "daily", label: "ほぼ毎日", usesPerMonth: 25 },
  { key: "weekly", label: "週に数回", usesPerMonth: 10 },
  { key: "monthly", label: "月に数回", usesPerMonth: 3 },
  { key: "rarely", label: "ほとんど使ってない", usesPerMonth: 0 },
];

/** 次の見直しを促すまでの日数。 */
export const REVIEW_INTERVAL_DAYS = 90;
/** 体験終了がこの日数以内なら最優先で見直しに出す。 */
export const TRIAL_ALERT_DAYS = 14;
/**
 * 判定してからこの日数は「見直し時期」に数えない（見直した直後にまた促さない）。
 * 「迷う」「解約候補」はこの日数を過ぎたら追いかけて聞き直す。
 */
export const FOLLOW_UP_DAYS = 14;

/** 1回あたりのコスト（円・整数）。ほとんど使っていない場合は null。 */
export function costPerUse(
  s: Subscription,
  usage: UsageFrequency,
): number | null {
  const uses = USAGE_OPTIONS.find((o) => o.key === usage)?.usesPerMonth ?? 0;
  if (uses <= 0) return null;
  return Math.round(monthlyEquivalent(s) / uses);
}

export type ValueLevel = "good" | "fair" | "poor";

/** 1回あたりコストの所感。poor は「割高かも」。色は呼び出し側（赤は使わない）。 */
export function usageInsight(
  s: Subscription,
  usage: UsageFrequency,
): { text: string; level: ValueLevel } {
  const per = costPerUse(s, usage);
  if (per == null) {
    return {
      text: `使っていないのに月 ¥${monthlyEquivalent(s).toLocaleString("ja-JP")}`,
      level: "poor",
    };
  }
  const level: ValueLevel = per <= 100 ? "good" : per <= 500 ? "fair" : "poor";
  return { text: `1回あたり 約¥${per.toLocaleString("ja-JP")}`, level };
}

/** サブスク id → 最新の判定（入力順に依らず reviewedAt 最大を採る）。 */
export function latestReviews(
  reviews: SubscriptionReview[],
): Map<string, SubscriptionReview> {
  const map = new Map<string, SubscriptionReview>();
  for (const r of reviews) {
    const cur = map.get(r.subscriptionId);
    if (!cur || r.reviewedAt > cur.reviewedAt) map.set(r.subscriptionId, r);
  }
  return map;
}

export type ReasonKind =
  "trial" | "raised" | "cancel" | "maybe" | "unreviewed" | "stale" | "none";

/** 見直しに出す優先順（小さいほど先）。 */
const REASON_RANK: Record<ReasonKind, number> = {
  trial: 0,
  raised: 1,
  cancel: 2,
  maybe: 3,
  unreviewed: 4,
  stale: 5,
  none: 6,
};

export interface ReviewReason {
  kind: ReasonKind;
  text: string;
}

/** いま見直すべき理由（なければ kind=none）。 */
export function reviewReason(
  s: Subscription,
  latest: SubscriptionReview | undefined,
  today: Date,
  raised: boolean,
): ReviewReason {
  if (latest) {
    const age =
      (today.getTime() - new Date(latest.reviewedAt).getTime()) / 86400000;
    if (age < FOLLOW_UP_DAYS) {
      return {
        kind: "none",
        text: `最近「${VERDICT_LABEL[latest.verdict]}」と判断済み`,
      };
    }
  }
  if (isInTrial(s, today) && s.trialEndsAt) {
    const left = daysUntil(s.trialEndsAt, today);
    if (left <= TRIAL_ALERT_DAYS) {
      // isInTrial は「今日 < 体験終了日」なので left は 1 以上。
      return { kind: "trial", text: `無料体験があと${left}日で終了` };
    }
  }
  if (raised) return { kind: "raised", text: "最近値上げされました" };
  if (!latest) return { kind: "unreviewed", text: "まだ見直していません" };
  if (latest.verdict === "cancel")
    return { kind: "cancel", text: "前回「解約候補」にしたまま" };
  if (latest.verdict === "maybe")
    return { kind: "maybe", text: "前回「迷う」" };
  const months = differenceInCalendarMonths(today, new Date(latest.reviewedAt));
  const days =
    (today.getTime() - new Date(latest.reviewedAt).getTime()) / 86400000;
  if (days >= REVIEW_INTERVAL_DAYS) {
    return { kind: "stale", text: `前回の見直しから${months}ヶ月` };
  }
  return { kind: "none", text: "最近「必要」と判断済み" };
}

/**
 * 見直しモードで出す順番。理由の優先度 → 月額換算の高い順。
 * 全アクティブを対象にする（一通り棚卸しできるように）。
 */
export function buildReviewQueue(
  active: Subscription[],
  latest: Map<string, SubscriptionReview>,
  today: Date,
  raisedIds: Set<string>,
): Subscription[] {
  const rank = (s: Subscription) =>
    REASON_RANK[
      reviewReason(s, latest.get(s.id), today, raisedIds.has(s.id)).kind
    ];
  return [...active].sort(
    (a, b) => rank(a) - rank(b) || monthlyEquivalent(b) - monthlyEquivalent(a),
  );
}

/** 見直しが必要な件数（理由が none 以外）。 */
export function dueReviewCount(
  active: Subscription[],
  latest: Map<string, SubscriptionReview>,
  today: Date,
  raisedIds: Set<string>,
): number {
  return active.filter(
    (s) =>
      reviewReason(s, latest.get(s.id), today, raisedIds.has(s.id)).kind !==
      "none",
  ).length;
}

export interface VerdictBucket {
  subs: Subscription[];
  monthly: number; // 月額換算の合計
  yearly: number; // 年間コストの合計
}

export interface ReviewSummary {
  keep: VerdictBucket;
  maybe: VerdictBucket;
  cancel: VerdictBucket;
  unreviewed: Subscription[];
}

function bucket(subs: Subscription[]): VerdictBucket {
  return {
    subs,
    monthly: subs.reduce((a, s) => a + monthlyEquivalent(s), 0),
    yearly: subs.reduce((a, s) => a + yearlyCost(s), 0),
  };
}

/** アクティブなサブスクを最新判定で振り分ける（解約済みは対象外）。 */
export function summarizeReviews(
  active: Subscription[],
  latest: Map<string, SubscriptionReview>,
): ReviewSummary {
  const by = (v: ReviewVerdict) =>
    active.filter((s) => latest.get(s.id)?.verdict === v);
  return {
    keep: bucket(by("keep")),
    maybe: bucket(by("maybe")),
    cancel: bucket(by("cancel")),
    unreviewed: active.filter((s) => !latest.has(s.id)),
  };
}
