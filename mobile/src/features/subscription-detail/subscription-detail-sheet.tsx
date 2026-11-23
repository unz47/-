import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/shared/config/theme";
import type { Subscription } from "@/shared/db/types";
import { monthlyEquivalent } from "@/shared/lib/aggregate";
import {
  daysUntil,
  formatDaysLeft,
  isInTrial,
  lifetimePaid,
  monthsSubscribed,
  upcomingBillingDates,
  yearlyCost,
} from "@/shared/lib/billing";
import { formatFullDay } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { ServiceLogo } from "@/shared/ui/service-logo";
import { Sheet } from "@/shared/ui/sheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
  raised: boolean;
  onEdit: () => void;
  onShowLogs: () => void;
  onCancel: () => void;
}

// シートの閉じアニメーション後に次のシートを開く（モーダル多段の競合回避。ActionSheet と同じ）。
const AFTER_CLOSE_MS = 220;

/** "11ヶ月" / "1年3ヶ月" / "2年" */
function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}ヶ月`;
  return m === 0 ? `${y}年` : `${y}年${m}ヶ月`;
}

/**
 * サブスク詳細（次回請求・年間コスト・契約期間・累計・今後の請求予定・メモ）。
 * 数値はすべて請求ルール（billing.ts）から都度計算し、保存はしない（§10 動的合算）。
 */
export function SubscriptionDetailSheet({
  visible,
  onClose,
  subscription: s,
  raised,
  onEdit,
  onShowLogs,
  onCancel,
}: Props) {
  const colors = useThemeColors();
  const today = new Date();
  const upcoming = upcomingBillingDates(s, today, 3);
  const next = upcoming[0];
  const trial = isInTrial(s, today);
  const yearly = s.billingCycle === "yearly";
  const months = monthsSubscribed(s, today);

  function after(fn: () => void) {
    onClose();
    setTimeout(fn, AFTER_CLOSE_MS);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      scrollable
      accessibilityLabel={`${s.serviceName} の詳細`}
    >
      <View className="flex-row items-center gap-3">
        <ServiceLogo presetId={s.presetId} serviceName={s.serviceName} size={32} />
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-lg font-bold text-text-primary">
              {s.serviceName}
            </Text>
            {trial && (
              <View className="rounded-full bg-info/15 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-info">
                  無料体験中
                </Text>
              </View>
            )}
            {raised && (
              // 赤=値上げ専用のシグナル（§3）。直近30日の増額のみ。
              <View className="rounded-full bg-danger/15 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-danger">
                  値上げ
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-text-muted">{s.planName}</Text>
        </View>
      </View>

      <View className="gap-0.5">
        <Text
          className="text-3xl font-bold text-accent"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatYen(s.amount)}
          <Text className="text-base text-text-secondary">
            {yearly ? " /年" : " /月"}
          </Text>
        </Text>
        <Text className="text-xs text-text-secondary">
          {yearly
            ? `月あたり ${formatYen(monthlyEquivalent(s))} ・ 毎年${
                s.billingMonth ?? Number(s.startedAt.slice(5, 7))
              }月${s.billingDay}日`
            : `毎月${s.billingDay}日`}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Stat
          label={trial ? "体験終了・初回請求" : "次回請求"}
          value={next ? formatFullDay(next) : "予定なし"}
          note={next ? formatDaysLeft(daysUntil(next, today)) : undefined}
        />
        <Stat label="年間コスト" value={formatYen(yearlyCost(s))} />
        <Stat
          label="契約期間"
          value={months > 0 ? formatMonths(months) : "開始前"}
          note={`${s.startedAt.replaceAll("-", "/")} から`}
        />
        <Stat
          label="累計支払い（概算）"
          value={formatYen(lifetimePaid(s, today))}
          note="現在の金額で計算"
        />
      </View>

      {upcoming.length > 1 && (
        <View className="gap-1">
          <Text className="text-xs text-text-secondary">今後の請求</Text>
          <View className="overflow-hidden rounded-xl border border-border">
            {upcoming.map((d, i) => (
              <View
                key={d}
                className={
                  "flex-row items-center justify-between bg-surface-raised px-4 py-2.5" +
                  (i > 0 ? " border-t border-border" : "")
                }
              >
                <Text className="text-sm text-text-primary">
                  {formatFullDay(d)}
                </Text>
                <Text
                  className="text-sm text-text-secondary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {formatYen(s.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {s.memo ? (
        <View className="gap-1">
          <Text className="text-xs text-text-secondary">メモ</Text>
          <Text className="text-sm text-text-primary">{s.memo}</Text>
        </View>
      ) : null}

      <View className="overflow-hidden rounded-xl border border-border">
        {(
          [
            { label: "編集", icon: "create-outline", fn: onEdit },
            { label: "改定ログ", icon: "time-outline", fn: onShowLogs },
            // 赤は値上げ/超過専用のため、解約でも赤は使わない（§3）。
            { label: "解約", icon: "close-circle-outline", fn: onCancel },
          ] as const
        ).map((o, i) => (
          <Pressable
            key={o.label}
            onPress={() => after(o.fn)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            className={
              "flex-row items-center gap-3 bg-surface-raised px-4 py-3.5 active:opacity-70" +
              (i > 0 ? " border-t border-border" : "")
            }
          >
            <Ionicons name={o.icon} size={18} color={colors.textSecondary} />
            <Text className="text-base text-text-primary">{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Button label="閉じる" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <View className="min-w-[46%] flex-1 gap-0.5 rounded-xl border border-border bg-surface-raised px-3 py-2.5">
      <Text className="text-[11px] text-text-muted">{label}</Text>
      <Text
        className="text-base font-semibold text-text-primary"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
      {note ? <Text className="text-[11px] text-text-secondary">{note}</Text> : null}
    </View>
  );
}
