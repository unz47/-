// https://docs.expo.dev/guides/using-eslint/
// mobile は独立プロジェクト（--ignore-workspace）なので、ルートの Next 用設定とは別に持つ。
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "ios/*", "drizzle/*", "node_modules/*"],
  },
]);
