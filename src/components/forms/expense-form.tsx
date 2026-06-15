"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Category, Expense } from "@/lib/db";
import { merchantKey } from "@/lib/ocr/merchant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCategories,
  useExpenseStore,
  type ExpenseDraft,
} from "@/store/useExpenseStore";

/** レシートOCR からの初期値（新規追加時のみ・§11）。 */
export interface ReceiptPrefill {
  amount?: number;
  date?: string; // YYYY-MM-DD
  merchant?: string;
  occurredAt?: string;
  /** 低信頼度フィールド＝UI で「要確認」を出す。 */
  uncertain?: { amount?: boolean; date?: boolean; merchant?: boolean };
  /** スキャンごとに変わる値（フォーム再初期化の key 用）。 */
  scannedAt: string;
}

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 指定があれば編集モード。なければ新規追加。 */
  expense?: Expense | null;
  /** 新規追加時の初期日付（YYYY-MM-DD）。未指定なら今日。 */
  defaultDate?: string;
  /** レシートOCR からの初期値（新規追加時のみ有効）。 */
  prefill?: ReceiptPrefill;
}

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function ExpenseForm({
  open,
  onOpenChange,
  expense,
  defaultDate,
  prefill,
}: ExpenseFormProps) {
  const categories = useCategories();
  const fromReceipt = !expense && Boolean(prefill);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {expense
              ? "支出を編集"
              : fromReceipt
                ? "レシートから追加"
                : "支出を追加"}
          </DialogTitle>
        </DialogHeader>
        {/* 開くたび/スキャンごとに remount → useState 初期値で初期化（effect 不要） */}
        {open && (
          <ExpenseFields
            key={expense?.id ?? prefill?.scannedAt ?? "new"}
            expense={expense ?? null}
            defaultDate={defaultDate}
            prefill={expense ? undefined : prefill}
            categories={categories ?? []}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ExpenseFieldsProps {
  expense: Expense | null;
  defaultDate?: string;
  prefill?: ReceiptPrefill;
  categories: Category[];
  onDone: () => void;
}

function UncertainTag() {
  return (
    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning">
      要確認
    </span>
  );
}

function ExpenseFields({
  expense,
  defaultDate,
  prefill,
  categories,
  onDone,
}: ExpenseFieldsProps) {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);

  const isEdit = Boolean(expense);
  const unc = prefill?.uncertain;

  const [date, setDate] = useState(
    expense?.date ?? prefill?.date ?? defaultDate ?? todayStr(),
  );
  const [amount, setAmount] = useState(
    expense
      ? String(expense.amount)
      : prefill?.amount != null
        ? String(prefill.amount)
        : "",
  );
  const [categoryId, setCategoryId] = useState(
    expense?.categoryId ?? categories[0]?.id ?? "",
  );
  const [merchant, setMerchant] = useState(
    expense?.merchant ?? prefill?.merchant ?? "",
  );
  const [memo, setMemo] = useState(expense?.memo ?? "");
  // OCR の購入時刻は表に出さず保持し、保存時に引き継ぐ。
  const occurredAt = expense?.occurredAt ?? prefill?.occurredAt;

  const amountNum = Math.floor(Number(amount));
  const canSubmit =
    Number.isFinite(amountNum) && amountNum > 0 && Boolean(categoryId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const trimmedMerchant = merchant.trim() || undefined;
    const draft: ExpenseDraft = {
      date,
      amount: amountNum,
      categoryId,
      memo: memo.trim() || undefined,
      merchant: trimmedMerchant,
      merchantKey: merchantKey(trimmedMerchant),
      occurredAt,
    };
    if (expense) {
      await updateExpense(expense.id, draft);
    } else {
      await addExpense(draft);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor="amount">金額</Label>
          {unc?.amount && <UncertainTag />}
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            ¥
          </span>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7 tabular-nums"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>カテゴリ</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="カテゴリを選択" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor="merchant">店名（任意）</Label>
          {unc?.merchant && <UncertainTag />}
        </div>
        <Input
          id="merchant"
          placeholder="例: zaim マート"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor="date">日付</Label>
          {unc?.date && <UncertainTag />}
        </div>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="memo">メモ（任意）</Label>
        <Input
          id="memo"
          placeholder="例: 社食、往復"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={!canSubmit}
      >
        {isEdit ? "保存" : "追加"}
      </Button>

      {isEdit && (
        <Button
          type="button"
          variant="subtle"
          size="md"
          className="w-full"
          onClick={async () => {
            if (!expense) return;
            await deleteExpense(expense.id);
            onDone();
          }}
        >
          この支出を削除
        </Button>
      )}
    </form>
  );
}
