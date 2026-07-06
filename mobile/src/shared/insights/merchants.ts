import type { Expense } from "@/shared/db/types";
import { expensesInMonth, type MonthKey } from "@/shared/lib/aggregate";

/**
 * 店名ベースの散財インサイト（PROJECT_PLAN §11.5 B の入口）。
 * merchantKey（名寄せキー）で当月の支出を束ね、金額降順の上位を返す。
 * 店名が無い支出は対象外（countWithoutMerchant で母数を示す）。
 */

export interface MerchantSpend {
  merchantKey: string;
  /** 表示名（同キーの中で最新の生の店名）。 */
  label: string;
  amount: number; // 円・整数
  count: number;
}

export interface MerchantInsight {
  top: MerchantSpend[];
  countWithMerchant: number;
  countWithoutMerchant: number;
}

export function topMerchants(
  expenses: Expense[],
  ym: MonthKey,
  limit = 5,
): MerchantInsight {
  const monthly = expensesInMonth(expenses, ym);
  const byKey = new Map<string, MerchantSpend>();
  let countWithMerchant = 0;
  let countWithoutMerchant = 0;

  // expenses は日付降順で来る想定だが、依存しないよう label は最新日付で選ぶ
  const latestDate = new Map<string, string>();
  for (const e of monthly) {
    if (!e.merchantKey || !e.merchant) {
      countWithoutMerchant += 1;
      continue;
    }
    countWithMerchant += 1;
    const cur = byKey.get(e.merchantKey);
    if (cur) {
      cur.amount += e.amount;
      cur.count += 1;
      if ((latestDate.get(e.merchantKey) ?? "") < e.date) {
        cur.label = e.merchant;
        latestDate.set(e.merchantKey, e.date);
      }
    } else {
      byKey.set(e.merchantKey, {
        merchantKey: e.merchantKey,
        label: e.merchant,
        amount: e.amount,
        count: 1,
      });
      latestDate.set(e.merchantKey, e.date);
    }
  }

  const top = [...byKey.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
  return { top, countWithMerchant, countWithoutMerchant };
}
