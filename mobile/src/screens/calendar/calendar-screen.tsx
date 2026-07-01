import { Ionicons } from "@expo/vector-icons";
import { addMonths, format, subMonths } from "date-fns";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCategoryMap } from "@/entities/category/model/use-categories";
import { useExpenses } from "@/entities/expense/model/use-expenses";
import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { useThemeColors } from "@/shared/config/theme";
import { toMonthKey } from "@/shared/lib/aggregate";
import { buildCalendarMonth, type CalendarDay } from "@/shared/lib/calendar";
import { formatFullDay, formatMonthLabel } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** カレンダー（読み取り専用 / §6）。当月実請求を日グリッドに並べる。 */
export function CalendarScreen() {
  const expenses = useExpenses();
  const subs = useSubscriptions();
  const catMap = useCategoryMap();
  const [cursor, setCursor] = useState(() => new Date());
  const colors = useThemeColors();

  const today = useMemo(() => new Date(), []);
  const todayMonth = toMonthKey(today);
  const month = useMemo(
    () => buildCalendarMonth(expenses, subs, toMonthKey(cursor), today),
    [expenses, subs, cursor, today],
  );

  // 選択日: 当月を見ているときは今日、別月なら 1 日を既定にする
  const defaultDate = useMemo(() => {
    const cursorMonth = toMonthKey(cursor);
    return cursorMonth === todayMonth
      ? format(today, "yyyy-MM-dd")
      : `${cursorMonth}-01`;
  }, [cursor, todayMonth, today]);

  const [selected, setSelected] = useState(defaultDate);

  // 月が変わったら選択日を既定（今日 or 1日）へ戻す
  const [prevDefault, setPrevDefault] = useState(defaultDate);
  if (defaultDate !== prevDefault) {
    setPrevDefault(defaultDate);
    setSelected(defaultDate);
  }

  const selectedDay = month.days.find((d) => d.date === selected) ?? null;

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-12 pt-4">
        <View className="flex-row items-center justify-between px-1">
          <Pressable
            onPress={() => setCursor(subMonths(cursor, 1))}
            className="p-2"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          </Pressable>
          <View className="items-center">
            <Text className="text-base font-bold text-text-primary">
              {formatMonthLabel(month.ym)}
            </Text>
            <Text className="text-xs text-text-muted">
              {formatYen(month.total)}
            </Text>
          </View>
          <Pressable
            onPress={() => setCursor(addMonths(cursor, 1))}
            className="p-2"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View>
          <View className="flex-row">
            {WEEKDAYS.map((w) => (
              <Text
                key={w}
                className="flex-1 pb-1 text-center text-xs text-text-muted"
              >
                {w}
              </Text>
            ))}
          </View>
          {month.weeks.map((week, wi) => (
            <View key={wi} className="flex-row">
              {week.map((d, di) => (
                <DayCell
                  key={di}
                  day={d}
                  active={!!d && d.date === selected}
                  onPress={() => d && setSelected(d.date)}
                />
              ))}
            </View>
          ))}
        </View>

        {selectedDay && (
          <Card className="gap-2">
            <Text className="text-sm font-semibold text-text-primary">
              {formatFullDay(selectedDay.date)}
            </Text>
            {selectedDay.total === 0 ? (
              <Text className="text-xs text-text-muted">支出なし</Text>
            ) : (
              <>
                {selectedDay.expenses.map((e) => (
                  <View key={e.id} className="flex-row justify-between">
                    <Text className="text-sm text-text-secondary">
                      {catMap.get(e.categoryId)?.name ?? "—"}
                      {e.memo ? ` ・ ${e.memo}` : ""}
                    </Text>
                    <Text className="text-sm text-text-primary">
                      {formatYen(e.amount)}
                    </Text>
                  </View>
                ))}
                {selectedDay.subCharges.map((c) => (
                  <View
                    key={c.subscription.id}
                    className="flex-row justify-between"
                  >
                    <Text className="text-sm text-text-secondary">
                      {c.subscription.serviceName}（サブスク）
                    </Text>
                    <Text className="text-sm text-text-primary">
                      {formatYen(c.amount)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DayCell({
  day,
  active,
  onPress,
}: {
  day: CalendarDay | null;
  active: boolean;
  onPress: () => void;
}) {
  if (!day) return <View className="flex-1 p-1" />;
  return (
    <Pressable onPress={onPress} className="flex-1 p-1">
      <View
        className={
          "min-h-[44px] items-center justify-center rounded-lg py-1 " +
          (active
            ? "bg-accent/20"
            : day.isToday
              ? "bg-surface-raised"
              : "")
        }
      >
        <Text
          className={
            "text-xs " +
            (day.isToday ? "font-bold text-accent" : "text-text-secondary")
          }
        >
          {day.day}
        </Text>
        {day.total > 0 && (
          <View className="mt-0.5 h-1 w-1 rounded-full bg-accent" />
        )}
      </View>
    </Pressable>
  );
}
