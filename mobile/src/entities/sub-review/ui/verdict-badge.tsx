import { Text, View } from "react-native";

import type { ReviewVerdict } from "@/shared/db/types";
import { cn } from "@/shared/lib/cn";
import { VERDICT_LABEL } from "@/shared/lib/sub-review";

// 判定の色。赤(danger)は値上げ/超過専用なので「解約候補」でも使わない（§3）。
// 解約候補=warning（要注意）/ 迷う=ニュートラル / 必要=accent。
export const VERDICT_TONE: Record<
  ReviewVerdict,
  { bg: string; fg: string; border: string }
> = {
  keep: { bg: "bg-accent/15", fg: "text-accent", border: "border-accent" },
  maybe: {
    bg: "bg-surface-raised",
    fg: "text-text-secondary",
    border: "border-text-muted",
  },
  cancel: { bg: "bg-warning/15", fg: "text-warning", border: "border-warning" },
};

/** 一覧・詳細で使う小さな判定バッジ。 */
export function VerdictBadge({ verdict }: { verdict: ReviewVerdict }) {
  const t = VERDICT_TONE[verdict];
  return (
    <View className={cn("rounded-full px-2 py-0.5", t.bg)}>
      <Text className={cn("text-[10px] font-semibold", t.fg)}>
        {VERDICT_LABEL[verdict]}
      </Text>
    </View>
  );
}
