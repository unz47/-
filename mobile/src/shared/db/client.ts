// 端末内 SQLite クライアント（Drizzle）。永続化は端末内のみ・外部送信なし（§10）。
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";

// enableChangeListener: useLiveQuery（リアクティブ取得）に必要。Dexie の liveQuery 相当。
export const sqliteDb = openDatabaseSync("expense-tracker.db", {
  enableChangeListener: true,
});

export const db = drizzle(sqliteDb, { schema });
