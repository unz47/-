"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, Plus } from "lucide-react";
import {
  SUBSCRIPTION_PRESETS,
  type SubscriptionPreset,
} from "@/lib/presets";
import type { BillingCycle } from "@/lib/db";
import { SUBSCRIPTION_CATEGORY_ID } from "@/lib/seed";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { formatYen } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionNewFlow({ open, onOpenChange }: NewFlowProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <FlowBody onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

type Step = "service" | "plan" | "details";

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function FlowBody({ onDone }: { onDone: () => void }) {
  const addSubscription = useSubscriptionStore((s) => s.addSubscription);

  const [step, setStep] = useState<Step>("service");
  const [preset, setPreset] = useState<SubscriptionPreset | null>(null);

  // details
  const [serviceName, setServiceName] = useState("");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [billingDay, setBillingDay] = useState(
    String(new Date().getDate()),
  );
  const [billingMonth, setBillingMonth] = useState(
    String(new Date().getMonth() + 1),
  );
  const [startedAt, setStartedAt] = useState(todayStr());

  const isCustom = preset?.id === "custom";
  const isYearly = billingCycle === "yearly";

  // 手入力導線は専用ボタンに分け、プリセット一覧からは custom を除外する
  const customPreset = SUBSCRIPTION_PRESETS.find((p) => p.id === "custom");
  const presetServices = SUBSCRIPTION_PRESETS.filter((p) => p.id !== "custom");

  function chooseService(p: SubscriptionPreset) {
    setPreset(p);
    setServiceName(p.id === "custom" ? "" : p.service);
    if (p.id === "custom" || p.plans.length === 0) {
      setPlanName("");
      setAmount("");
      setBillingCycle("monthly");
      setStep("details");
    } else {
      setStep("plan");
    }
  }

  function choosePlan(name: string, amt: number, cycle: BillingCycle) {
    setPlanName(name);
    setAmount(String(amt));
    setBillingCycle(cycle);
    setStep("details");
  }

  const amountNum = Math.floor(Number(amount));
  const dayNum = Math.floor(Number(billingDay));
  const monthNum = Math.floor(Number(billingMonth));
  const canSubmit =
    serviceName.trim().length > 0 &&
    planName.trim().length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    dayNum >= 1 &&
    dayNum <= 31 &&
    (!isYearly || (monthNum >= 1 && monthNum <= 12));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await addSubscription({
      serviceName: serviceName.trim(),
      planName: planName.trim(),
      amount: amountNum,
      billingCycle,
      categoryId: SUBSCRIPTION_CATEGORY_ID,
      billingDay: dayNum,
      billingMonth: isYearly ? monthNum : undefined,
      startedAt,
      presetId: preset && preset.id !== "custom" ? preset.id : undefined,
    });
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          {step !== "service" && (
            <button
              type="button"
              aria-label="戻る"
              onClick={() => setStep(step === "details" && !isCustom && preset?.plans.length ? "plan" : "service")}
              className="-ml-1 rounded-lg p-1 text-text-muted hover:text-text-primary"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <DialogTitle>
            {step === "service" && "サービスを選択"}
            {step === "plan" && "プランを選択"}
            {step === "details" && "契約内容を確認"}
          </DialogTitle>
        </div>
      </DialogHeader>

      {step === "service" && (
        <div className="space-y-3">
          {/* 手入力導線（プリセットに無いサービスはこちら） */}
          {customPreset && (
            <button
              type="button"
              onClick={() => chooseService(customPreset)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/50 bg-accent/5 px-3 py-3 text-sm font-medium text-accent outline-none transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Plus size={16} />
              手入力で追加
            </button>
          )}

          <p className="px-1 text-xs text-text-muted">
            またはプリセットから選ぶ
          </p>

          <div className="grid grid-cols-2 gap-2">
            {presetServices.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => chooseService(p)}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-3 text-left text-sm font-medium text-text-primary outline-none transition-colors hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <ServiceLogo
                  serviceName={p.service}
                  presetId={p.id}
                  className="size-7 bg-surface text-xs"
                />
                <span className="truncate">{p.service}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "plan" && preset && (
        <div className="space-y-2">
          {preset.plans.map((pl) => (
            <button
              key={pl.name}
              type="button"
              onClick={() => choosePlan(pl.name, pl.amount, pl.cycle)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3 text-left outline-none transition-colors hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span className="text-text-primary">{pl.name}</span>
              <span className="font-semibold tabular-nums">
                {formatYen(pl.amount)}
                <span className="ml-0.5 text-xs font-normal text-text-muted">
                  /{pl.cycle === "yearly" ? "年" : "月"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "details" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="svc">サービス名</Label>
            <Input
              id="svc"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="例: Netflix"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan">プラン</Label>
            <Input
              id="plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="例: スタンダード"
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
            <Label htmlFor="amt">{isYearly ? "年額" : "月額"}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                ¥
              </span>
              <Input
                id="amt"
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
          </div>
          <div className="flex gap-3">
            {isYearly && (
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="month">請求月</Label>
                <Input
                  id="month"
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
              <Label htmlFor="day">課金日</Label>
              <Input
                id="day"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="flex-[2] space-y-1.5">
              <Label htmlFor="start">契約開始日</Label>
              <Input
                id="start"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
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
            登録
          </Button>
        </form>
      )}
    </>
  );
}
