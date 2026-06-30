// 全データの手動バックアップ（PROJECT_PLAN §6）。永続化は端末内のみ・移行はこの JSON で行う。
import { db } from "./client";
import {
  categories,
  expenses,
  subChangeLogs,
  subscriptions,
} from "./schema";
import { seedDefaultCategories } from "./seed";

export interface BackupData {
  version: number;
  exportedAt: string;
  expenses: (typeof expenses.$inferSelect)[];
  categories: (typeof categories.$inferSelect)[];
  subscriptions: (typeof subscriptions.$inferSelect)[];
  subChangeLogs: (typeof subChangeLogs.$inferSelect)[];
}

const BACKUP_VERSION = 1;

/** 全テーブルを 1 つの BackupData にまとめて返す。 */
export async function exportData(): Promise<BackupData> {
  const [exp, cat, sub, log] = await Promise.all([
    db.select().from(expenses),
    db.select().from(categories),
    db.select().from(subscriptions),
    db.select().from(subChangeLogs),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    expenses: exp,
    categories: cat,
    subscriptions: sub,
    subChangeLogs: log,
  };
}

function isBackupData(value: unknown): value is BackupData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.expenses) &&
    Array.isArray(v.categories) &&
    Array.isArray(v.subscriptions) &&
    Array.isArray(v.subChangeLogs)
  );
}

/** BackupData で全データを置き換える（既存をクリアしてから投入）。形が不正なら例外。 */
export async function importData(raw: unknown): Promise<void> {
  if (!isBackupData(raw)) {
    throw new Error("バックアップ形式が不正です");
  }
  // SQLite は1接続なので逐次。FK制約は張っていないため順序自由。
  await db.delete(expenses);
  await db.delete(subChangeLogs);
  await db.delete(subscriptions);
  await db.delete(categories);

  if (raw.categories.length > 0) await db.insert(categories).values(raw.categories);
  else await seedDefaultCategories(); // カテゴリ空の壊れたバックアップ救済
  if (raw.subscriptions.length > 0)
    await db.insert(subscriptions).values(raw.subscriptions);
  if (raw.subChangeLogs.length > 0)
    await db.insert(subChangeLogs).values(raw.subChangeLogs);
  if (raw.expenses.length > 0) await db.insert(expenses).values(raw.expenses);
}
