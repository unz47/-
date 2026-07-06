import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useCategories } from "@/entities/category/model/use-categories";
import {
  addExpense,
  updateExpense,
} from "@/entities/expense/model/expense-repo";
import type { Expense } from "@/shared/db/types";
import { merchantKey, type ReceiptPrefill } from "@/shared/ocr";
import { hapticSuccess } from "@/shared/lib/haptics";
import { AmountInput } from "@/shared/ui/amount-input";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { DateField } from "@/shared/ui/date-field";
import { Sheet } from "@/shared/ui/sheet";
import { TextField } from "@/shared/ui/text-field";
import { useThemeColors } from "@/shared/config/theme";

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
  const colors = useThemeColors();
  const [amount, setAmount] = useState<number | null>(
    () => editing?.amount ?? prefill?.amount ?? null,
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.categoryId ?? null,
  );
  const [date, setDate] = useState(
    () => editing?.date ?? prefill?.date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [memo, setMemo] = useState(editing?.memo ?? prefill?.memo ?? "");
  // 店名は OCR 由来だけでなく手入力もできる（店別インサイトの母数を増やす）。
  const [merchant, setMerchant] = useState(
    editing?.merchant ?? prefill?.merchant ?? "",
  );

  const cat = categoryId ?? categories[0]?.id ?? null;
  const valid = amount != null && amount > 0 && !!cat;

  async function submit() {
    if (!valid || !cat || amount == null) return;
    const merchantName = merchant.trim() || undefined;
    if (editing) {
      await updateExpense({
        id: editing.id,
        date,
        amount,
        categoryId: cat,
        memo: memo.trim() || undefined,
        merchant: merchantName,
        merchantKey: merchantKey(merchantName),
      });
    } else {
      await addExpense({
        date,
        amount,
        categoryId: cat,
        memo: memo.trim() || undefined,
        // 店名（OCR or 手入力）は名寄せキーと一緒に保存（店別集計用）。
        merchant: merchantName,
        merchantKey: merchantKey(merchantName),
        occurredAt: prefill?.occurredAt,
      });
    }
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      scrollable
      accessibilityLabel={editing ? "支出を編集" : "支出を追加"}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-text-primary">
          {editing ? "支出を編集" : prefill ? "レシートから追加" : "支出を追加"}
        </Text>
        {onRescan && (
          <Pressable
            onPress={onRescan}
            accessibilityRole="button"
            accessibilityLabel="撮り直し"
            className="flex-row items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 active:opacity-70"
          >
            <Ionicons
              name="camera-reverse-outline"
              size={16}
              color={colors.accent}
            />
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

      <AmountInput value={amount} onChange={setAmount} />

      <View className="gap-1">
        <Text className="text-xs text-text-secondary">カテゴリ</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 py-1"
        >
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={cat === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </ScrollView>
      </View>

      <DateField value={date} onChange={setDate} />

      <TextField
        label="店名（任意）"
        value={merchant}
        onChangeText={setMerchant}
        placeholder="例: セブンイレブン"
      />

      {prefill && (
        <View className="gap-1">
          <Text className="text-xs text-text-secondary">
            レシート読み取り結果
          </Text>
          <View className="gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-xs text-text-muted">店名</Text>
              <View className="flex-1 flex-row items-center justify-end gap-1.5">
                <Text className="text-sm text-text-primary" numberOfLines={1}>
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

      <TextField label="メモ（任意）" value={memo} onChangeText={setMemo} />

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
    </Sheet>
  );
}
