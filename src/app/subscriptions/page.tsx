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
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions";
import { SubscriptionNewFlow } from "@/components/forms/subscription-new-flow";
import { SubscriptionEditForm } from "@/components/forms/subscription-edit-form";

export default function SubscriptionsPage() {
  const router = useRouter();
  const subs = useSubscriptions();
  const raisedIds = useRecentlyRaisedSubIds();

  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [actionsSub, setActionsSub] = useState<Subscription | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  function showLogs(sub: Subscription) {
    router.push(`/subscriptions/logs?id=${sub.id}`);
  }

  function openActions(sub: Subscription) {
    setActionsSub(sub);
    setActionsOpen(true);
  }

  const { active, canceled, monthlyTotal, actualThisMonth, annualTotal } =
    useMemo(() => {
      const all = subs ?? [];
      const active = all.filter((s) => !s.canceledAt);

      // 解約済みの見せ方:
      // - 現在アクティブなサービスは出さない（再契約済み＝もう解約状態ではない）
      // - 同名サービスはサービス単位で 1 枚に集約（再契約で増える履歴レコードが積み上がらないように）
      // データ層では履歴レコードを残す（過去月の集計を保つ。§10）。表示だけ束ねる。
      const activeNames = new Set(active.map((s) => s.serviceName));
      const groups = new Map<string, Subscription[]>();
      for (const s of all) {
        if (!s.canceledAt || activeNames.has(s.serviceName)) continue;
        const arr = groups.get(s.serviceName) ?? [];
        arr.push(s);
        groups.set(s.serviceName, arr);
      }
      const canceled = [...groups.values()].map((group) => {
        // 最新の解約レコードを代表に（canceledAt 降順）
        const sorted = [...group].sort((a, b) =>
          (a.canceledAt ?? "") < (b.canceledAt ?? "") ? 1 : -1,
        );
        return { sub: sorted[0], count: group.length };
      });

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
    <div className="px-5 pt-safe">
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
              onOpenActions={openActions}
              recentlyRaised={raisedIds.has(s.id)}
            />
          ))}

          {canceled.length > 0 && (
            <>
              <p className="px-1 pt-3 text-xs text-text-muted">解約済み</p>
              {canceled.map(({ sub, count }) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  onOpenActions={openActions}
                  recentlyRaised={raisedIds.has(sub.id)}
                  historyCount={count}
                />
              ))}
            </>
          )}
        </div>
      )}

      <SubscriptionNewFlow open={newOpen} onOpenChange={setNewOpen} />
      <SubscriptionActions
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        sub={actionsSub}
        onEdit={openEdit}
        onShowLogs={showLogs}
      />
      <SubscriptionEditForm
        open={editOpen}
        onOpenChange={setEditOpen}
        sub={editing}
      />
    </div>
  );
}
