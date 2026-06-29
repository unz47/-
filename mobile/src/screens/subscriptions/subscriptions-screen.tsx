import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { Card } from "@/shared/ui/card";

/** サブスク一覧（§6）。FABで追加、タップでアクション（編集/改定ログ/解約）。 */
export function SubscriptionsScreen() {
  const subs = useSubscriptions();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [logsFor, setLogsFor] = useState<Subscription | null>(null);

  const active = subs.filter((s) => !s.canceledAt);
  const canceled = subs.filter((s) => s.canceledAt);
  const monthlyTotal = active.reduce((a, s) => a + monthlyEquivalent(s), 0);

  function openActions(s: Subscription) {
    Alert.alert(s.serviceName, undefined, [
      { text: "編集", onPress: () => setEditing(s) },
      { text: "改定ログ", onPress: () => setLogsFor(s) },
      {
        text: "解約",
        style: "destructive",
        onPress: () => confirmCancel(s),
      },
      { text: "閉じる", style: "cancel" },
    ]);
  }
  function confirmCancel(s: Subscription) {
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
          <Text className="text-3xl font-bold text-accent">
            {formatYen(monthlyTotal)}
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
            <Pressable key={s.id} onPress={() => openActions(s)}>
              <Card className="flex-row items-center justify-between active:opacity-70">
                <View>
                  <Text className="text-text-primary">{s.serviceName}</Text>
                  <Text className="text-xs text-text-muted">
                    {s.planName} ・{" "}
                    {s.billingCycle === "yearly" ? "年額" : "月額"} ・ 毎月
                    {s.billingDay}日
                  </Text>
                </View>
                <Text className="font-semibold text-text-primary">
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
                onPress={() =>
                  Alert.alert(s.serviceName, "再契約しますか？", [
                    { text: "閉じる", style: "cancel" },
                    {
                      text: "再契約する",
                      onPress: () => reactivateSubscription(s),
                    },
                  ])
                }
              >
                <Card className="flex-row items-center justify-between opacity-60 active:opacity-40">
                  <Text className="text-text-secondary">{s.serviceName}</Text>
                  <Text className="text-xs text-text-muted">
                    {s.canceledAt} 解約
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => setAdding(true)}
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg active:opacity-80"
      >
        <Text className="text-3xl leading-none text-on-accent">＋</Text>
      </Pressable>

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
