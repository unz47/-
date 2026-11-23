import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRecentlyRaisedSubIds } from "@/entities/change-log/model/use-change-logs";
import {
  cancelSubscription,
  reactivateSubscription,
} from "@/entities/subscription/model/subscription-repo";
import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { AddSubscriptionForm } from "@/features/add-subscription/add-subscription-form";
import { EditSubscriptionForm } from "@/features/edit-subscription/edit-subscription-form";
import { SubscriptionDetailSheet } from "@/features/subscription-detail/subscription-detail-sheet";
import { ChangeLogSheet } from "@/features/subscription-logs/change-log-sheet";
import { setSubscriptionSort, useSubscriptionSort } from "@/shared/db/settings";
import type { Subscription } from "@/shared/db/types";
import { monthlyEquivalent } from "@/shared/lib/aggregate";
import {
  daysUntil,
  formatDaysLeft,
  isInTrial,
  nextBillingDate,
  sortSubscriptions,
  upcomingCharges,
  yearlyCost,
  type SubscriptionSort,
} from "@/shared/lib/billing";
import { formatShortDate } from "@/shared/lib/date";
import { hapticWarning } from "@/shared/lib/haptics";
import { formatYen } from "@/shared/lib/money";
import { AnimatedYen } from "@/shared/ui/animated-yen";
import { Card } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";
import { Fab } from "@/shared/ui/fab";
import { ServiceLogo } from "@/shared/ui/service-logo";

const SORT_OPTIONS: { key: SubscriptionSort; label: string }[] = [
  { key: "next", label: "次回請求順" },
  { key: "amount", label: "金額順" },
  { key: "name", label: "名前順" },
];

const UPCOMING_DAYS = 30;
const UPCOMING_ROWS = 5;

interface CanceledGroup {
  latest: Subscription; // 代表＝最も新しく解約した契約
  count: number; // 同名サービスの契約数（再契約→解約の繰り返し）
}

/**
 * 解約済みを束ねる。現在アクティブなサービスは除外し、同名は最新の解約 1 件に集約する。
 * データ層は履歴レコードを残したまま（集計の正しさ維持）＝表示だけ束ねる。
 */
function groupCanceled(
  canceled: Subscription[],
  activeNames: Set<string>,
): CanceledGroup[] {
  const map = new Map<string, CanceledGroup>();
  for (const s of canceled) {
    if (activeNames.has(s.serviceName)) continue;
    const g = map.get(s.serviceName);
    if (!g) map.set(s.serviceName, { latest: s, count: 1 });
    else {
      g.count += 1;
      if ((s.canceledAt ?? "") > (g.latest.canceledAt ?? "")) g.latest = s;
    }
  }
  return [...map.values()].sort((a, b) =>
    (b.latest.canceledAt ?? "").localeCompare(a.latest.canceledAt ?? ""),
  );
}

/** サブスク一覧（§6）。FABで追加、タップで詳細（次回請求・年間コスト・累計 → 編集/改定ログ/解約）。 */
export function SubscriptionsScreen() {
  const subs = useSubscriptions();
  const raisedIds = useRecentlyRaisedSubIds();
  const sort = useSubscriptionSort();
  const [adding, setAdding] = useState(false);
  const [detailFor, setDetailFor] = useState<Subscription | null>(null);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [logsFor, setLogsFor] = useState<Subscription | null>(null);

  const today = new Date();
  const active = sortSubscriptions(
    subs.filter((s) => !s.canceledAt),
    sort,
    today,
  );
  const canceledGroups = groupCanceled(
    subs.filter((s) => s.canceledAt),
    new Set(active.map((s) => s.serviceName)),
  );
  const monthlyTotal = active.reduce((a, s) => a + monthlyEquivalent(s), 0);
  const yearlyTotal = active.reduce((a, s) => a + yearlyCost(s), 0);
  const trialCount = active.filter((s) => isInTrial(s, today)).length;
  const upcoming = upcomingCharges(active, today, UPCOMING_DAYS);
  const upcomingTotal = upcoming.reduce((a, c) => a + c.amount, 0);
  const savedMonthly = canceledGroups.reduce(
    (a, g) => a + monthlyEquivalent(g.latest),
    0,
  );

  // 詳細シートは開いた後もライブクエリの最新値で描く（編集直後の値を反映）。
  const detail = detailFor
    ? (subs.find((s) => s.id === detailFor.id) ?? detailFor)
    : null;

  function confirmCancel(s: Subscription) {
    hapticWarning();
    Alert.alert(s.serviceName, "このサブスクを解約しますか？", [
      { text: "閉じる", style: "cancel" },
      {
        text: "解約する",
        onPress: () =>
          cancelSubscription(s.id, new Date().toISOString().slice(0, 10)),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-3 px-5 pb-28 pt-4">
        <Text className="text-xl font-bold text-text-primary">サブスク</Text>

        <Card className="gap-1">
          <Text className="text-sm text-text-secondary">月額合計（換算）</Text>
          <AnimatedYen
            value={monthlyTotal}
            className="text-3xl font-bold text-accent"
          />
          <View className="flex-row flex-wrap gap-x-3">
            <Text
              className="text-xs text-text-secondary"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              年間 {formatYen(yearlyTotal)}
            </Text>
            <Text className="text-xs text-text-muted">
              アクティブ {active.length} 件
            </Text>
            {trialCount > 0 && (
              <Text className="text-xs text-info">無料体験中 {trialCount} 件</Text>
            )}
          </View>
        </Card>

        {upcoming.length > 0 && (
          <Card className="gap-2">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-sm font-semibold text-text-secondary">
                今後{UPCOMING_DAYS}日の請求
              </Text>
              <Text
                className="text-sm font-semibold text-text-primary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatYen(upcomingTotal)}
              </Text>
            </View>
            {upcoming.slice(0, UPCOMING_ROWS).map((c) => (
              <Pressable
                key={`${c.subscription.id}-${c.date}`}
                onPress={() => setDetailFor(c.subscription)}
                accessibilityRole="button"
                accessibilityLabel={`${formatShortDate(c.date)} ${c.subscription.serviceName} ${formatYen(c.amount)}`}
                className="flex-row items-center gap-3 py-1 active:opacity-70"
              >
                <View className="w-12">
                  <Text className="text-sm font-semibold text-text-primary">
                    {formatShortDate(c.date)}
                  </Text>
                  <Text className="text-[10px] text-text-muted">
                    {formatDaysLeft(c.daysLeft)}
                  </Text>
                </View>
                <ServiceLogo
                  presetId={c.subscription.presetId}
                  serviceName={c.subscription.serviceName}
                  size={18}
                />
                <Text className="flex-1 text-sm text-text-primary" numberOfLines={1}>
                  {c.subscription.serviceName}
                  {c.subscription.trialEndsAt === c.date ? "（体験終了）" : ""}
                </Text>
                <Text
                  className="text-sm text-text-secondary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {formatYen(c.amount)}
                </Text>
              </Pressable>
            ))}
            {upcoming.length > UPCOMING_ROWS && (
              <Text className="text-xs text-text-muted">
                ほか {upcoming.length - UPCOMING_ROWS} 件
              </Text>
            )}
          </Card>
        )}

        {active.length > 1 && (
          <View className="flex-row flex-wrap gap-2">
            {SORT_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                label={o.label}
                active={sort === o.key}
                onPress={() => setSubscriptionSort(o.key)}
              />
            ))}
          </View>
        )}

        {active.length === 0 ? (
          <Card>
            <Text className="text-xs text-text-muted">
              アクティブなサブスクはありません。右下の ＋ から追加できます。
            </Text>
          </Card>
        ) : (
          active.map((s) => {
            const next = nextBillingDate(s, today);
            const trial = isInTrial(s, today);
            return (
              <Pressable
                key={s.id}
                onPress={() => setDetailFor(s)}
                accessibilityRole="button"
                accessibilityLabel={`${s.serviceName} の詳細を開く`}
                // active: は必ず Pressable 側に付ける。内側の View(Card) に付けると
                // NativeWind がその View にプレスハンドラを注入し、親の onPress を奪う。
                className="active:opacity-70"
              >
                <Card className="flex-row items-center justify-between gap-3">
                  <View className="flex-1 flex-row items-center gap-3">
                    <ServiceLogo
                      presetId={s.presetId}
                      serviceName={s.serviceName}
                      size={24}
                    />
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-x-2">
                        <Text className="text-text-primary">{s.serviceName}</Text>
                        {trial && (
                          <View className="rounded-full bg-info/15 px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-info">
                              体験中
                            </Text>
                          </View>
                        )}
                        {raisedIds.has(s.id) && (
                          // 赤=値上げ専用のシグナル（§3）。直近30日の増額のみ。
                          <View className="rounded-full bg-danger/15 px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-danger">
                              値上げ
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-text-muted" numberOfLines={1}>
                        {s.planName}
                        {next
                          ? ` ・ 次回 ${formatShortDate(next)}（${formatDaysLeft(
                              daysUntil(next, today),
                            )}）`
                          : ""}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text
                      className="font-semibold text-text-primary"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {formatYen(monthlyEquivalent(s))}/月
                    </Text>
                    {s.billingCycle === "yearly" && (
                      <Text
                        className="text-[11px] text-text-muted"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        年 {formatYen(s.amount)}
                      </Text>
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}

        {canceledGroups.length > 0 && (
          <View className="mt-4 gap-2">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-sm font-semibold text-text-secondary">
                解約済み
              </Text>
              {savedMonthly > 0 && (
                // 緑=減額のシグナル（§3）。解約で浮いている月額換算。
                <Text
                  className="text-xs font-semibold text-success"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  解約で月 {formatYen(savedMonthly)} 節約中
                </Text>
              )}
            </View>
            {canceledGroups.map(({ latest: s, count }) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`${s.serviceName} を再契約`}
                onPress={() =>
                  Alert.alert(s.serviceName, "再契約しますか？", [
                    { text: "閉じる", style: "cancel" },
                    {
                      text: "再契約する",
                      onPress: () => reactivateSubscription(s),
                    },
                  ])
                }
                className="opacity-60 active:opacity-40"
              >
                <Card className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <ServiceLogo
                      presetId={s.presetId}
                      serviceName={s.serviceName}
                      size={20}
                    />
                    <Text className="text-text-secondary">{s.serviceName}</Text>
                  </View>
                  <Text className="text-xs text-text-muted">
                    {s.canceledAt?.replaceAll("-", "/")} 解約
                    {count > 1 ? ` ・ 計${count}契約` : ""}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Fab onPress={() => setAdding(true)} accessibilityLabel="サブスクを追加" />

      {detail && (
        <SubscriptionDetailSheet
          key={detail.id}
          visible={!!detailFor}
          onClose={() => setDetailFor(null)}
          subscription={detail}
          raised={raisedIds.has(detail.id)}
          onEdit={() => setEditing(detail)}
          onShowLogs={() => setLogsFor(detail)}
          onCancel={() => confirmCancel(detail)}
        />
      )}

      <AddSubscriptionForm visible={adding} onClose={() => setAdding(false)} />
      {editing && (
        <EditSubscriptionForm
          key={editing.id}
          visible
          subscription={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {logsFor && (
        <ChangeLogSheet
          key={logsFor.id}
          visible
          subscription={logsFor}
          onClose={() => setLogsFor(null)}
        />
      )}
    </SafeAreaView>
  );
}
