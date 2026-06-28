// drizzle-kit 設定（マイグレーション生成）。expo-sqlite ドライバ。
// `npx drizzle-kit generate` で ./drizzle にSQL+メタを生成し、起動時にマイグレータが適用する。
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./src/shared/db/schema.ts",
  out: "./drizzle",
});
