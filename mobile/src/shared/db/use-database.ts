// 起動時のDB準備: マイグレーション適用 → 既定カテゴリ投入（冪等）。
// 完了するまで画面描画を待たせる（_layout でゲート）。
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useEffect, useState } from "react";

import { db } from "./client";
import { seedDefaultCategories } from "./seed";
// drizzle-kit 生成物（mobile ルートの drizzle/）。@/ は src/ なので相対参照。
import migrations from "../../../drizzle/migrations";

export interface DatabaseStatus {
  ready: boolean;
  error?: Error;
}

/** マイグレーション → シードを実行し、準備完了を返す。 */
export function useDatabaseReady(): DatabaseStatus {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!success) return;
    let active = true;
    seedDefaultCategories()
      .then(() => {
        if (active) setSeeded(true);
      })
      .catch((e) => console.warn("[db] seed failed", e));
    return () => {
      active = false;
    };
  }, [success]);

  return { ready: success && seeded, error: error ?? undefined };
}
