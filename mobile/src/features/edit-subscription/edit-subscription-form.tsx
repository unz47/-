import { useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";

import { addChangeLog } from "@/entities/change-log/model/change-log-repo";
import { updateSubscription } from "@/entities/subscription/model/subscription-repo";
import type { Subscription } from "@/shared/db/types";
import { Button } from "@/shared/ui/button";

interface Props {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
}

/**
 * サブスク編集（プラン/金額/課金日）。金額・プラン変更時は改定ログを記録する（§1）。
 * エンティティ（changelog + subscription）の合成はこの feature 層で行う。
 */
export function EditSubscriptionForm({ visible, onClose, subscription: s }: Props) {
  const [planName, setPlanName] = useState(s.planName);
  const [amount, setAmount] = useState(String(s.amount));
  const [billingDay, setBillingDay] = useState(String(s.billingDay));

  const amountNum = Number(amount.replace(/[^\d]/g, ""));
  const dayNum = Math.min(
    31,
    Math.max(1, Number(billingDay.replace(/[^\d]/g, "")) || 1),
  );
  const valid = amountNum > 0 && planName.trim().length > 0;

  async function submit() {
    if (!valid) return;
    const plan = planName.trim();
    if (amountNum !== s.amount) {
      await addChangeLog({
        subscriptionId: s.id,
        field: "amount",
        oldValue: s.amount,
        newValue: amountNum,
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
      amount: amountNum,
      billingDay: dayNum,
    });
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
          <Text className="text-lg font-bold text-text-primary">
            {s.serviceName} を編集
          </Text>

          <View className="gap-1">
            <Text className="text-xs text-text-secondary">プラン</Text>
            <TextInput
              value={planName}
              onChangeText={setPlanName}
              placeholderTextColor="#5c6678"
              className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary"
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-[2] gap-1">
              <Text className="text-xs text-text-secondary">金額</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholderTextColor="#5c6678"
                className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-lg font-bold text-text-primary"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-xs text-text-secondary">課金日</Text>
              <TextInput
                value={billingDay}
                onChangeText={setBillingDay}
                keyboardType="number-pad"
                className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary"
              />
            </View>
          </View>

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
        </View>
      </View>
    </Modal>
  );
}
