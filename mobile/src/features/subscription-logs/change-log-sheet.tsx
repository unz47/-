import { Modal, ScrollView, Text, View } from "react-native";

import { useChangeLogs } from "@/entities/change-log/model/use-change-logs";
import type { Subscription } from "@/shared/db/types";
import { formatShortDate } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[80%] gap-3 rounded-t-3xl border-t border-border bg-surface p-5 pb-10">
          <Text className="text-lg font-bold text-text-primary">
            {s.serviceName} の改定ログ
          </Text>

          {logs.length === 0 ? (
            <Text className="text-xs text-text-muted">
              まだ改定はありません。
            </Text>
          ) : (
            <ScrollView contentContainerClassName="gap-2">
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
            </ScrollView>
          )}

          <Button label="閉じる" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
