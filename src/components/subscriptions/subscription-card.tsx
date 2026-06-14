"use client";

import { ChevronRight } from "lucide-react";
import type { Subscription } from "@/lib/db";
import { monthlyEquivalent } from "@/lib/aggregate";
import { formatYen } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SubscriptionCardProps {
  sub: Subscription;
  onEdit: (sub: Subscription) => void;
  /** 改定ログ画面への遷移（Phase 5 で配線）。 */
  onShowLogs?: (sub: Subscription) => void;
  /** 値上げバッジ（直近改定が増額。Phase 5 で渡す）。 */
  recentlyRaised?: boolean;
}

export function SubscriptionCard({
  sub,
  onEdit,
  onShowLogs,
  recentlyRaised,
}: SubscriptionCardProps) {
  const canceled = Boolean(sub.canceledAt);

  return (
    <Card className={cn("p-4", canceled && "opacity-60")}>
      <div className="flex items-center gap-3">
        {/* 情報エリアをタップ → 改定ログへ（編集ボタンとは別導線） */}
        <button
          type="button"
          onClick={() => onShowLogs?.(sub)}
          disabled={!onShowLogs}
          aria-label={`${sub.serviceName} の改定ログを表示`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none disabled:cursor-default"
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
        </button>

        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums">
            {formatYen(sub.amount)}
            <span className="ml-0.5 text-xs font-normal text-text-muted">
              /{sub.billingCycle === "yearly" ? "年" : "月"}
            </span>
          </p>
          {sub.billingCycle === "yearly" && (
            <p className="text-xs text-text-muted tabular-nums">
              ≈ {formatYen(monthlyEquivalent(sub))}/月
            </p>
          )}
          <button
            type="button"
            onClick={() => onEdit(sub)}
            aria-label={`${sub.serviceName} を編集`}
            className="mt-0.5 inline-flex items-center text-xs text-text-muted outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary"
          >
            編集
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </Card>
  );
}
