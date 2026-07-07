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
import { ChangeLogSheet } from "@/features/subscription-logs/change-log-sheet";
import { monthlyEquivalent } from "@/shared/lib/aggregate";
import type { Subscription } from "@/shared/db/types";
import { formatYen } from "@/shared/lib/money";
import { hapticWarning } from "@/shared/lib/haptics";
import { ActionSheet } from "@/shared/ui/action-sheet";
import { AnimatedYen } from "@/shared/ui/animated-yen";
import { Card } from "@/shared/ui/card";
import { Fab } from "@/shared/ui/fab";
import { ServiceLogo } from "@/shared/ui/service-logo";

/** サブスク一覧（§6）。FABで追加、タップでアクションシート（編集/改定ログ/解約）。 */
export function SubscriptionsScreen() {
  const subs = useSubscriptions();
  const raisedIds = useRecentlyRaisedSubIds();
  const [adding, setAdding] = useState(false);
  const [actionsFor, setActionsFor] = useState<Subscription | null>(null);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [logsFor, setLogsFor] = useState<Subscription | null>(null);

  const active = subs.filter((s) => !s.canceledAt);
  const canceled = subs.filter((s) => s.canceledAt);
  const monthlyTotal = active.reduce((a, s) => a + monthlyEquivalent(s), 0);

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
          <Text className="text-xs text-text-muted">
            アクティブ {active.length} 件
          </Text>
        </Card>

        {active.length === 0 ? (
          <Card>
            <Text className="text-xs text-text-muted">
              アクティブなサブスクはありません。右下の ＋ から追加できます。
            </Text>
          </Card>
        ) : (
          active.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setActionsFor(s)}
              accessibilityRole="button"
              accessibilityLabel={`${s.serviceName} のアクションを開く`}
              // active: は必ず Pressable 側に付ける。内側の View(Card) に付けると
              // NativeWind がその View にプレスハンドラを注入し、親の onPress を奪う。
              className="active:opacity-70"
            >
              <Card className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-3">
                  <ServiceLogo
                    presetId={s.presetId}
                    serviceName={s.serviceName}
                    size={24}
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-text-primary">{s.serviceName}</Text>
                      {raisedIds.has(s.id) && (
                        // 赤=値上げ専用のシグナル（§3）。直近30日の増額のみ。
                        <View className="rounded-full bg-danger/15 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-danger">
                            値上げ
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-text-muted">
                      {s.planName} ・{" "}
                      {s.billingCycle === "yearly" ? "年額" : "月額"} ・ 毎月
                      {s.billingDay}日
                    </Text>
                  </View>
                </View>
                <Text
                  className="font-semibold text-text-primary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {formatYen(monthlyEquivalent(s))}/月
                </Text>
              </Card>
            </Pressable>
          ))
        )}

        {canceled.length > 0 && (
          <View className="mt-4 gap-2">
            <Text className="text-sm font-semibold text-text-secondary">
              解約済み
            </Text>
            {canceled.map((s) => (
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
                    {s.canceledAt} 解約
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Fab onPress={() => setAdding(true)} accessibilityLabel="サブスクを追加" />

      <ActionSheet
        visible={!!actionsFor}
        onClose={() => setActionsFor(null)}
        title={actionsFor?.serviceName ?? ""}
        subtitle={
          actionsFor
            ? `${actionsFor.planName} ・ ${formatYen(actionsFor.amount)}${
                actionsFor.billingCycle === "yearly" ? "/年" : "/月"
              }`
            : undefined
        }
        options={
          actionsFor
            ? [
                {
                  label: "編集",
                  icon: "create-outline",
                  onPress: () => setEditing(actionsFor),
                },
                {
                  label: "改定ログ",
                  icon: "time-outline",
                  onPress: () => setLogsFor(actionsFor),
                },
                {
                  label: "解約",
                  icon: "close-circle-outline",
                  onPress: () => confirmCancel(actionsFor),
                },
              ]
            : []
        }
      />

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
