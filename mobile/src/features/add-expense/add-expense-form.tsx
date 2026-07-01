import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
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
import {
  addExpense,
  updateExpense,
} from "@/entities/expense/model/expense-repo";
import type { Expense } from "@/shared/db/types";
import type { ReceiptPrefill } from "@/shared/ocr";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 渡すと編集モード（プレフィル＋更新）。未指定なら新規追加。 */
  editing?: Expense;
  /** レシートOCR の素案で新規フォームを埋める（編集モードでは無視）。 */
  prefill?: ReceiptPrefill;
  /** OCR確認時の「撮り直し」。渡されたときだけヘッダにボタンを出す。 */
  onRescan?: () => void;
}

/** 支出の手入力フォーム（ボトムシート）。新規追加 / 編集 / OCRプレフィルに対応。確認して保存。 */
export function AddExpenseForm({
  visible,
  onClose,
  editing,
  prefill,
  onRescan,
}: Props) {
  const categories = useCategories();
  const [amount, setAmount] = useState(() => {
    const v = editing?.amount ?? prefill?.amount;
    return v != null ? String(v) : "";
  });
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.categoryId ?? null,
  );
  const [date, setDate] = useState(
    () => editing?.date ?? prefill?.date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [memo, setMemo] = useState(editing?.memo ?? prefill?.memo ?? "");

  const amountNum = Number(amount.replace(/[^\d]/g, ""));
  const cat = categoryId ?? categories[0]?.id ?? null;
  const valid = amountNum > 0 && !!cat;

  async function submit() {
    if (!valid || !cat) return;
    if (editing) {
      await updateExpense({
        id: editing.id,
        date,
        amount: amountNum,
        categoryId: cat,
        memo: memo.trim() || undefined,
      });
    } else {
      await addExpense({
        date,
        amount: amountNum,
        categoryId: cat,
        memo: memo.trim() || undefined,
        // OCR 由来の店名情報があれば一緒に保存（名寄せ集計用）。
        merchant: prefill?.merchant,
        merchantKey: prefill?.merchantKey,
        occurredAt: prefill?.occurredAt,
      });
    }
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
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text-primary">
              {editing ? "支出を編集" : prefill ? "レシートから追加" : "支出を追加"}
            </Text>
            {onRescan && (
              <Pressable
                onPress={onRescan}
                className="flex-row items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 active:opacity-70"
              >
                <Ionicons name="camera-reverse-outline" size={16} color="#2dd4bf" />
                <Text className="text-xs text-accent">撮り直し</Text>
              </Pressable>
            )}
          </View>
          {prefill &&
            (prefill.uncertain.amount ||
              prefill.uncertain.date ||
              prefill.uncertain.merchant) && (
              <Text className="text-xs text-warning">
                ⚠ 読み取りに不確かな項目があります。確認して保存してください。
              </Text>
            )}

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

          {prefill && (
            <View className="gap-1">
              <Text className="text-xs text-text-secondary">
                レシート読み取り結果
              </Text>
              <View className="gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-xs text-text-muted">店名</Text>
                  <View className="flex-1 flex-row items-center justify-end gap-1.5">
                    <Text
                      className="text-sm text-text-primary"
                      numberOfLines={1}
                    >
                      {prefill.merchant ?? "読み取れず"}
                    </Text>
                    {prefill.merchant && prefill.uncertain.merchant && (
                      <Text className="text-xs text-warning">要確認</Text>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-xs text-text-muted">購入時刻</Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm text-text-primary">
                      {prefill.occurredAt?.includes("T")
                        ? format(parseISO(prefill.occurredAt), "H:mm")
                        : "読み取れず"}
                    </Text>
                    {prefill.occurredAt?.includes("T") &&
                      prefill.uncertain.date && (
                        <Text className="text-xs text-warning">要確認</Text>
                      )}
                  </View>
                </View>
                <Text className="text-xs text-text-muted">
                  購入時刻はダッシュボードの「時間帯別」集計に使われます。
                </Text>
              </View>
            </View>
          )}

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
