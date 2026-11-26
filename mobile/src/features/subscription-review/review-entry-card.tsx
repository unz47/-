import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { VERDICT_TONE } from "@/entities/sub-review/ui/verdict-badge";
import { useThemeColors } from "@/shared/config/theme";
import type { Subscription, SubscriptionReview } from "@/shared/db/types";
import { cn } from "@/shared/lib/cn";
import { hapticLight } from "@/shared/lib/haptics";
import { formatYen } from "@/shared/lib/money";
import {
  buildReviewQueue,
  reviewReason,
  summarizeReviews,
} from "@/shared/lib/sub-review";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import type { ReviewItem } from "./review-session";

export type ReviewFilter = "all" | "keep" | "maybe" | "cancel" | "unreviewed";

interface Props {
  active: Subscription[];
  latest: Map<string, SubscriptionReview>;
  raisedIds: Set<string>;
  filter: ReviewFilter;
  onFilter: (f: ReviewFilter) => void;
  onStart: (items: ReviewItem[]) => void;
}

/** 1件あたりの目安秒数（「約N分」の表示用）。 */
const SECONDS_PER_ITEM = 15;

/**
 * サブスク一覧の「見直し」カード。判定の内訳（タップで一覧を絞り込み）・節約見込み・開始ボタン。
 * 見直しが必要なもの（体験終了間近/値上げ/前回迷う・解約候補/未見直し/90日経過）があればそれだけ、
 * なければ全件を対象に見直しモードを開く。
 */
export function ReviewEntryCard({
  active,
  latest,
  raisedIds,
  filter,
  onFilter,
  onStart,
}: Props) {
  const colors = useThemeColors();
  const today = new Date();
  const summary = summarizeReviews(active, latest);
  const queue = buildReviewQueue(active, latest, today, raisedIds).map((s) => {
    const previous = latest.get(s.id);
    return {
      subscription: s,
      previous,
      reason: reviewReason(s, previous, today, raisedIds.has(s.id)),
    };
  });
  const due = queue.filter((i) => i.reason.kind !== "none");
  const target = due.length > 0 ? due : queue;
  const minutes = Math.max(
    1,
    Math.round((target.length * SECONDS_PER_ITEM) / 60),
  );
  const reviewedAny =
    latest.size > 0 && summary.unreviewed.length < active.length;

  const pills: {
    key: ReviewFilter;
    label: string;
    count: number;
    tone?: string;
  }[] = [
    {
      key: "keep",
      label: "必要",
      count: summary.keep.subs.length,
      tone: VERDICT_TONE.keep.fg,
    },
    { key: "maybe", label: "迷う", count: summary.maybe.subs.length },
    {
      key: "cancel",
      label: "解約候補",
      count: summary.cancel.subs.length,
      tone: VERDICT_TONE.cancel.fg,
    },
    { key: "unreviewed", label: "未見直し", count: summary.unreviewed.length },
  ];

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-2">
        <Ionicons name="swap-horizontal" size={18} color={colors.accent} />
        <Text className="flex-1 text-sm font-semibold text-text-secondary">
          サブスクの見直し
        </Text>
        {due.length > 0 && (
          <Text className="text-xs font-semibold text-accent">
            見直し時期 {due.length}件
          </Text>
        )}
      </View>

      {reviewedAny ? (
        <>
          <View className="flex-row flex-wrap gap-2">
            {pills.map((p) => {
              const on = filter === p.key;
              return (
                <Pressable
                  key={p.key}
                  disabled={p.count === 0 && !on}
                  onPress={() => {
                    hapticLight();
                    onFilter(on ? "all" : p.key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.label} ${p.count}件で絞り込む`}
                  className={cn(
                    "flex-row items-baseline gap-1 rounded-full border px-3 py-1.5",
                    on
                      ? "border-accent bg-accent/15"
                      : "border-border bg-surface-raised",
                    p.count === 0 && !on && "opacity-40",
                  )}
                >
                  <Text
                    className={cn("text-xs", p.tone ?? "text-text-secondary")}
                  >
                    {p.label}
                  </Text>
                  <Text
                    className="text-sm font-semibold text-text-primary"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {p.count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {summary.cancel.subs.length > 0 && (
            // 緑=減額のシグナル（§3）。解約候補をやめた場合に浮く見込み。
            <Text
              className="text-xs font-semibold text-success"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              解約候補をやめると 月 {formatYen(summary.cancel.monthly)} ・ 年{" "}
              {formatYen(summary.cancel.yearly)} 浮きます
            </Text>
          )}
        </>
      ) : (
        <Text className="text-xs text-text-muted">
          本当に必要？ 1枚ずつ「必要・迷う・解約候補」にスワイプで振り分けます。
          {active.length}件・約{minutes}分。
        </Text>
      )}

      <Button
        label={
          due.length > 0
            ? `見直しを始める（${due.length}件・約${minutes}分）`
            : "すべてを見直す"
        }
        variant={due.length > 0 ? "primary" : "ghost"}
        onPress={() => onStart(target)}
      />
    </Card>
  );
}
