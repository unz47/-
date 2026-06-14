import {
  db,
  type Category,
  type Expense,
  type Subscription,
  type SubscriptionChangeLog,
} from "./db";

/**
 * 全データの手動バックアップ（PROJECT_PLAN §6 / §9）。
 * 永続化は IndexedDB のみ・サーバー送信しない方針なので、移行はこの JSON で行う。
 */
export interface BackupData {
  version: number;
  exportedAt: string;
  expenses: Expense[];
  categories: Category[];
  subscriptions: Subscription[];
  subChangeLogs: SubscriptionChangeLog[];
}

const BACKUP_VERSION = 1;

/** 全テーブルを 1 つの BackupData にまとめて返す。 */
export async function exportData(): Promise<BackupData> {
  const [expenses, categories, subscriptions, subChangeLogs] =
    await Promise.all([
      db.expenses.toArray(),
      db.categories.toArray(),
      db.subscriptions.toArray(),
      db.subChangeLogs.toArray(),
    ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    subscriptions,
    subChangeLogs,
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

/** 全テーブルを空にする。 */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    db.expenses,
    db.categories,
    db.subscriptions,
    db.subChangeLogs,
    async () => {
      await Promise.all([
        db.expenses.clear(),
        db.categories.clear(),
        db.subscriptions.clear(),
        db.subChangeLogs.clear(),
      ]);
    },
  );
}

/**
 * BackupData で全データを置き換える（既存をクリアしてから投入）。
 * 形が不正なら例外を投げる。
 */
export async function importData(raw: unknown): Promise<void> {
  if (!isBackupData(raw)) {
    throw new Error("バックアップ形式が不正です");
  }
  await db.transaction(
    "rw",
    db.expenses,
    db.categories,
    db.subscriptions,
    db.subChangeLogs,
    async () => {
      await Promise.all([
        db.expenses.clear(),
        db.categories.clear(),
        db.subscriptions.clear(),
        db.subChangeLogs.clear(),
      ]);
      await Promise.all([
        db.expenses.bulkAdd(raw.expenses),
        db.categories.bulkAdd(raw.categories),
        db.subscriptions.bulkAdd(raw.subscriptions),
        db.subChangeLogs.bulkAdd(raw.subChangeLogs),
      ]);
    },
  );
}
