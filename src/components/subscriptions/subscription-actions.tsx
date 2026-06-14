"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Ban, ChevronRight, Pencil, ScrollText } from "lucide-react";
import type { Subscription } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sub: Subscription | null;
  onEdit: (sub: Subscription) => void;
  onShowLogs: (sub: Subscription) => void;
}

/** サブスクカードの「⋯」から開くアクションシート（改定ログ / 編集 / 解約）。 */
export function SubscriptionActions({
  open,
  onOpenChange,
  sub,
  onEdit,
  onShowLogs,
}: ActionsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sub?.serviceName ?? "サブスク"}</DialogTitle>
        </DialogHeader>
        {open && sub && (
          <ActionsBody
            key={sub.id}
            sub={sub}
            onEdit={onEdit}
            onShowLogs={onShowLogs}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionsBody({
  sub,
  onEdit,
  onShowLogs,
  onClose,
}: {
  sub: Subscription;
  onEdit: (sub: Subscription) => void;
  onShowLogs: (sub: Subscription) => void;
  onClose: () => void;
}) {
  const cancelSubscription = useSubscriptionStore((s) => s.cancelSubscription);
  const [confirming, setConfirming] = useState(false);
  const canceled = Boolean(sub.canceledAt);

  return (
    <div className="space-y-1">
      <ActionRow
        icon={ScrollText}
        label="改定ログ"
        onClick={() => {
          onClose();
          onShowLogs(sub);
        }}
      />
      <ActionRow
        icon={Pencil}
        label="編集"
        onClick={() => {
          onClose();
          onEdit(sub);
        }}
      />

      {/* 解約は論理削除（赤は値上げ専用なので使わない）。確認を 1 段挟む。 */}
      {!canceled &&
        (confirming ? (
          <div className="mt-1 rounded-xl bg-surface-raised p-3">
            <p className="mb-3 text-sm text-text-secondary">
              「{sub.serviceName}」を解約しますか？以降は計上されません（履歴・改定ログは残ります）。
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="surface"
                size="md"
                className="flex-1"
                onClick={() => setConfirming(false)}
              >
                やめる
              </Button>
              <Button
                type="button"
                variant="subtle"
                size="md"
                className="flex-1 bg-base"
                onClick={async () => {
                  await cancelSubscription(
                    sub.id,
                    format(new Date(), "yyyy-MM-dd"),
                  );
                  onClose();
                }}
              >
                解約する
              </Button>
            </div>
          </div>
        ) : (
          <ActionRow
            icon={Ban}
            label="解約"
            destructive
            onClick={() => setConfirming(true)}
          />
        ))}
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised",
        destructive ? "text-text-secondary" : "text-text-primary",
      )}
    >
      <Icon
        size={18}
        className={destructive ? "text-text-muted" : "text-text-secondary"}
      />
      <span className="flex-1 font-medium">{label}</span>
      {!destructive && <ChevronRight size={16} className="text-text-muted" />}
    </button>
  );
}
