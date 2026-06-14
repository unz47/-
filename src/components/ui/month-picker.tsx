"use client";

import { subMonths } from "date-fns";
import { ChevronDown } from "lucide-react";
import { toMonthKey, type MonthKey } from "@/lib/aggregate";
import { formatMonthLabel } from "@/lib/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

/** 直近 count ヶ月の月キー（新しい順）。 */
function recentMonths(count: number): MonthKey[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => toMonthKey(subMonths(now, i)));
}

interface MonthPickerProps {
  value: MonthKey;
  onChange: (ym: MonthKey) => void;
  count?: number;
}

export function MonthPicker({ value, onChange, count = 12 }: MonthPickerProps) {
  const months = recentMonths(count);
  // 範囲外の値（過去データ等）も選択肢に含める
  if (!months.includes(value)) months.push(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto gap-1 rounded-full border-border bg-surface px-3 text-sm [&>svg]:hidden">
        <span className="text-text-secondary">{formatMonthLabel(value)}</span>
        <ChevronDown size={14} className="text-text-muted" />
      </SelectTrigger>
      <SelectContent className="min-w-[140px]">
        {months.map((ym) => (
          <SelectItem key={ym} value={ym}>
            {formatMonthLabel(ym)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
