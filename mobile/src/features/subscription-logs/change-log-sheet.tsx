import { Text, View } from "react-native";

import { useChangeLogs } from "@/entities/change-log/model/use-change-logs";
import type { Subscription } from "@/shared/db/types";
import { formatShortDate } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Sheet } from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/cn";

interface Props {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
}

/** 改定ログ表示（§6）。増額=danger / 減額=success / プラン変更=ニュートラル。 */
export function ChangeLogSheet({ visible, onClose, subscription: s }: Props) {
  const logs = useChangeLogs(s.id);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      scrollable
      accessibilityLabel={`${s.serviceName} の改定ログ`}
    >
      <Text className="text-lg font-bold text-text-primary">
        {s.serviceName} の改定ログ
      </Text>

      {logs.length === 0 ? (
        <Text className="text-xs text-text-muted">まだ改定はありません。</Text>
      ) : (
        <View className="gap-2">
          {logs.map((log) => {
            if (log.field === "amount") {
              const oldV = Number(log.oldValue);
              const newV = Number(log.newValue);
              const up = newV > oldV;
              const diff = newV - oldV;
              return (
                <View
                  key={log.id}
                  className="flex-row items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3"
                >
                  <Text className="text-sm text-text-secondary">
                    {formatShortDate(log.changedAt.slice(0, 10))}
                  </Text>
                  <Text className="text-sm text-text-primary">
                    {formatYen(oldV)} → {formatYen(newV)}{" "}
                    <Text
                      className={cn(
                        "font-semibold",
                        up ? "text-danger" : "text-success",
                      )}
                    >
                      ({up ? "+" : ""}
                      {formatYen(diff)})
                    </Text>
                  </Text>
                </View>
              );
            }
            return (
              <View
                key={log.id}
                className="flex-row items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3"
              >
                <Text className="text-sm text-text-secondary">
                  {formatShortDate(log.changedAt.slice(0, 10))}
                </Text>
                <Text className="text-sm text-text-primary">
                  プラン: {String(log.oldValue)} → {String(log.newValue)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Button label="閉じる" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}
