import { Text, View } from "react-native";

import { useMonthlyBudget } from "@/shared/db/settings";
import { budgetStatus, type BudgetLevel } from "@/shared/lib/budget";
import { cn } from "@/shared/lib/cn";
import { formatYen } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

/**
 * 予算残タイル（ダッシュボード）。「今月あといくら・このペースで足りるか」。
 * 超過=danger（専用）/ 接近=warning / 予算内=success のシグナル色（§3・§9）。
 */
interface BudgetTileProps {
  /** 当月実支出（monthSummary.total）。 */
  spent: number;
  now?: Date;
  className?: string;
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

export function BudgetTile({ spent, now, className }: BudgetTileProps) {
  const budget = useMonthlyBudget();

  if (budget == null) {
    return (
      <Card className={cn("justify-between gap-1", className)}>
        <Text className="text-sm text-text-secondary">予算</Text>
        <Text className="text-xs text-text-muted">
          設定タブで月予算を決めると、残額とペースが出ます。
        </Text>
      </Card>
    );
  }

  const st = budgetStatus(budget, spent, now ?? new Date());
  const pct = Math.min(100, st.ratio * 100);
  const elapsedPct = Math.min(100, st.elapsedRatio * 100);

  return (
    <Card className={cn("gap-1.5", className)}>
      <Text className="text-sm text-text-secondary">
        {st.level === "over" ? "予算オーバー" : "今月あと"}
      </Text>
      <Text
        className={cn("text-2xl font-bold", TEXT_COLOR[st.level])}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {formatYen(Math.abs(st.remaining))}
      </Text>
      {/* 消化バー＋経過日マーカー（バーがマーカーより先＝ペース超過） */}
      <View className="h-2 overflow-hidden rounded-full bg-surface">
        <View
          className={cn("h-full rounded-full", BAR_COLOR[st.level])}
          style={{ width: `${pct}%` }}
        />
      </View>
      <View className="h-1.5">
        <View
          className="absolute h-1.5 w-0.5 rounded-full bg-text-muted"
          style={{ left: `${elapsedPct}%` }}
        />
      </View>
      <Text className="text-xs text-text-muted">
        {formatYen(st.spent)} / {formatYen(st.budget)} ・ 月末見込み{" "}
        {formatYen(st.projected)}
      </Text>
    </Card>
  );
}
