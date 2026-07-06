import { Text, View } from "react-native";

import type { Expense } from "@/shared/db/types";
import { topMerchants } from "@/shared/insights/merchants";
import type { MonthKey } from "@/shared/lib/aggregate";
import { formatYen } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

/**
 * よく行く店 TOP5（当月・店名ベースの散財インサイト §11.5 B）。
 * merchantKey の名寄せで束ね、金額の横棒で比較する。店名はレシートOCRか
 * 支出フォームの店名欄から。データが無ければ促しだけ出す。
 */
export function MerchantSection({
  expenses,
  ym,
}: {
  expenses: Expense[];
  ym: MonthKey;
}) {
  const insight = topMerchants(expenses, ym);
  const max = insight.top[0]?.amount ?? 0;

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-text-secondary">
        よく行く店（当月）
      </Text>

      {insight.top.length === 0 ? (
        <Card>
          <Text className="text-xs text-text-muted">
            まだ店名データがありません。レシート撮影か、支出フォームの店名欄で記録できます。
          </Text>
        </Card>
      ) : (
        <Card className="gap-3">
          {insight.top.map((m) => {
            const pct = max > 0 ? Math.max(4, (m.amount / max) * 100) : 0;
            return (
              <View key={m.merchantKey} className="gap-1">
                <View className="flex-row justify-between gap-2">
                  <Text
                    className="flex-1 text-sm text-text-primary"
                    numberOfLines={1}
                  >
                    {m.label}
                    <Text className="text-xs text-text-muted">
                      {"  "}
                      {m.count}件
                    </Text>
                  </Text>
                  <Text
                    className="text-sm text-text-secondary"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatYen(m.amount)}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-surface">
                  <View
                    className="h-full rounded-full bg-accent/60"
                    style={{ width: `${pct}%` }}
                  />
                </View>
              </View>
            );
          })}
          {insight.countWithoutMerchant > 0 && (
            <Text className="text-xs text-text-muted">
              店名なし {insight.countWithoutMerchant}件
            </Text>
          )}
        </Card>
      )}
    </View>
  );
}
