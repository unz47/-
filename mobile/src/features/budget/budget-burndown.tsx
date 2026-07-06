import { Text, View } from "react-native";

import { useMonthlyBudget } from "@/shared/db/settings";
import { budgetStatus, type BudgetLevel } from "@/shared/lib/budget";
import { toMonthKey, type MonthKey } from "@/shared/lib/aggregate";
import { cn } from "@/shared/lib/cn";
import { formatYen } from "@/shared/lib/money";

/**
 * カレンダー用の消化ペースバー（§9 v0.2 設計＝月予算＋バーンダウン）。
 * バーが経過日マーカーより先に出ていたらペース超過。当月以外は消化率のみ。
 * 超過=danger（専用）/ 接近=warning / 予算内=success。
 */
interface BudgetBurndownProps {
  /** 表示中の月の実支出（カレンダーの month.total）。 */
  spent: number;
  ym: MonthKey;
}

const BAR_COLOR: Record<BudgetLevel, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  over: "bg-danger",
};
const TEXT_COLOR: Record<BudgetLevel, string> = {
  ok: "text-success",
  warn: "text-warning",
  over: "text-danger",
};

export function BudgetBurndown({ spent, ym }: BudgetBurndownProps) {
  const budget = useMonthlyBudget();
  if (budget == null) return null;

  const now = new Date();
  const isCurrentMonth = toMonthKey(now) === ym;
  const st = budgetStatus(budget, spent, isCurrentMonth ? now : undefined);
  const pct = Math.min(100, st.ratio * 100);
  const elapsedPct = Math.min(100, st.elapsedRatio * 100);

  return (
    <View className="gap-1 px-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-text-muted">
          予算 {formatYen(budget)}
        </Text>
        <Text className={cn("text-xs font-semibold", TEXT_COLOR[st.level])}>
          {st.level === "over"
            ? `${formatYen(-st.remaining)} 超過`
            : `あと ${formatYen(st.remaining)}`}
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-surface">
        <View
          className={cn("h-full rounded-full", BAR_COLOR[st.level])}
          style={{ width: `${pct}%` }}
        />
      </View>
      {isCurrentMonth && (
        <View className="h-1.5">
          {/* 経過日マーカー: バーがこの線を越えていたら使いすぎペース */}
          <View
            className="absolute h-1.5 w-0.5 rounded-full bg-text-muted"
            style={{ left: `${elapsedPct}%` }}
          />
        </View>
      )}
    </View>
  );
}
