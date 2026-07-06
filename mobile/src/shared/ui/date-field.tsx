import { Ionicons } from "@expo/vector-icons";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/shared/config/theme";
import { cn } from "@/shared/lib/cn";
import { formatFullDay, formatMonthLabel } from "@/shared/lib/date";
import { hapticLight } from "@/shared/lib/haptics";
import { toMonthKey } from "@/shared/lib/aggregate";
import { Chip } from "@/shared/ui/chip";

/**
 * 日付入力（YYYY-MM-DD 手打ちの置き換え）。
 * タップでインライン月グリッドを展開して選ぶ。シート内でネストモーダルを
 * 開かない（iOS のモーダル多段は挙動が不安定）ためのインライン方式。
 * 「今日 / 昨日」チップで最頻の入力を 1 タップに。
 */
interface DateFieldProps {
  label?: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (date: string) => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function DateField({ label = "日付", value, onChange }: DateFieldProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseISO(value));

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  function pick(date: string) {
    onChange(date);
    setOpen(false);
  }
  function toggleOpen() {
    hapticLight();
    if (!open) setCursor(parseISO(value));
    setOpen((o) => !o);
  }

  // カーソル月のグリッド（週ごと、月初の曜日ぶん null 詰め）
  const first = startOfMonth(cursor);
  const days = eachDayOfInterval({ start: first, end: endOfMonth(first) });
  const weeks: (Date | null)[][] = [];
  let row: (Date | null)[] = Array<Date | null>(getDay(first)).fill(null);
  for (const d of days) {
    row.push(d);
    if (row.length === 7) {
      weeks.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }

  return (
    <View className="gap-1">
      <Text className="text-xs text-text-secondary">{label}</Text>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={toggleOpen}
          accessibilityRole="button"
          accessibilityLabel={`${label}を選択。現在 ${formatFullDay(value)}`}
          accessibilityState={{ expanded: open }}
          className="flex-1 flex-row items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3"
        >
          <Text className="text-text-primary">{formatFullDay(value)}</Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        <Chip label="今日" active={value === today} onPress={() => pick(today)} />
        <Chip
          label="昨日"
          active={value === yesterday}
          onPress={() => pick(yesterday)}
        />
      </View>

      {open && (
        <View className="gap-1 rounded-xl border border-border bg-surface-raised p-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setCursor(subMonths(cursor, 1))}
              accessibilityRole="button"
              accessibilityLabel="前の月"
              className="p-1.5"
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
            <Text className="text-sm font-semibold text-text-primary">
              {formatMonthLabel(toMonthKey(cursor))}
            </Text>
            <Pressable
              onPress={() => setCursor(addMonths(cursor, 1))}
              accessibilityRole="button"
              accessibilityLabel="次の月"
              className="p-1.5"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View className="flex-row">
            {WEEKDAYS.map((w) => (
              <Text
                key={w}
                className="flex-1 pb-1 text-center text-[10px] text-text-muted"
              >
                {w}
              </Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} className="flex-row">
              {week.map((d, di) => {
                if (!d) return <View key={di} className="flex-1 p-0.5" />;
                const date = format(d, "yyyy-MM-dd");
                const selected = date === value;
                const isToday = date === today;
                return (
                  <Pressable
                    key={di}
                    onPress={() => pick(date)}
                    accessibilityRole="button"
                    accessibilityLabel={formatFullDay(date)}
                    accessibilityState={{ selected }}
                    className="flex-1 p-0.5"
                  >
                    <View
                      className={cn(
                        "h-9 items-center justify-center rounded-lg",
                        selected
                          ? "bg-accent"
                          : isToday
                            ? "bg-accent/15"
                            : undefined,
                      )}
                    >
                      <Text
                        className={cn(
                          "text-xs",
                          selected
                            ? "font-bold text-on-accent"
                            : isToday
                              ? "font-bold text-accent"
                              : "text-text-primary",
                        )}
                      >
                        {d.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
