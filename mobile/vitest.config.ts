// 純ロジック（shared/lib, shared/insights, shared/ocr）のユニットテスト設定。
// RN/Expo に依存しないファイルだけをテスト対象にする（コンポーネントは実機検証）。
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
