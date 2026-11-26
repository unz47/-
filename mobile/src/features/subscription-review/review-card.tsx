import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { VERDICT_TONE } from "@/entities/sub-review/ui/verdict-badge";
import { useThemeColors } from "@/shared/config/theme";
import type {
  ReviewVerdict,
  Subscription,
  SubscriptionReview,
  UsageFrequency,
} from "@/shared/db/types";
import { monthlyEquivalent } from "@/shared/lib/aggregate";
import {
  daysUntil,
  formatDaysLeft,
  lifetimePaid,
  monthsSubscribed,
  nextBillingDate,
  yearlyCost,
} from "@/shared/lib/billing";
import { cn } from "@/shared/lib/cn";
import { formatShortDate } from "@/shared/lib/date";
import { hapticLight } from "@/shared/lib/haptics";
import { formatYen } from "@/shared/lib/money";
import {
  USAGE_OPTIONS,
  usageInsight,
  VERDICT_LABEL,
  type ReasonKind,
  type ReviewReason,
} from "@/shared/lib/sub-review";
import { ServiceLogo } from "@/shared/ui/service-logo";

interface Props {
  subscription: Subscription;
  reason: ReviewReason;
  previous?: SubscriptionReview;
  usage?: UsageFrequency;
  /** アクティブ全体の月額換算合計（このサブスクの占める割合の表示用） */
  monthlyTotal: number;
  onUsage: (u: UsageFrequency) => void;
  onDecide: (v: ReviewVerdict) => void;
}

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 900;
const SPRING = { damping: 20, stiffness: 240 };

// 理由チップの色。値上げだけは danger（赤=値上げ専用シグナル §3）、体験終了は info。
const REASON_TONE: Partial<Record<ReasonKind, { bg: string; fg: string }>> = {
  raised: { bg: "bg-danger/15", fg: "text-danger" },
  trial: { bg: "bg-info/15", fg: "text-info" },
};

/** "11ヶ月" / "1年3ヶ月" */
function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}ヶ月`;
  return m === 0 ? `${y}年` : `${y}年${m}ヶ月`;
}

/**
 * 見直しカード。右スワイプ=必要 / 左=解約候補 / 上=迷う（下のボタンでも同じ）。
 * カードは subscription.id で key を振って使う（判定ごとに作り直して位置をリセット）。
 */
export function ReviewCard({
  subscription: s,
  reason,
  previous,
  usage,
  monthlyTotal,
  onUsage,
  onDecide,
}: Props) {
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const today = new Date();
  const next = nextBillingDate(s, today);
  const months = monthsSubscribed(s, today);
  const insight = usage ? usageInsight(s, usage) : null;
  const share = monthlyTotal > 0 ? monthlyEquivalent(s) / monthlyTotal : 0;

  function decide(v: ReviewVerdict) {
    hapticLight();
    onDecide(v);
  }

  /** 判定方向へ飛ばしてから確定する（ボタン操作でも同じ動き）。 */
  function fly(v: ReviewVerdict) {
    const done = (finished?: boolean) => {
      "worklet";
      if (finished) runOnJS(decide)(v);
    };
    if (v === "keep") tx.set(withTiming(width * 1.4, { duration: 220 }, done));
    else if (v === "cancel")
      tx.set(withTiming(-width * 1.4, { duration: 220 }, done));
    else ty.set(withTiming(-height, { duration: 240 }, done));
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onChange((e) => {
      tx.set(e.translationX);
      ty.set(e.translationY);
    })
    .onEnd((e) => {
      const finish = (finished?: boolean, v?: ReviewVerdict) => {
        if (finished && v) runOnJS(decide)(v);
      };
      if (e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY) {
        tx.set(
          withTiming(width * 1.4, { duration: 200 }, (f) => finish(f, "keep")),
        );
      } else if (
        e.translationX < -SWIPE_DISTANCE ||
        e.velocityX < -SWIPE_VELOCITY
      ) {
        tx.set(
          withTiming(-width * 1.4, { duration: 200 }, (f) =>
            finish(f, "cancel"),
          ),
        );
      } else if (
        e.translationY < -SWIPE_DISTANCE ||
        e.velocityY < -SWIPE_VELOCITY
      ) {
        ty.set(
          withTiming(-height, { duration: 220 }, (f) => finish(f, "maybe")),
        );
      } else {
        tx.set(withSpring(0, SPRING));
        ty.set(withSpring(0, SPRING));
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: Math.min(ty.get(), 0) + Math.max(ty.get(), 0) * 0.2 },
      {
        rotate: `${interpolate(tx.get(), [-width, 0, width], [-14, 0, 14])}deg`,
      },
    ],
  }));
  const keepStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.get(), [20, SWIPE_DISTANCE], [0, 1], "clamp"),
  }));
  const cancelStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.get(), [-SWIPE_DISTANCE, -20], [1, 0], "clamp"),
  }));
  const maybeStamp = useAnimatedStyle(() => ({
    opacity: interpolate(ty.get(), [-SWIPE_DISTANCE, -20], [1, 0], "clamp"),
  }));

  return (
    <View className="flex-1 justify-center gap-5">
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>
          <View
            className="gap-5 rounded-3xl border border-border bg-surface p-5"
            accessible={false}
          >
            <View className="flex-row items-center gap-3">
              <ServiceLogo
                presetId={s.presetId}
                serviceName={s.serviceName}
                size={40}
              />
              <View className="flex-1">
                <Text
                  className="text-xl font-bold text-text-primary"
                  numberOfLines={1}
                >
                  {s.serviceName}
                </Text>
                <Text className="text-xs text-text-muted" numberOfLines={1}>
                  {s.planName}
                </Text>
              </View>
            </View>

            {reason.kind !== "none" && (
              <View
                className={cn(
                  "self-start rounded-full px-3 py-1",
                  REASON_TONE[reason.kind]?.bg ?? "bg-surface-raised",
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    REASON_TONE[reason.kind]?.fg ?? "text-text-secondary",
                  )}
                >
                  {reason.text}
                </Text>
              </View>
            )}

            <View className="gap-1">
              <Text
                className="text-4xl font-bold text-text-primary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatYen(monthlyEquivalent(s))}
                <Text className="text-base text-text-secondary"> /月</Text>
              </Text>
              <Text
                className="text-sm text-text-secondary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                年 {formatYen(yearlyCost(s))}
                {months > 0
                  ? ` ・ 契約${formatMonths(months)} ・ 累計 約${formatYen(
                      lifetimePaid(s, today),
                    )}`
                  : ""}
              </Text>
              {next && (
                <Text className="text-xs text-text-muted">
                  次回請求 {formatShortDate(next)}（
                  {formatDaysLeft(daysUntil(next, today))}）
                  {previous
                    ? ` ・ 前回の判定「${VERDICT_LABEL[previous.verdict]}」`
                    : ""}
                </Text>
              )}
            </View>

            {s.memo ? (
              <Text className="text-xs text-text-secondary" numberOfLines={2}>
                メモ: {s.memo}
              </Text>
            ) : null}

            {share > 0 && (
              <View className="gap-1">
                <View className="h-2 overflow-hidden rounded-full bg-surface-raised">
                  <View
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${Math.round(share * 100)}%` }}
                  />
                </View>
                <Text className="text-xs text-text-muted">
                  サブスク全体の {Math.round(share * 100)}%
                </Text>
              </View>
            )}

            <View className="gap-2">
              <Text className="text-sm font-semibold text-text-secondary">
                最近どれくらい使ってる？
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {USAGE_OPTIONS.map((o) => {
                  const on = usage === o.key;
                  return (
                    <Pressable
                      key={o.key}
                      onPress={() => {
                        hapticLight();
                        onUsage(o.key);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={o.label}
                      className={cn(
                        "rounded-full border px-3 py-2",
                        on
                          ? "border-accent bg-accent/15"
                          : "border-border bg-surface-raised",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm",
                          on ? "text-accent" : "text-text-secondary",
                        )}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {insight && (
                <Text
                  className={cn(
                    "text-sm font-semibold",
                    insight.level === "poor"
                      ? "text-warning"
                      : insight.level === "good"
                        ? "text-accent"
                        : "text-text-secondary",
                  )}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {insight.text}
                  {insight.level === "poor" ? " ・ 割高かも" : ""}
                </Text>
              )}
            </View>
          </View>

          <Stamp
            style={keepStamp}
            verdict="keep"
            className="absolute left-6 top-6 -rotate-12"
          />
          <Stamp
            style={cancelStamp}
            verdict="cancel"
            className="absolute right-6 top-6 rotate-12"
          />
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 top-1/3 items-center"
          >
            <Stamp style={maybeStamp} verdict="maybe" />
          </View>
        </Animated.View>
      </GestureDetector>

      <View className="flex-row items-center justify-center gap-5">
        <ActionButton
          verdict="cancel"
          icon="close"
          size={64}
          color={colors.warning}
          onPress={() => fly("cancel")}
        />
        <ActionButton
          verdict="maybe"
          icon="help"
          size={52}
          color={colors.textSecondary}
          onPress={() => fly("maybe")}
        />
        <ActionButton
          verdict="keep"
          icon="checkmark"
          size={64}
          color={colors.accent}
          onPress={() => fly("keep")}
        />
      </View>
      <Text className="text-center text-[11px] text-text-muted">
        右スワイプで必要 ・ 左で解約候補 ・ 上で迷う
      </Text>
    </View>
  );
}

function Stamp({
  verdict,
  className,
  style,
}: {
  verdict: ReviewVerdict;
  className?: string;
  style: ComponentProps<typeof Animated.View>["style"];
}) {
  const t = VERDICT_TONE[verdict];
  return (
    <Animated.View
      pointerEvents="none"
      style={style}
      className={cn("rounded-xl border-4 px-4 py-1", t.border, className)}
    >
      <Text className={cn("text-2xl font-black", t.fg)}>
        {VERDICT_LABEL[verdict]}
      </Text>
    </Animated.View>
  );
}

function ActionButton({
  verdict,
  icon,
  size,
  color,
  onPress,
}: {
  verdict: ReviewVerdict;
  icon: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  onPress: () => void;
}) {
  const t = VERDICT_TONE[verdict];
  return (
    <View className="items-center gap-1">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={VERDICT_LABEL[verdict]}
        style={{ width: size, height: size }}
        className={cn(
          "items-center justify-center rounded-full border-2 active:opacity-70",
          t.border,
          t.bg,
        )}
      >
        <Ionicons name={icon} size={size * 0.45} color={color} />
      </Pressable>
      <Text className={cn("text-xs font-semibold", t.fg)}>
        {VERDICT_LABEL[verdict]}
      </Text>
    </View>
  );
}
