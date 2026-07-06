import { Text } from "react-native";

import { useAllChangeLogs } from "@/entities/change-log/model/use-change-logs";
import type { Subscription } from "@/shared/db/types";
import { raiseImpact } from "@/shared/insights/raise-impact";
import { cn } from "@/shared/lib/cn";
import { formatYen } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

/**
 * 今年の値上げ影響タイル。サブスク改定ログから月額換算の純増減を出す。
 * 純増=danger / 純減=success（§3 シグナル規律）。改定が無い年は描画しない。
 */
interface RaiseImpactTileProps {
  subs: Subscription[];
  className?: string;
}

export function RaiseImpactTile({ subs, className }: RaiseImpactTileProps) {
  const logs = useAllChangeLogs();
  const year = new Date().getFullYear();
  const impact = raiseImpact(logs, subs, year);

  if (impact.raisedCount === 0 && impact.loweredCount === 0) return null;

  const up = impact.monthlyDelta > 0;
  return (
    <Card className={cn("justify-between gap-1", className)}>
      <Text className="text-sm text-text-secondary">今年の改定影響</Text>
      <Text
        className={cn(
          "text-2xl font-bold",
          up ? "text-danger" : impact.monthlyDelta < 0 ? "text-success" : "text-text-primary",
        )}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {up ? "+" : ""}
        {formatYen(impact.monthlyDelta)}/月
      </Text>
      <Text className="text-xs text-text-muted">
        値上げ {impact.raisedCount} 件
        {impact.loweredCount > 0 ? ` ・ 値下げ ${impact.loweredCount} 件` : ""}
      </Text>
    </Card>
  );
}
