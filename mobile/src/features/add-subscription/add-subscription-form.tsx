import { format } from "date-fns";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { addSubscription } from "@/entities/subscription/model/subscription-repo";
import { SUBSCRIPTION_PRESETS, type PresetPlan } from "@/shared/config/presets";
import { SUBSCRIPTION_CATEGORY_ID } from "@/shared/db/seed";
import type { BillingCycle } from "@/shared/db/types";
import { cn } from "@/shared/lib/cn";
import { hapticSuccess } from "@/shared/lib/haptics";
import { AmountInput } from "@/shared/ui/amount-input";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { DateField } from "@/shared/ui/date-field";
import { ServiceLogo } from "@/shared/ui/service-logo";
import { Sheet } from "@/shared/ui/sheet";
import { TextField } from "@/shared/ui/text-field";

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
  const [amount, setAmount] = useState<number | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [billingDay, setBillingDay] = useState("1");
  const [startedAt, setStartedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  const preset = PRESETS.find((p) => p.id === presetId);
  const dayNum = Math.min(
    31,
    Math.max(1, Number(billingDay.replace(/[^\d]/g, "")) || 1),
  );
  const name = manual ? serviceName.trim() : (preset?.service ?? "");
  const valid = name.length > 0 && amount != null && amount > 0;

  function pickPreset(id: string) {
    setManual(false);
    setPresetId(id);
    const p = PRESETS.find((x) => x.id === id);
    const first = p?.plans[0];
    if (first) {
      setPlanName(first.name);
      setAmount(first.amount);
      setCycle(first.cycle);
    }
  }
  function pickPlan(plan: PresetPlan) {
    setPlanName(plan.name);
    setAmount(plan.amount);
    setCycle(plan.cycle);
  }
  function reset() {
    setPresetId(null);
    setManual(false);
    setServiceName("");
    setPlanName("");
    setAmount(null);
    setCycle("monthly");
    setBillingDay("1");
    setStartedAt(format(new Date(), "yyyy-MM-dd"));
  }
  async function submit() {
    if (!valid || amount == null) return;
    await addSubscription({
      serviceName: name,
      planName: planName.trim() || "標準",
      amount,
      billingCycle: cycle,
      categoryId: SUBSCRIPTION_CATEGORY_ID,
      billingDay: dayNum,
      startedAt,
      presetId: preset?.id,
    });
    hapticSuccess();
    reset();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      scrollable
      accessibilityLabel="サブスクを追加"
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
          <Chip
            label="＋ 手入力"
            active={manual}
            onPress={() => {
              setManual(true);
              setPresetId(null);
            }}
          />
          {PRESETS.map((p) => {
            const active = !manual && presetId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => pickPreset(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={p.service}
                className={cn(
                  "flex-row items-center gap-1.5 rounded-full border px-3 py-2",
                  active
                    ? "border-accent bg-accent/15"
                    : "border-border bg-surface-raised",
                )}
              >
                <ServiceLogo presetId={p.id} serviceName={p.service} size={16} />
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
        <TextField
          label="サービス名"
          value={serviceName}
          onChangeText={setServiceName}
          placeholder="例: Netflix"
        />
      )}

      {preset && preset.plans.length > 0 && (
        <View className="gap-1">
          <Text className="text-xs text-text-secondary">プラン</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-1"
          >
            {preset.plans.map((pl) => (
              <Chip
                key={pl.name}
                label={pl.name}
                active={planName === pl.name}
                onPress={() => pickPlan(pl)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <AmountInput size="md" value={amount} onChange={setAmount} />
        </View>
        <View className="gap-1">
          <Text className="text-xs text-text-secondary">周期</Text>
          <View className="flex-row overflow-hidden rounded-xl border border-border">
            {(["monthly", "yearly"] as const).map((c) => (
              <Pressable
                key={c}
                onPress={() => setCycle(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: cycle === c }}
                accessibilityLabel={c === "monthly" ? "月額" : "年額"}
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
        <View className="flex-1">
          <TextField
            label="課金日"
            value={billingDay}
            onChangeText={setBillingDay}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-[2]" />
      </View>

      <DateField label="開始日" value={startedAt} onChange={setStartedAt} />

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
