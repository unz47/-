import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCategoryMap } from "@/entities/category/model/use-categories";
import { useExpenses } from "@/entities/expense/model/use-expenses";
import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { TimeOfDaySection } from "@/features/insights/time-of-day-section";
import {
  categoryBreakdown,
  monthSummary,
  toMonthKey,
} from "@/shared/lib/aggregate";
import { formatMonthLabel } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

/** ダッシュボード（PROJECT_PLAN §6）。当月実請求基準（§4）。 */
export function DashboardScreen() {
  const expenses = useExpenses();
  const subs = useSubscriptions();
  const catMap = useCategoryMap();

  const ym = toMonthKey(new Date());
  const summary = monthSummary(expenses, subs, ym);
  const breakdown = categoryBreakdown(expenses, subs, ym);
  const max = breakdown[0]?.amount ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-12 pt-4">
        <View>
          <Text className="text-sm text-text-secondary">
            {formatMonthLabel(ym)}
          </Text>
          <Text className="text-base font-semibold text-text-primary">
            支出管理
          </Text>
        </View>

        <Card className="gap-1">
          <Text className="text-sm text-text-secondary">当月総支出</Text>
          <Text className="text-4xl font-bold text-accent">
            {formatYen(summary.total)}
          </Text>
          <Text className="text-xs text-text-muted">
            都度 {formatYen(summary.expenseTotal)} ／ サブスク実請求{" "}
            {formatYen(summary.subscriptionActual)}（月額換算{" "}
            {formatYen(summary.subscriptionMonthly)}）
          </Text>
        </Card>

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
            <Card className="gap-3">
              {breakdown.map((b) => {
                const cat = catMap.get(b.categoryId);
                const pct = max > 0 ? Math.max(4, (b.amount / max) * 100) : 0;
                return (
                  <View key={b.categoryId} className="gap-1">
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-text-primary">
                        {cat?.name ?? "—"}
                      </Text>
                      <Text className="text-sm text-text-secondary">
                        {formatYen(b.amount)}
                      </Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-surface">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat?.color ?? "#2dd4bf",
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        <TimeOfDaySection expenses={expenses} />
      </ScrollView>
    </SafeAreaView>
  );
}
