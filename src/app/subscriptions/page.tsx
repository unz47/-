"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Subscription } from "@/lib/db";
import {
  actualChargeInMonth,
  monthlyEquivalent,
  toMonthKey,
} from "@/lib/aggregate";
import { formatYen } from "@/lib/utils";
import {
  useRecentlyRaisedSubIds,
  useSubscriptions,
} from "@/store/useSubscriptionStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { SubscriptionNewFlow } from "@/components/forms/subscription-new-flow";
import { SubscriptionEditForm } from "@/components/forms/subscription-edit-form";

export default function SubscriptionsPage() {
  const router = useRouter();
  const subs = useSubscriptions();
  const raisedIds = useRecentlyRaisedSubIds();

  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function showLogs(sub: Subscription) {
    router.push(`/subscriptions/${sub.id}/logs`);
  }

  const { active, canceled, monthlyTotal, actualThisMonth, annualTotal } =
    useMemo(() => {
      const all = subs ?? [];
      const active = all.filter((s) => !s.canceledAt);
      const canceled = all.filter((s) => s.canceledAt);
      const thisMonth = toMonthKey(new Date());
      const monthlyTotal = active.reduce(
        (acc, s) => acc + monthlyEquivalent(s),
        0,
      );
      const actualThisMonth = active.reduce(
        (acc, s) => acc + actualChargeInMonth(s, thisMonth),
        0,
      );
      const annualTotal = active.reduce(
        (acc, s) => acc + (s.billingCycle === "yearly" ? s.amount : s.amount * 12),
        0,
      );
      return { active, canceled, monthlyTotal, actualThisMonth, annualTotal };
    }, [subs]);

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setEditOpen(true);
  }

  return (
    <div className="px-5 pt-14">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">サブスク</h1>
        <Button variant="accent" size="sm" onClick={() => setNewOpen(true)}>
          <Plus size={16} />
          追加
        </Button>
      </header>

      {/* 月額合計ヒーロー（月額換算＝ランニングコスト） */}
      <Card className="mb-6 p-5">
        <p className="text-sm text-text-secondary">月額合計（月額換算）</p>
        <p className="mt-1 flex items-baseline gap-1 text-accent">
          <span className="text-4xl font-bold tabular-nums">
            {formatYen(monthlyTotal)}
          </span>
          <span className="text-base text-text-muted">/ 月</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span className="tabular-nums">{active.length}件 契約中</span>
          <span className="size-1 rounded-full bg-text-muted" />
          <span className="tabular-nums">
            当月実請求 {formatYen(actualThisMonth)}
          </span>
          <span className="size-1 rounded-full bg-text-muted" />
          <span className="tabular-nums">年間 {formatYen(annualTotal)}</span>
        </div>
      </Card>

      {active.length === 0 && canceled.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-text-muted">
          サブスクはまだありません。「追加」から登録できます。
        </p>
      ) : (
        <div className="space-y-2.5">
          {active.map((s) => (
            <SubscriptionCard
              key={s.id}
              sub={s}
              onEdit={openEdit}
              onShowLogs={showLogs}
              recentlyRaised={raisedIds.has(s.id)}
            />
          ))}

          {canceled.length > 0 && (
            <>
              <p className="px-1 pt-3 text-xs text-text-muted">解約済み</p>
              {canceled.map((s) => (
                <SubscriptionCard
              key={s.id}
              sub={s}
              onEdit={openEdit}
              onShowLogs={showLogs}
              recentlyRaised={raisedIds.has(s.id)}
            />
              ))}
            </>
          )}
        </div>
      )}

      <SubscriptionNewFlow open={newOpen} onOpenChange={setNewOpen} />
      <SubscriptionEditForm
        open={editOpen}
        onOpenChange={setEditOpen}
        sub={editing}
      />
    </div>
  );
}
