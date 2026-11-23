import { addDays, format, getDate, getMonth, parseISO } from "date-fns";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";

import { addSubscription } from "@/entities/subscription/model/subscription-repo";
import {
  PRESET_CATEGORIES,
  PRESET_CATEGORY_LABELS,
  SUBSCRIPTION_PRESETS,
  type PresetCategory,
  type PresetPlan,
} from "@/shared/config/presets";
import { useThemeColors } from "@/shared/config/theme";
import { SUBSCRIPTION_CATEGORY_ID } from "@/shared/db/seed";
import type { BillingCycle } from "@/shared/db/types";
import { cn } from "@/shared/lib/cn";
import { maybeRequestReviewAfterSave } from "@/features/store-review/maybe-request-review";
import { hapticSuccess } from "@/shared/lib/haptics";
import { AmountInput } from "@/shared/ui/amount-input";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { DateField } from "@/shared/ui/date-field";
import { ServiceLogo } from "@/shared/ui/service-logo";
import { Sheet } from "@/shared/ui/sheet";
import { TextField } from "@/shared/ui/text-field";

const PRESETS = SUBSCRIPTION_PRESETS;

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** サブスク登録（プリセット or 手入力）。プリセット価格は固定初期値・上書き前提（§10）。 */
export function AddSubscriptionForm({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const [presetId, setPresetId] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [category, setCategory] = useState<PresetCategory>("video");
  const [serviceName, setServiceName] = useState("");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [billingDay, setBillingDay] = useState(() =>
    String(new Date().getDate()),
  );
  // 課金日は開始日（体験ありなら体験終了日）の日に自動で合わせる。手で変えたら追従をやめる。
  const [billingDayTouched, setBillingDayTouched] = useState(false);
  const [startedAt, setStartedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [trial, setTrial] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState(() =>
    format(addDays(new Date(), 7), "yyyy-MM-dd"),
  );
  const [memo, setMemo] = useState("");

  const preset = PRESETS.find((p) => p.id === presetId);
  const dayNum = Math.min(
    31,
    Math.max(1, Number(billingDay.replace(/[^\d]/g, "")) || 1),
  );
  // 無料体験ありは「体験終了日＝初回請求日」を契約開始とする（体験期間は月次集計に乗らない §4）。
  const firstChargeAt = trial ? trialEndsAt : startedAt;
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
  function syncBillingDay(date: string) {
    if (!billingDayTouched) setBillingDay(String(getDate(parseISO(date))));
  }
  function pickStartedAt(date: string) {
    setStartedAt(date);
    if (!trial) syncBillingDay(date);
  }
  function pickTrialEndsAt(date: string) {
    setTrialEndsAt(date);
    if (trial) syncBillingDay(date);
  }
  function toggleTrial(on: boolean) {
    setTrial(on);
    syncBillingDay(on ? trialEndsAt : startedAt);
  }
  function pickPlan(plan: PresetPlan) {
    setPlanName(plan.name);
    setAmount(plan.amount);
    setCycle(plan.cycle);
  }
  function reset() {
    setPresetId(null);
    setManual(false);
    setCategory("video");
    setServiceName("");
    setPlanName("");
    setAmount(null);
    setCycle("monthly");
    setBillingDay(String(new Date().getDate()));
    setBillingDayTouched(false);
    setStartedAt(format(new Date(), "yyyy-MM-dd"));
    setTrial(false);
    setTrialEndsAt(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setMemo("");
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
      // 年額の請求月は初回請求日の月で確定させておく（後から編集で変えられる）
      billingMonth:
        cycle === "yearly" ? getMonth(parseISO(firstChargeAt)) + 1 : undefined,
      startedAt: firstChargeAt,
      presetId: preset?.id,
      memo,
      trialEndsAt: trial ? trialEndsAt : undefined,
    });
    hapticSuccess();
    reset();
    onClose();
    maybeRequestReviewAfterSave();
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
        {/* 1段目: 手入力＋カテゴリで絞り込み、2段目: そのカテゴリのサービス */}
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
          {PRESET_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={PRESET_CATEGORY_LABELS[c]}
              active={!manual && category === c}
              onPress={() => {
                setManual(false);
                setCategory(c);
              }}
            />
          ))}
        </ScrollView>
        {!manual && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-1"
          >
            {PRESETS.filter((p) => p.category === category).map((p) => {
              const active = presetId === p.id;
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
                  <ServiceLogo
                    presetId={p.id}
                    serviceName={p.service}
                    size={16}
                  />
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
        )}
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
            onChangeText={(t) => {
              setBillingDayTouched(true);
              setBillingDay(t);
            }}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-[2] justify-end pb-3">
          <Text className="text-xs text-text-muted">
            {cycle === "yearly"
              ? `毎年${getMonth(parseISO(firstChargeAt)) + 1}月${dayNum}日に請求`
              : `毎月${dayNum}日に請求（月末を超える日は月末）`}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm text-text-primary">無料体験あり</Text>
          <Text className="text-xs text-text-muted">
            体験が終わる日から課金として数え、終了前に通知できます。
          </Text>
        </View>
        <Switch
          value={trial}
          onValueChange={toggleTrial}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.surfaceRaised}
          accessibilityLabel="無料体験あり"
        />
      </View>

      {trial ? (
        <DateField
          label="体験終了日（初回請求日）"
          value={trialEndsAt}
          onChange={pickTrialEndsAt}
        />
      ) : (
        <DateField label="開始日" value={startedAt} onChange={pickStartedAt} />
      )}

      <TextField
        label="メモ（任意）"
        value={memo}
        onChangeText={setMemo}
        placeholder="例: 楽天カード払い / 家族で共有"
      />

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
