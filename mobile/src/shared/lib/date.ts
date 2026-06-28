import { format, isToday, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import type { MonthKey } from "@/shared/lib/aggregate";

/** "2026-06" → "2026年 6月" */
export function formatMonthLabel(ym: MonthKey): string {
  return format(parseISO(`${ym}-01`), "yyyy年 M月", { locale: ja });
}

/** 一覧の日付見出し。"YYYY-MM-DD" → "今日 6/14（土）" / "6/13（金）" */
export function formatDayHeader(dateStr: string): string {
  const d = parseISO(dateStr);
  const body = format(d, "M/d（E）", { locale: ja });
  return isToday(d) ? `今日 ${body}` : body;
}

/** "YYYY-MM-DD" → "6/14" のような短い日付。 */
export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), "M/d", { locale: ja });
}

/** "2026-06" → "6月"（月推移グラフの軸ラベル等）。 */
export function formatMonthShort(ym: MonthKey): string {
  return format(parseISO(`${ym}-01`), "M月", { locale: ja });
}

/** "YYYY-MM-DD" → "6月14日（土）"（カレンダー詳細の見出し）。 */
export function formatFullDay(dateStr: string): string {
  return format(parseISO(dateStr), "M月d日（E）", { locale: ja });
}

/** "YYYY-MM-DD" がシステム日付の「今日」か。 */
export function isTodayStr(dateStr: string): boolean {
  return isToday(parseISO(dateStr));
}
