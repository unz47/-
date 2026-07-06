import { subMonths } from "date-fns";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCategoryMap } from "@/entities/category/model/use-categories";
import { useExpenses } from "@/entities/expense/model/use-expenses";
import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { BudgetTile } from "@/features/budget/budget-tile";
import { MerchantSection } from "@/features/insights/merchant-section";
import { RaiseImpactTile } from "@/features/insights/raise-impact-tile";
import { TimeOfDaySection } from "@/features/insights/time-of-day-section";
import {
  categoryBreakdown,
  monthSummary,
  recentMonthTotals,
  toMonthKey,
} from "@/shared/lib/aggregate";
import { formatMonthLabel } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";
import { AnimatedYen } from "@/shared/ui/animated-yen";
import { Card } from "@/shared/ui/card";
import { DonutChart } from "@/shared/ui/charts/donut-chart";
import { MonthTrendBars } from "@/shared/ui/charts/month-trend-bars";

/**
 * ダッシュボード（PROJECT_PLAN §6）。当月実請求基準（§4）。
 * Bento 構成: タイルの大きさ＝重要度。主役は当月総支出、前月比は
 * ▲▼＋ニュートラル色（赤は値上げ/超過専用のため使わない）。
 */
export function DashboardScreen() {
  const expenses = useExpenses();
  const subs = useSubscriptions();
  const catMap = useCategoryMap();

  const now = new Date();
  const ym = toMonthKey(now);
  const prevYm = toMonthKey(subMonths(now, 1));
  const summary = monthSummary(expenses, subs, ym);
  const prevSummary = monthSummary(expenses, subs, prevYm);
  const breakdown = categoryBreakdown(expenses, subs, ym);
  const trend = recentMonthTotals(expenses, subs, now, 6);

  const delta = summary.total - prevSummary.total;

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-3 px-5 pb-12 pt-4">
        <View>
          <Text className="text-sm text-text-secondary">
            {formatMonthLabel(ym)}
          </Text>
          <Text className="text-base font-semibold text-text-primary">
            支出管理
          </Text>
        </View>

        {/* 主役タイル: 当月総支出（カウントアップ＋前月比） */}
        <Card className="gap-1">
          <Text className="text-sm text-text-secondary">当月総支出</Text>
          <AnimatedYen
            value={summary.total}
            className="text-4xl font-bold text-accent"
          />
          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-text-secondary">
              前月比 {delta >= 0 ? "▲" : "▼"} {formatYen(Math.abs(delta))}
            </Text>
            <Text className="text-xs text-text-muted">
              都度 {formatYen(summary.expenseTotal)}
            </Text>
          </View>
        </Card>

        {/* サブタイル列: サブスク / 予算残 */}
        <View className="flex-row gap-3">
          <Card className="flex-1 justify-between gap-1">
            <Text className="text-sm text-text-secondary">サブスク実請求</Text>
            <Text
              className="text-2xl font-bold text-text-primary"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatYen(summary.subscriptionActual)}
            </Text>
            <Text className="text-xs text-text-muted">
              月額換算 {formatYen(summary.subscriptionMonthly)}
            </Text>
          </Card>
          <BudgetTile spent={summary.total} now={now} className="flex-1" />
        </View>

        {/* 値上げ影響（改定があった年だけ出る） */}
        <RaiseImpactTile subs={subs} />

        {/* カテゴリ別（ドーナツ＋凡例） */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-text-secondary">
            カテゴリ別
          </Text>
          {breakdown.length === 0 ? (
            <Card>
              <Text className="text-xs text-text-muted">
                まだデータがありません。支出タブから追加できます。
              </Text>
            </Card>
          ) : (
            <Card className="flex-row items-center gap-4">
              <DonutChart
                slices={breakdown.map((b) => ({
                  key: b.categoryId,
                  value: b.amount,
                  color: catMap.get(b.categoryId)?.color ?? "#2dd4bf",
                }))}
                size={148}
                strokeWidth={20}
              >
                <Text className="text-xs text-text-muted">合計</Text>
                <Text
                  className="text-base font-bold text-text-primary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {formatYen(summary.total)}
                </Text>
              </DonutChart>
              <View className="flex-1 gap-2">
                {breakdown.map((b) => {
                  const cat = catMap.get(b.categoryId);
                  return (
                    <View
                      key={b.categoryId}
                      className="flex-row items-center gap-2"
                    >
                      <View
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat?.color ?? "#2dd4bf" }}
                      />
                      <Text
                        className="flex-1 text-xs text-text-primary"
                        numberOfLines={1}
                      >
                        {cat?.name ?? "—"}
                      </Text>
                      <Text
                        className="text-xs text-text-secondary"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {formatYen(b.amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
        </View>

        {/* 月推移（直近6ヶ月・年額は請求月にスパイク） */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-text-secondary">
            月推移（6ヶ月）
          </Text>
          <Card>
            <MonthTrendBars months={trend} currentYm={ym} />
          </Card>
        </View>

        <TimeOfDaySection expenses={expenses} />

        <MerchantSection expenses={expenses} ym={ym} />
      </ScrollView>
    </SafeAreaView>
  );
}
