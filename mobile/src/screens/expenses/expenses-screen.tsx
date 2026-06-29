import { useMemo, useState } from "react";
import { Alert, Pressable, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCategoryMap } from "@/entities/category/model/use-categories";
import { deleteExpense } from "@/entities/expense/model/expense-repo";
import { useExpenses } from "@/entities/expense/model/use-expenses";
import { AddExpenseForm } from "@/features/add-expense/add-expense-form";
import type { Expense } from "@/shared/db/types";
import { formatDayHeader } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";

interface Section {
  date: string;
  data: Expense[];
}

/** 支出一覧（PROJECT_PLAN §6）。日付区切り、タップで編集・長押しで削除、FAB で追加。 */
export function ExpensesScreen() {
  const expenses = useExpenses();
  const catMap = useCategoryMap();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const sections = useMemo<Section[]>(() => {
    const byDate = new Map<string, Expense[]>();
    for (const e of expenses) {
      const arr = byDate.get(e.date) ?? [];
      arr.push(e);
      byDate.set(e.date, arr);
    }
    return [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, data]) => ({ date, data }));
  }, [expenses]);

  function confirmDelete(e: Expense) {
    Alert.alert(
      catMap.get(e.categoryId)?.name ?? "支出",
      `${formatYen(e.amount)} を削除しますか？`,
      [
        { text: "閉じる", style: "cancel" },
        { text: "削除", style: "destructive", onPress: () => deleteExpense(e.id) },
      ],
    );
  }

  function closeForm() {
    setAdding(false);
    setEditing(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <View className="px-5 py-4">
        <Text className="text-xl font-bold text-text-primary">支出</Text>
      </View>

      {expenses.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Text className="text-text-secondary">まだ支出がありません</Text>
          <Text className="text-xs text-text-muted">右下の ＋ から追加</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-28"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text className="bg-base pb-1 pt-4 text-xs font-semibold text-text-secondary">
              {formatDayHeader(section.date)}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setEditing(item)}
              onLongPress={() => confirmDelete(item)}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3 active:opacity-70"
            >
              <View className="gap-0.5">
                <Text className="text-text-primary">
                  {catMap.get(item.categoryId)?.name ?? "—"}
                </Text>
                {item.memo ? (
                  <Text className="text-xs text-text-muted">{item.memo}</Text>
                ) : null}
              </View>
              <Text className="text-base font-semibold text-text-primary">
                {formatYen(item.amount)}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => setAdding(true)}
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg active:opacity-80"
      >
        <Text className="text-3xl leading-none text-on-accent">＋</Text>
      </Pressable>

      <AddExpenseForm
        key={editing?.id ?? "new"}
        visible={adding || !!editing}
        editing={editing ?? undefined}
        onClose={closeForm}
      />
    </SafeAreaView>
  );
}
