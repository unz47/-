"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Category, Expense } from "@/lib/db";
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

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 指定があれば編集モード。なければ新規追加。 */
  expense?: Expense | null;
  /** 新規追加時の初期日付（YYYY-MM-DD）。未指定なら今日。 */
  defaultDate?: string;
}

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function ExpenseForm({
  open,
  onOpenChange,
  expense,
  defaultDate,
}: ExpenseFormProps) {
  const categories = useCategories();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "支出を編集" : "支出を追加"}</DialogTitle>
        </DialogHeader>
        {/* 開くたびに対象に合わせて remount → useState 初期値で初期化（effect 不要） */}
        {open && (
          <ExpenseFields
            key={expense?.id ?? "new"}
            expense={expense ?? null}
            defaultDate={defaultDate}
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
  categories: Category[];
  onDone: () => void;
}

function ExpenseFields({
  expense,
  defaultDate,
  categories,
  onDone,
}: ExpenseFieldsProps) {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);

  const isEdit = Boolean(expense);

  const [date, setDate] = useState(expense?.date ?? defaultDate ?? todayStr());
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : "",
  );
  const [categoryId, setCategoryId] = useState(
    expense?.categoryId ?? categories[0]?.id ?? "",
  );
  const [memo, setMemo] = useState(expense?.memo ?? "");

  const amountNum = Math.floor(Number(amount));
  const canSubmit =
    Number.isFinite(amountNum) && amountNum > 0 && Boolean(categoryId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const draft: ExpenseDraft = {
      date,
      amount: amountNum,
      categoryId,
      memo: memo.trim() || undefined,
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
        <Label htmlFor="amount">金額</Label>
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
        <Label htmlFor="date">日付</Label>
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
