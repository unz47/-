import { useState } from "react";
import { Text, View } from "react-native";

import { setMonthlyBudget, useMonthlyBudget } from "@/shared/db/settings";
import { formatYen } from "@/shared/lib/money";
import { hapticSuccess } from "@/shared/lib/haptics";
import { AmountInput } from "@/shared/ui/amount-input";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/**
 * 月予算の設定（PROJECT_PLAN §9 の v0.2 設計＝月予算1本、日別割当はしない）。
 * ダッシュボードの残額タイルとカレンダーの消化ペースがこの値を参照する。
 */
export function BudgetSettingCard() {
  const stored = useMonthlyBudget();
  const [draft, setDraft] = useState<number | null>(stored);
  // 保存済みの値が変わったら（初期ロード・他画面変更）下書きへ反映
  // （effect でなくレンダー中の状態調整＝calendar-screen と同じ流儀）
  const [prevStored, setPrevStored] = useState(stored);
  if (stored !== prevStored) {
    setPrevStored(stored);
    setDraft(stored);
  }

  const dirty = draft !== stored;

  async function save() {
    await setMonthlyBudget(draft);
    hapticSuccess();
  }

  return (
    <Card className="gap-3">
      <View className="gap-0.5">
        <Text className="text-sm font-semibold text-text-secondary">
          月予算
        </Text>
        <Text className="text-xs text-text-muted">
          当月総支出（都度＋サブスク実請求）に対する予算。ダッシュボードとカレンダーに消化ペースが出ます。
        </Text>
      </View>
      <AmountInput label="月予算（未設定で機能オフ）" size="md" value={draft} onChange={setDraft} />
      <View className="flex-row items-center gap-3">
        <Button
          label={stored != null && draft == null ? "予算を解除" : "保存"}
          onPress={save}
          disabled={!dirty}
          className="flex-1"
        />
        {stored != null && (
          <Text className="text-xs text-text-muted">
            現在 {formatYen(stored)}
          </Text>
        )}
      </View>
    </Card>
  );
}
