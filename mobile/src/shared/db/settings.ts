// アプリ設定（app_settings key-value）の読み書き。端末内プリファレンス専用。
// バックアップ対象外（backup.ts）。値はすべて文字列で保持し、呼び出し側の型付き
// アクセサ（theme / monthlyBudget / weeklyInsight）経由で使う。
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import { db } from "./client";
import { appSettings } from "./schema";

export type ThemePreference = "system" | "light" | "dark";

const KEYS = {
  theme: "theme",
  monthlyBudget: "monthlyBudget",
  weeklyInsight: "weeklyInsight",
} as const;

async function getValue(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

async function setValue(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

async function deleteValue(key: string): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, key));
}

/** 設定値のリアクティブ購読（未設定は null）。 */
function useSettingValue(key: string): string | null {
  const { data } = useLiveQuery(
    db.select().from(appSettings).where(eq(appSettings.key, key)),
  );
  return data?.[0]?.value ?? null;
}

// --- テーマ（起動時復元・設定画面で変更） ---

export async function getThemePreference(): Promise<ThemePreference> {
  const v = await getValue(KEYS.theme);
  return v === "light" || v === "dark" ? v : "system";
}

export async function setThemePreference(t: ThemePreference): Promise<void> {
  await setValue(KEYS.theme, t);
}

// --- 月予算（円・整数、未設定は null / §9 v0.2 設計） ---

export function useMonthlyBudget(): number | null {
  const v = useSettingValue(KEYS.monthlyBudget);
  const n = v != null ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export async function setMonthlyBudget(amount: number | null): Promise<void> {
  if (amount == null || amount <= 0) await deleteValue(KEYS.monthlyBudget);
  else await setValue(KEYS.monthlyBudget, String(Math.round(amount)));
}

// --- 週次通知フラグ（通知の再スケジュールに使う） ---

export async function getWeeklyInsightFlag(): Promise<boolean> {
  return (await getValue(KEYS.weeklyInsight)) === "1";
}

export async function setWeeklyInsightFlag(on: boolean): Promise<void> {
  await setValue(KEYS.weeklyInsight, on ? "1" : "0");
}
