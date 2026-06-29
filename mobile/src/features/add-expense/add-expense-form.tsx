import { format } from "date-fns";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCategories } from "@/entities/category/model/use-categories";
import { addExpense } from "@/entities/expense/model/expense-repo";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 支出の手入力フォーム（ボトムシート）。確認して保存。 */
export function AddExpenseForm({ visible, onClose }: Props) {
  const categories = useCategories();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [memo, setMemo] = useState("");

  const amountNum = Number(amount.replace(/[^\d]/g, ""));
  const cat = categoryId ?? categories[0]?.id ?? null;
  const valid = amountNum > 0 && !!cat;

  function reset() {
    setAmount("");
    setMemo("");
    setCategoryId(null);
    setDate(format(new Date(), "yyyy-MM-dd"));
  }

  async function submit() {
    if (!valid || !cat) return;
    await addExpense({
      date,
      amount: amountNum,
      categoryId: cat,
      memo: memo.trim() || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="gap-4 rounded-t-3xl border-t border-border bg-surface p-5 pb-10">
          <Text className="text-lg font-bold text-text-primary">支出を追加</Text>

          <View className="gap-1">
            <Text className="text-xs text-text-secondary">金額</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#5c6678"
              className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-2xl font-bold text-text-primary"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs text-text-secondary">カテゴリ</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 py-1"
            >
              {categories.map((c) => {
                const active = cat === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    className={cn(
                      "rounded-full border px-4 py-2",
                      active
                        ? "border-accent bg-accent/15"
                        : "border-border bg-surface-raised",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm",
                        active ? "text-accent" : "text-text-secondary",
                      )}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="gap-1">
            <Text className="text-xs text-text-secondary">日付</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5c6678"
              className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs text-text-secondary">メモ（任意）</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholderTextColor="#5c6678"
              className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary"
            />
          </View>

          <View className="flex-row gap-3 pt-1">
            <Button
              label="キャンセル"
              variant="ghost"
              onPress={onClose}
              className="flex-1"
            />
            <Button
              label="保存"
              onPress={submit}
              disabled={!valid}
              className="flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
