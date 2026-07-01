import { format, getHours, parseISO, subDays } from "date-fns";
import type { Expense } from "@/shared/db/types";

/**
 * 時間帯インサイト（週次振り返り）。
 * 「いつ使いがちか」を時刻ビン別に集計する純ロジック。座標に依存しないので
 * 家撮り問題（レシートを家で撮る＝現在地≠店）の影響を受けず、端末内で完結する。
 * ロジックをコンポーネントへ散らさず、この 1 ファイルに集約する（aggregate.ts と同じ流儀）。
 */

export type TimeOfDayBin =
  | "earlyMorning"
  | "midday"
  | "afternoon"
  | "evening"
  | "lateNight";

/** 表示順（グラフ・凡例で共有する安定した順序）。時系列の朝→深夜。 */
export const TIME_OF_DAY_BINS: TimeOfDayBin[] = [
  "earlyMorning",
  "midday",
  "afternoon",
  "evening",
  "lateNight",
];

/** ビンの表示ラベル。 */
export const TIME_OF_DAY_LABEL: Record<TimeOfDayBin, string> = {
  earlyMorning: "早朝",
  midday: "昼",
  afternoon: "夕",
  evening: "夜",
  lateNight: "深夜",
};

/** ビンの時刻レンジ表示（"22:00–5:00" 等）。 */
export const TIME_OF_DAY_RANGE: Record<TimeOfDayBin, string> = {
  earlyMorning: "5:00–9:00",
  midday: "9:00–14:00",
  afternoon: "14:00–18:00",
  evening: "18:00–22:00",
  lateNight: "22:00–5:00",
};

/**
 * 時（0-23）をビンへ振り分ける。深夜は 22:00–翌5:00 をまたぐ（衝動買いの温床＝主役）。
 */
export function binOfHour(hour: number): TimeOfDayBin {
  if (hour >= 5 && hour < 9) return "earlyMorning";
  if (hour >= 9 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "lateNight"; // 22-23, 0-4
}

export interface TimeOfDayItem {
  bin: TimeOfDayBin;
  amount: number; // 円（整数）
  count: number;
}

export interface TimeOfDayInsight {
  items: TimeOfDayItem[]; // 全 5 ビン、表示順。該当なしでも amount:0/count:0 で含む
  totalWithTime: number; // 時刻が取れた支出の合計金額（円・整数）
  countWithTime: number; // 時刻が取れた支出の件数
  countWithoutTime: number; // 期間内で occurredAt が無い支出の件数（母数の分母提示用）
  peak: TimeOfDayItem | null; // 最も使っている時間帯（金額最大）。全て 0 なら null
}

/**
 * 直近 days 日（既定 7）の支出を時間帯ビン別に集計する。
 * 期間の切り出しは家計簿上の日付（Expense.date、必ず存在）で行い、月次集計（§4）と基準を揃える。
 * 時刻は occurredAt（OCR由来・任意）から取る。occurredAt が無い支出は
 * 時間帯には振り分けず countWithoutTime に数える（母数がどれだけ埋まっているか示すため）。
 */
export function buildTimeOfDayInsight(
  expenses: Expense[],
  opts: { now?: Date; days?: number } = {},
): TimeOfDayInsight {
  const now = opts.now ?? new Date();
  const days = opts.days ?? 7;
  const lower = format(subDays(now, days), "yyyy-MM-dd");
  const upper = format(now, "yyyy-MM-dd");

  const amounts = new Map<TimeOfDayBin, number>();
  const counts = new Map<TimeOfDayBin, number>();
  let totalWithTime = 0;
  let countWithTime = 0;
  let countWithoutTime = 0;

  for (const e of expenses) {
    if (e.date < lower || e.date > upper) continue;
    if (!e.occurredAt) {
      countWithoutTime += 1;
      continue;
    }
    const bin = binOfHour(getHours(parseISO(e.occurredAt)));
    amounts.set(bin, (amounts.get(bin) ?? 0) + e.amount);
    counts.set(bin, (counts.get(bin) ?? 0) + 1);
    totalWithTime += e.amount;
    countWithTime += 1;
  }

  const items: TimeOfDayItem[] = TIME_OF_DAY_BINS.map((bin) => ({
    bin,
    amount: amounts.get(bin) ?? 0,
    count: counts.get(bin) ?? 0,
  }));

  const peak = items.reduce<TimeOfDayItem | null>((best, it) => {
    if (it.amount <= 0) return best;
    return best === null || it.amount > best.amount ? it : best;
  }, null);

  return { items, totalWithTime, countWithTime, countWithoutTime, peak };
}
