import { getMonth, parseISO } from "date-fns";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { addChangeLog } from "@/entities/change-log/model/change-log-repo";
import { updateSubscription } from "@/entities/subscription/model/subscription-repo";
import type { Subscription } from "@/shared/db/types";
import { hapticSuccess } from "@/shared/lib/haptics";
import { AmountInput } from "@/shared/ui/amount-input";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Sheet } from "@/shared/ui/sheet";
import { TextField } from "@/shared/ui/text-field";

interface Props {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * サブスク編集（プラン/金額/課金日/年額の請求月/メモ）。金額・プラン変更時は改定ログを記録する（§1）。
 * エンティティ（changelog + subscription）の合成はこの feature 層で行う。
 */
export function EditSubscriptionForm({ visible, onClose, subscription: s }: Props) {
  const [planName, setPlanName] = useState(s.planName);
  const [amount, setAmount] = useState<number | null>(s.amount);
  const [billingDay, setBillingDay] = useState(String(s.billingDay));
  const [billingMonth, setBillingMonth] = useState(
    () => s.billingMonth ?? getMonth(parseISO(s.startedAt)) + 1,
  );
  const [memo, setMemo] = useState(s.memo ?? "");
  const yearly = s.billingCycle === "yearly";

  const dayNum = Math.min(
    31,
    Math.max(1, Number(billingDay.replace(/[^\d]/g, "")) || 1),
  );
  const valid = amount != null && amount > 0 && planName.trim().length > 0;

  async function submit() {
    if (!valid || amount == null) return;
    const plan = planName.trim();
    if (amount !== s.amount) {
      await addChangeLog({
        subscriptionId: s.id,
        field: "amount",
        oldValue: s.amount,
        newValue: amount,
      });
    }
    if (plan !== s.planName) {
      await addChangeLog({
        subscriptionId: s.id,
        field: "planName",
        oldValue: s.planName,
        newValue: plan,
      });
    }
    await updateSubscription({
      id: s.id,
      planName: plan,
      amount,
      billingDay: dayNum,
      billingMonth: yearly ? billingMonth : undefined,
      memo,
    });
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={`${s.serviceName} を編集`}
    >
      <Text className="text-lg font-bold text-text-primary">
        {s.serviceName} を編集
      </Text>

      <TextField label="プラン" value={planName} onChangeText={setPlanName} />

      <View className="flex-row gap-3">
        <View className="flex-[2]">
          <AmountInput size="md" value={amount} onChange={setAmount} />
        </View>
        <View className="flex-1">
          <TextField
            label="課金日"
            value={billingDay}
            onChangeText={setBillingDay}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {yearly && (
        <View className="gap-1">
          <Text className="text-xs text-text-secondary">請求月（年額）</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-1"
          >
            {MONTHS.map((m) => (
              <Chip
                key={m}
                label={`${m}月`}
                active={billingMonth === m}
                onPress={() => setBillingMonth(m)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <TextField
        label="メモ（任意）"
        value={memo}
        onChangeText={setMemo}
        placeholder="例: 楽天カード払い / 家族で共有"
      />

      <Text className="text-xs text-text-muted">
        金額やプランを変えると改定ログに記録されます（増額=赤 / 減額=緑）。
      </Text>

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
