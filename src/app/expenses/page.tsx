"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Expense } from "@/lib/db";
import { expensesInMonth, monthSummary } from "@/lib/aggregate";
import { formatYen } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/date";
import {
  useCategoryMap,
  useExpenses,
  useExpenseStore,
} from "@/store/useExpenseStore";
import { useSubscriptions } from "@/store/useSubscriptionStore";
import { Card } from "@/components/ui/card";
import { MonthPicker } from "@/components/ui/month-picker";
import { ExpenseList } from "@/components/expenses/expense-list";
import {
  ExpenseForm,
  type ReceiptPrefill,
} from "@/components/forms/expense-form";
import { ReceiptScanButton } from "@/components/forms/receipt-scan-button";

export default function ExpensesPage() {
  const currentMonth = useExpenseStore((s) => s.currentMonth);
  const setCurrentMonth = useExpenseStore((s) => s.setCurrentMonth);

  const expenses = useExpenses();
  const subs = useSubscriptions();
  const categoryMap = useCategoryMap();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [prefill, setPrefill] = useState<ReceiptPrefill | undefined>(undefined);

  const monthExpenses = useMemo(
    () => expensesInMonth(expenses ?? [], currentMonth),
    [expenses, currentMonth],
  );
  const summary = useMemo(
    () => monthSummary(expenses ?? [], subs ?? [], currentMonth),
    [expenses, subs, currentMonth],
  );

  function openAdd() {
    setEditing(null);
    setPrefill(undefined);
    setFormOpen(true);
  }
  function openEdit(expense: Expense) {
    setEditing(expense);
    setPrefill(undefined);
    setFormOpen(true);
  }
  function openFromReceipt(p: ReceiptPrefill) {
    setEditing(null);
    setPrefill(p);
    setFormOpen(true);
  }

  return (
    <div className="px-5 pt-safe">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">支出</h1>
        <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
      </header>

      <Card className="mb-6 p-5">
        <p className="text-sm text-text-muted">
          {formatMonthLabel(currentMonth)}の合計支出
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {formatYen(summary.total)}
        </p>
        <div className="mt-3 flex items-center gap-3 text-sm text-text-secondary">
          <span className="tabular-nums">
            都度 {formatYen(summary.expenseTotal)}
          </span>
          <span className="size-1 rounded-full bg-text-muted" />
          <span className="tabular-nums">
            サブスク {formatYen(summary.subscriptionActual)}
          </span>
        </div>
      </Card>

      <ExpenseList
        expenses={monthExpenses}
        categoryMap={categoryMap}
        onEdit={openEdit}
      />

      {/* FAB（アプリシェルの右下、タブバーの上に固定）。左にレシートスキャン。 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 mx-auto w-full max-w-[440px]">
        <div className="flex items-end justify-end gap-3 px-5">
          <ReceiptScanButton onScanned={openFromReceipt} />
          <button
            type="button"
            onClick={openAdd}
            aria-label="支出を追加"
            className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/20 outline-none transition-colors hover:bg-accent-glow focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <Plus size={28} />
          </button>
        </div>
      </div>

      <ExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editing}
        defaultDate={undefined}
        prefill={prefill}
      />
    </div>
  );
}
