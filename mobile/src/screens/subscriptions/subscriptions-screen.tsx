import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { monthlyEquivalent } from "@/shared/lib/aggregate";
import { formatYen } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

/** サブスク一覧（PROJECT_PLAN §6）。現状は読み取り表示。追加/解約は後続スライス。 */
export function SubscriptionsScreen() {
  const subs = useSubscriptions();
  const active = subs.filter((s) => !s.canceledAt);
  const monthlyTotal = active.reduce((a, s) => a + monthlyEquivalent(s), 0);

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-3 px-5 pb-12 pt-4">
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
              アクティブなサブスクはありません（追加導線は後続スライス）。
            </Text>
          </Card>
        ) : (
          active.map((s) => (
            <Card
              key={s.id}
              className="flex-row items-center justify-between"
            >
              <View>
                <Text className="text-text-primary">{s.serviceName}</Text>
                <Text className="text-xs text-text-muted">
                  {s.planName} ・{" "}
                  {s.billingCycle === "yearly" ? "年額" : "月額"}
                </Text>
              </View>
              <Text className="font-semibold text-text-primary">
                {formatYen(monthlyEquivalent(s))}/月
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
