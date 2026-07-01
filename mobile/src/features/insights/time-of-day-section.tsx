import { Text, View } from "react-native";

import type { Expense } from "@/shared/db/types";
import {
  TIME_OF_DAY_LABEL,
  TIME_OF_DAY_RANGE,
  buildTimeOfDayInsight,
} from "@/shared/insights/time-of-day";
import { cn } from "@/shared/lib/cn";
import { formatYen } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

/**
 * 時間帯別インサイト（直近7日）。ダッシュボードのセクション。
 * 「いつ使いがちか」を時刻ビン別の横棒で見せる。最多の帯だけ accent で強調する
 * （深夜が最多でも赤は使わない＝赤は値上げ専用・design-conventions）。
 * 時刻は OCR 由来（occurredAt）なので、無ければ「時刻不明」として正直に添える。
 */
export function TimeOfDaySection({ expenses }: { expenses: Expense[] }) {
  const insight = buildTimeOfDayInsight(expenses);
  const max = insight.peak?.amount ?? 0;

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-text-secondary">
        時間帯別（直近7日）
      </Text>

      {insight.countWithTime === 0 ? (
        <Card>
          <Text className="text-xs text-text-muted">
            まだ時刻データがありません。レシートを撮ると購入時間が記録され、使いがちな時間帯がわかります。
          </Text>
        </Card>
      ) : (
        <Card className="gap-3">
          {insight.peak && (
            <Text className="text-xs text-text-secondary">
              <Text className="text-accent">
                {TIME_OF_DAY_LABEL[insight.peak.bin]}
              </Text>
              （{TIME_OF_DAY_RANGE[insight.peak.bin]}）が最多 ·{" "}
              {formatYen(insight.peak.amount)}／{insight.peak.count}件
            </Text>
          )}

          {insight.items.map((it) => {
            const isPeak = insight.peak?.bin === it.bin;
            const pct =
              it.amount > 0 && max > 0
                ? Math.max(4, (it.amount / max) * 100)
                : 0;
            return (
              <View key={it.bin} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-text-primary">
                    {TIME_OF_DAY_LABEL[it.bin]}
                    <Text className="text-xs text-text-muted">
                      {"  "}
                      {TIME_OF_DAY_RANGE[it.bin]}
                    </Text>
                  </Text>
                  <Text className="text-sm text-text-secondary">
                    {formatYen(it.amount)}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-surface">
                  <View
                    className={cn(
                      "h-full rounded-full",
                      isPeak ? "bg-accent" : "bg-accent/30",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </View>
              </View>
            );
          })}

          {insight.countWithoutTime > 0 && (
            <Text className="text-xs text-text-muted">
              時刻不明 {insight.countWithoutTime}件（レシート撮影で時間帯に反映されます）
            </Text>
          )}
        </Card>
      )}
    </View>
  );
}
