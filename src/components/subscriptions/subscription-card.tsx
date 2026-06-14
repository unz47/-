"use client";

import { MoreHorizontal } from "lucide-react";
import type { Subscription } from "@/lib/db";
import { monthlyEquivalent } from "@/lib/aggregate";
import { formatYen } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SubscriptionCardProps {
  sub: Subscription;
  /** カード/⋯ タップでアクションシート（改定ログ・編集・解約）を開く。 */
  onOpenActions: (sub: Subscription) => void;
  /** 値上げバッジ（直近改定が増額）。 */
  recentlyRaised?: boolean;
}

export function SubscriptionCard({
  sub,
  onOpenActions,
  recentlyRaised,
}: SubscriptionCardProps) {
  const canceled = Boolean(sub.canceledAt);

  return (
    <Card className={cn("overflow-hidden p-0", canceled && "opacity-60")}>
      {/* カード全体が単一のタップ標的。⋯ はアフォーダンス。 */}
      <button
        type="button"
        onClick={() => onOpenActions(sub)}
        aria-label={`${sub.serviceName} の操作`}
        className="flex w-full items-center gap-3 p-4 text-left outline-none transition-colors hover:bg-surface-raised/40 focus-visible:bg-surface-raised/40"
      >
        {/* レターアバター */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-base font-semibold text-text-secondary">
          {sub.serviceName.charAt(0)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-text-primary">
              {sub.serviceName}
            </span>
            {recentlyRaised && !canceled && (
              <Badge variant="danger">値上げ</Badge>
            )}
            {canceled && <Badge variant="muted">解約済み</Badge>}
          </span>
          <span className="block truncate text-sm text-text-muted">
            {canceled
              ? `${sub.planName} ・ 解約 ${sub.canceledAt}`
              : sub.billingCycle === "yearly"
                ? `${sub.planName} ・ 毎年${sub.billingMonth ?? ""}月${sub.billingDay}日`
                : `${sub.planName} ・ 毎月${sub.billingDay}日`}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums">
            {formatYen(sub.amount)}
            <span className="ml-0.5 text-xs font-normal text-text-muted">
              /{sub.billingCycle === "yearly" ? "年" : "月"}
            </span>
          </span>
          {sub.billingCycle === "yearly" && (
            <span className="block text-xs text-text-muted tabular-nums">
              ≈ {formatYen(monthlyEquivalent(sub))}/月
            </span>
          )}
        </span>

        <MoreHorizontal
          size={20}
          className="shrink-0 text-text-muted"
          aria-hidden
        />
      </button>
    </Card>
  );
}
