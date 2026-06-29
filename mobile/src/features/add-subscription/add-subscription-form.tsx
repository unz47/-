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

import { addSubscription } from "@/entities/subscription/model/subscription-repo";
import { SUBSCRIPTION_PRESETS, type PresetPlan } from "@/shared/config/presets";
import { SUBSCRIPTION_CATEGORY_ID } from "@/shared/db/seed";
import type { BillingCycle } from "@/shared/db/types";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

const PRESETS = SUBSCRIPTION_PRESETS.filter((p) => p.id !== "custom");

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** サブスク登録（プリセット or 手入力）。プリセット価格は固定初期値・上書き前提（§10）。 */
export function AddSubscriptionForm({ visible, onClose }: Props) {
  const [presetId, setPresetId] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [billingDay, setBillingDay] = useState("1");
  const [startedAt, setStartedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  const preset = PRESETS.find((p) => p.id === presetId);
  const amountNum = Number(amount.replace(/[^\d]/g, ""));
  const dayNum = Math.min(
    31,
    Math.max(1, Number(billingDay.replace(/[^\d]/g, "")) || 1),
  );
  const name = manual ? serviceName.trim() : (preset?.service ?? "");
  const valid = name.length > 0 && amountNum > 0;

  function pickPreset(id: string) {
    setManual(false);
    setPresetId(id);
    const p = PRESETS.find((x) => x.id === id);
    const first = p?.plans[0];
    if (first) {
      setPlanName(first.name);
      setAmount(String(first.amount));
      setCycle(first.cycle);
    }
  }
  function pickPlan(plan: PresetPlan) {
    setPlanName(plan.name);
    setAmount(String(plan.amount));
    setCycle(plan.cycle);
  }
  function reset() {
    setPresetId(null);
    setManual(false);
    setServiceName("");
    setPlanName("");
    setAmount("");
    setCycle("monthly");
    setBillingDay("1");
    setStartedAt(format(new Date(), "yyyy-MM-dd"));
  }
  async function submit() {
    if (!valid) return;
    await addSubscription({
      serviceName: name,
      planName: planName.trim() || "標準",
      amount: amountNum,
      billingCycle: cycle,
      categoryId: SUBSCRIPTION_CATEGORY_ID,
      billingDay: dayNum,
      startedAt,
      presetId: preset?.id,
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
        <ScrollView
          className="max-h-[88%] rounded-t-3xl border-t border-border bg-surface"
          contentContainerClassName="gap-4 p-5 pb-10"
        >
          <Text className="text-lg font-bold text-text-primary">
            サブスクを追加
          </Text>

          <View className="gap-1">
            <Text className="text-xs text-text-secondary">サービス</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 py-1"
            >
              <Pressable
                onPress={() => {
                  setManual(true);
                  setPresetId(null);
                }}
                className={cn(
                  "rounded-full border px-4 py-2",
                  manual
                    ? "border-accent bg-accent/15"
                    : "border-border bg-surface-raised",
                )}
              >
                <Text
                  className={cn(
                    "text-sm",
                    manual ? "text-accent" : "text-text-secondary",
                  )}
                >
                  ＋ 手入力
                </Text>
              </Pressable>
              {PRESETS.map((p) => {
                const active = !manual && presetId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => pickPreset(p.id)}
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
                      {p.service}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {manual && (
            <View className="gap-1">
              <Text className="text-xs text-text-secondary">サービス名</Text>
              <TextInput
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="例: Netflix"
                placeholderTextColor="#5c6678"
                className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary"
              />
            </View>
          )}

          {preset && preset.plans.length > 0 && (
            <View className="gap-1">
              <Text className="text-xs text-text-secondary">プラン</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 py-1"
              >
                {preset.plans.map((pl) => {
                  const active = planName === pl.name;
                  return (
                    <Pressable
                      key={pl.name}
                      onPress={() => pickPlan(pl)}
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
                        {pl.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-xs text-text-secondary">金額</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#5c6678"
                className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-lg font-bold text-text-primary"
              />
            </View>
            <View className="gap-1">
              <Text className="text-xs text-text-secondary">周期</Text>
              <View className="flex-row overflow-hidden rounded-xl border border-border">
                {(["monthly", "yearly"] as const).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCycle(c)}
                    className={cn(
                      "px-4 py-3",
                      cycle === c ? "bg-accent" : "bg-surface-raised",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        cycle === c ? "text-on-accent" : "text-text-secondary",
                      )}
                    >
                      {c === "monthly" ? "月" : "年"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-xs text-text-secondary">課金日</Text>
              <TextInput
                value={billingDay}
                onChangeText={setBillingDay}
                keyboardType="number-pad"
                className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary"
              />
            </View>
            <View className="flex-[2] gap-1">
              <Text className="text-xs text-text-secondary">開始日</Text>
              <TextInput
                value={startedAt}
                onChangeText={setStartedAt}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#5c6678"
                className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary"
              />
            </View>
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
        </ScrollView>
      </View>
    </Modal>
  );
}
