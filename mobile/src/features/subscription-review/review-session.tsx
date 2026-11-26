import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  addSubscriptionReview,
  deleteSubscriptionReview,
} from "@/entities/sub-review/model/sub-review-repo";
import { cancelSubscription } from "@/entities/subscription/model/subscription-repo";
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
  nextBillingDate,
  toDateStr,
} from "@/shared/lib/billing";
import { cn } from "@/shared/lib/cn";
import { formatShortDate } from "@/shared/lib/date";
import { hapticSuccess, hapticWarning } from "@/shared/lib/haptics";
import { formatYen } from "@/shared/lib/money";
import { summarizeReviews, type ReviewReason } from "@/shared/lib/sub-review";
import { Button } from "@/shared/ui/button";
import { ServiceLogo } from "@/shared/ui/service-logo";
import { ReviewCard } from "./review-card";

export interface ReviewItem {
  subscription: Subscription;
  reason: ReviewReason;
  previous?: SubscriptionReview;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 開始時点のスナップショット（見直し中に理由が変わってカードが入れ替わらないように）。 */
  items: ReviewItem[];
  /** 結果画面用のライブデータ（解約の記録がすぐ反映されるように）。 */
  active: Subscription[];
  latest: Map<string, SubscriptionReview>;
}

interface Decision {
  subscriptionId: string;
  verdict: ReviewVerdict;
  reviewId: string;
}

// 次の請求がこの日数以内の解約候補は「急ぎ」として強調する。
const URGENT_DAYS = 7;

/** サブスク見直しモード（全画面）。1枚ずつ取捨選択 → 結果（節約見込み・解約の記録）。 */
export function ReviewSession({
  visible,
  onClose,
  items,
  active,
  latest,
}: Props) {
  const colors = useThemeColors();
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [usages, setUsages] = useState<Record<string, UsageFrequency>>({});
  const [busy, setBusy] = useState(false);

  const done = index >= items.length;
  const monthlyTotal = active.reduce((a, s) => a + monthlyEquivalent(s), 0);
  const current = items[index];

  async function decide(verdict: ReviewVerdict) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const id = current.subscription.id;
      const reviewId = await addSubscriptionReview({
        subscriptionId: id,
        verdict,
        usage: usages[id] ?? current.previous?.usage,
      });
      setDecisions((d) => [...d, { subscriptionId: id, verdict, reviewId }]);
      setIndex((i) => i + 1);
      if (index + 1 >= items.length) hapticSuccess();
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    const last = decisions.at(-1);
    if (!last || busy) return;
    setBusy(true);
    try {
      await deleteSubscriptionReview(last.reviewId);
      setDecisions((d) => d.slice(0, -1));
      setIndex((i) => Math.max(0, i - 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* Modal は別ウィンドウなので、セーフエリアを取り直す */}
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView className="flex-1 bg-base" edges={["top", "bottom"]}>
            <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="見直しを終える"
                hitSlop={12}
                className="active:opacity-60"
              >
                <Ionicons name="close" size={26} color={colors.textSecondary} />
              </Pressable>
              <Text
                className="text-sm font-semibold text-text-secondary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {done ? "見直し完了" : `${index + 1} / ${items.length}`}
              </Text>
              <Pressable
                onPress={undo}
                disabled={decisions.length === 0 || busy}
                accessibilityRole="button"
                accessibilityLabel="1つ戻る"
                hitSlop={12}
                className={cn(
                  "flex-row items-center gap-1 active:opacity-60",
                  decisions.length === 0 && "opacity-30",
                )}
              >
                <Ionicons
                  name="arrow-undo"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text className="text-sm text-text-secondary">戻す</Text>
              </Pressable>
            </View>

            <View className="mx-5 h-1 overflow-hidden rounded-full bg-surface-raised">
              <View
                className="h-1 rounded-full bg-accent"
                style={{
                  width: `${items.length ? (Math.min(index, items.length) / items.length) * 100 : 0}%`,
                }}
              />
            </View>

            {done ? (
              <ReviewResult
                decisions={decisions}
                active={active}
                latest={latest}
                onClose={onClose}
              />
            ) : (
              <View className="flex-1 px-5 pb-4 pt-4">
                <ReviewCard
                  key={current.subscription.id}
                  subscription={current.subscription}
                  reason={current.reason}
                  previous={current.previous}
                  usage={
                    usages[current.subscription.id] ?? current.previous?.usage
                  }
                  monthlyTotal={monthlyTotal}
                  onUsage={(u) =>
                    setUsages((m) => ({ ...m, [current.subscription.id]: u }))
                  }
                  onDecide={decide}
                />
              </View>
            )}
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}

function ReviewResult({
  decisions,
  active,
  latest,
  onClose,
}: {
  decisions: Decision[];
  active: Subscription[];
  latest: Map<string, SubscriptionReview>;
  onClose: () => void;
}) {
  const [recorded, setRecorded] = useState<Subscription[]>([]);
  const today = new Date();
  const summary = summarizeReviews(active, latest);
  const count = (v: ReviewVerdict) =>
    decisions.filter((d) => d.verdict === v).length;
  const savedMonthly = recorded.reduce((a, s) => a + monthlyEquivalent(s), 0);

  // 次の請求が近い順（急ぎのものから解約手続きできるように）
  const candidates = summary.cancel.subs
    .map((s) => ({ s, next: nextBillingDate(s, today) }))
    .sort((a, b) => (a.next ?? "9999").localeCompare(b.next ?? "9999"));

  function recordCancel(s: Subscription) {
    hapticWarning();
    Alert.alert(
      `${s.serviceName} の解約を記録`,
      "サービス側での解約手続きは済みましたか？\nアプリ内の記録だけでは解約されません。",
      [
        { text: "まだ", style: "cancel" },
        {
          text: "解約を記録",
          onPress: async () => {
            await cancelSubscription(s.id, toDateStr(new Date()));
            setRecorded((r) => [...r, s]);
            hapticSuccess();
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-6">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-text-primary">見直し完了</Text>
        <Text className="text-sm text-text-secondary">
          {decisions.length}件を見直しました（必要 {count("keep")} ・ 迷う{" "}
          {count("maybe")} ・ 解約候補 {count("cancel")}）
        </Text>
      </View>

      {summary.cancel.subs.length > 0 ? (
        <View className="gap-1 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-sm text-text-secondary">
            解約候補をすべてやめると
          </Text>
          {/* 緑=減額のシグナル（§3）。浮く金額の見込み。 */}
          <Text
            className="text-3xl font-bold text-success"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            月 {formatYen(summary.cancel.monthly)}
          </Text>
          <Text
            className="text-sm text-text-secondary"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            年 {formatYen(summary.cancel.yearly)} ・ 5年で{" "}
            {formatYen(summary.cancel.yearly * 5)} 浮きます
          </Text>
        </View>
      ) : (
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-sm text-text-secondary">
            解約候補はありません。いまのサブスクはどれも必要と判断しました。
          </Text>
        </View>
      )}

      {savedMonthly > 0 && (
        <Text
          className="text-sm font-semibold text-success"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {recorded.length}件の解約を記録しました（月 {formatYen(savedMonthly)}{" "}
          節約）
        </Text>
      )}

      {candidates.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-text-secondary">
            解約候補（次の請求が近い順）
          </Text>
          <Text className="text-xs text-text-muted">
            各サービスで解約の手続きをしてから「解約を記録」を押してください。
          </Text>
          {candidates.map(({ s, next }) => {
            const left = next ? daysUntil(next, today) : null;
            const urgent = left != null && left <= URGENT_DAYS;
            return (
              <View
                key={s.id}
                className="gap-2 rounded-2xl border border-border bg-surface p-4"
              >
                <View className="flex-row items-center gap-3">
                  <ServiceLogo
                    presetId={s.presetId}
                    serviceName={s.serviceName}
                    size={24}
                  />
                  <View className="flex-1">
                    <Text
                      className="text-base text-text-primary"
                      numberOfLines={1}
                    >
                      {s.serviceName}
                    </Text>
                    {next && (
                      <Text
                        className={cn(
                          "text-xs",
                          urgent
                            ? "font-semibold text-warning"
                            : "text-text-muted",
                        )}
                      >
                        次の請求 {formatShortDate(next)}（
                        {formatDaysLeft(left ?? 0)}）
                        {urgent ? " ・ それまでに解約を" : ""}
                      </Text>
                    )}
                  </View>
                  <Text
                    className="font-semibold text-text-primary"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatYen(monthlyEquivalent(s))}/月
                  </Text>
                </View>
                {s.memo ? (
                  <Text
                    className="text-xs text-text-secondary"
                    numberOfLines={3}
                  >
                    メモ: {s.memo}
                  </Text>
                ) : null}
                <Button
                  label="解約を記録"
                  variant="ghost"
                  onPress={() => recordCancel(s)}
                />
              </View>
            );
          })}
        </View>
      )}

      {summary.maybe.subs.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-text-secondary">
            迷っているもの（次の見直しで先頭に出ます）
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {summary.maybe.subs.map((s) => (
              <View
                key={s.id}
                className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"
              >
                <ServiceLogo
                  presetId={s.presetId}
                  serviceName={s.serviceName}
                  size={14}
                />
                <Text className="text-xs text-text-secondary">
                  {s.serviceName} {formatYen(monthlyEquivalent(s))}/月
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Button label="閉じる" onPress={onClose} />
    </ScrollView>
  );
}
