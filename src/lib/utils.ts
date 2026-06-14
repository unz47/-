import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const yenFormatter = new Intl.NumberFormat("ja-JP");

/** 円・整数を `¥1,590` 形式に整形する（保持する値は整数のまま）。 */
export function formatYen(amount: number): string {
  return `¥${yenFormatter.format(Math.round(amount))}`;
}

/** 符号付きの差分を `+700` / `−100` 形式に整形する（増減表示用）。 */
export function formatDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded > 0) return `+${yenFormatter.format(rounded)}`;
  if (rounded < 0) return `−${yenFormatter.format(Math.abs(rounded))}`;
  return "0";
}

/** crypto.randomUUID をラップ（id 生成を 1 箇所に集約）。 */
export function uid(): string {
  return crypto.randomUUID();
}
