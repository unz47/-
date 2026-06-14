"use client";

import { useState } from "react";
import { format, getMonth, parseISO } from "date-fns";
import type { BillingCycle, Subscription } from "@/lib/db";
import { formatYen } from "@/lib/utils";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sub: Subscription | null;
}

export function SubscriptionEditForm({
  open,
  onOpenChange,
  sub,
}: EditFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sub?.serviceName ?? "サブスク"} を編集</DialogTitle>
        </DialogHeader>
        {open && sub && (
          <EditBody key={sub.id} sub={sub} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditBody({
  sub,
  onDone,
}: {
  sub: Subscription;
  onDone: () => void;
}) {
  const updateSubscription = useSubscriptionStore((s) => s.updateSubscription);
  const cancelSubscription = useSubscriptionStore((s) => s.cancelSubscription);

  const [planName, setPlanName] = useState(sub.planName);
  const [amount, setAmount] = useState(String(sub.amount));
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    sub.billingCycle,
  );
  const [billingDay, setBillingDay] = useState(String(sub.billingDay));
  const [billingMonth, setBillingMonth] = useState(
    String(sub.billingMonth ?? getMonth(parseISO(sub.startedAt)) + 1),
  );

  const canceled = Boolean(sub.canceledAt);
  const isYearly = billingCycle === "yearly";
  const amountNum = Math.floor(Number(amount));
  const dayNum = Math.floor(Number(billingDay));
  const monthNum = Math.floor(Number(billingMonth));
  const canSubmit =
    planName.trim().length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    dayNum >= 1 &&
    dayNum <= 31 &&
    (!isYearly || (monthNum >= 1 && monthNum <= 12));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    // amount / planName の変更は store 側で changelog に記録される
    await updateSubscription(sub.id, {
      planName: planName.trim(),
      amount: amountNum,
      billingCycle,
      billingDay: dayNum,
      billingMonth: isYearly ? monthNum : undefined,
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="e-plan">プラン</Label>
        <Input
          id="e-plan"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>請求周期</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setBillingCycle(c)}
              className={
                "rounded-xl border px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 " +
                (billingCycle === c
                  ? "border-accent/60 bg-accent/10 text-text-primary"
                  : "border-border bg-surface-raised text-text-secondary hover:border-accent/40")
              }
            >
              {c === "monthly" ? "月額" : "年額"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="e-amt">{isYearly ? "年額" : "月額"}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            ¥
          </span>
          <Input
            id="e-amt"
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7 tabular-nums"
          />
        </div>
        {isYearly && Number.isFinite(amountNum) && amountNum > 0 && (
          <p className="text-xs text-text-muted tabular-nums">
            月額換算 ≈ {formatYen(Math.round(amountNum / 12))}/月
          </p>
        )}
        <p className="text-xs text-text-muted">
          金額を変更すると改定ログに記録されます。
        </p>
      </div>
      <div className="flex gap-3">
        {isYearly && (
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="e-month">請求月</Label>
            <Input
              id="e-month"
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="tabular-nums"
            />
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="e-day">課金日</Label>
          <Input
            id="e-day"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
            className="tabular-nums"
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={!canSubmit}
      >
        保存
      </Button>

      {!canceled && (
        <Button
          type="button"
          variant="subtle"
          size="md"
          className="w-full"
          onClick={async () => {
            await cancelSubscription(sub.id, format(new Date(), "yyyy-MM-dd"));
            onDone();
          }}
        >
          このサブスクを解約
        </Button>
      )}
    </form>
  );
}
