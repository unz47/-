import { getDate, getDaysInMonth } from "date-fns";

/**
 * 月予算と消化ペース（PROJECT_PLAN §9 の v0.2 設計）。
 * 「日別予算割当」は採らず、月予算 1 本＋消化ペースで見せる。
 * 超過=danger / 接近=warning / 予算内=success のシグナル色に対応するレベルを返す。
 */

export type BudgetLevel = "ok" | "warn" | "over";

export interface BudgetStatus {
  budget: number; // 月予算（円・整数）
  spent: number; // 当月実支出（円・整数）
  remaining: number; // budget - spent（負=超過分）
  ratio: number; // spent / budget（1 超え=超過）
  /** 月の経過割合（今日/月日数）。当月以外を見るときは 1 を渡す想定。 */
  elapsedRatio: number;
  /** いまのペースの月末見込み（円・整数）。経過 0 日は spent のまま。 */
  projected: number;
  level: BudgetLevel;
}

/** 接近とみなす消化率のしきい値。 */
const WARN_RATIO = 0.8;

/**
 * 予算ステータスを計算する。spent は monthSummary(...).total（当月実請求基準）を渡す。
 * now を省略すると経過割合 1（過去月・締まった月の扱い）。
 */
export function budgetStatus(
  budget: number,
  spent: number,
  now?: Date,
): BudgetStatus {
  const elapsedRatio = now ? getDate(now) / getDaysInMonth(now) : 1;
  const ratio = budget > 0 ? spent / budget : 0;
  const projected =
    elapsedRatio > 0 ? Math.round(spent / elapsedRatio) : spent;

  let level: BudgetLevel = "ok";
  if (spent > budget) level = "over";
  else if (ratio >= WARN_RATIO || projected > budget) level = "warn";

  return {
    budget,
    spent,
    remaining: budget - spent,
    ratio,
    elapsedRatio,
    projected,
    level,
  };
}
