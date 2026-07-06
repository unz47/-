import { Text, View } from "react-native";

import type { MonthTotal } from "@/shared/lib/aggregate";
import { formatMonthShort } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";

/**
 * 直近 N ヶ月の月推移バー（Web版 month-trend-bars の移植）。
 * 当月＝accent、他月＝accent/30。年額サブスクは請求月にスパイクとして現れる（§4）。
 */
interface MonthTrendBarsProps {
  months: MonthTotal[];
  /** 強調する月（通常は当月の ym）。 */
  currentYm: string;
  height?: number;
}

export function MonthTrendBars({
  months,
  currentYm,
  height = 96,
}: MonthTrendBarsProps) {
  const max = Math.max(...months.map((m) => m.total), 1);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`直近${months.length}ヶ月の支出推移`}
      className="flex-row items-end gap-2"
    >
      {months.map((m) => {
        const isCurrent = m.ym === currentYm;
        const h = Math.max(m.total > 0 ? 4 : 2, (m.total / max) * height);
        return (
          <View key={m.ym} className="flex-1 items-center gap-1">
            {isCurrent && (
              <Text
                className="text-[10px] text-accent"
                style={{ fontVariant: ["tabular-nums"] }}
                numberOfLines={1}
              >
                {formatYen(m.total)}
              </Text>
            )}
            <View
              className={cn(
                "w-full rounded-t-md",
                isCurrent ? "bg-accent" : "bg-accent/30",
              )}
              style={{ height: h }}
            />
            <Text
              className={cn(
                "text-[10px]",
                isCurrent ? "font-semibold text-accent" : "text-text-muted",
              )}
            >
              {formatMonthShort(m.ym)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
