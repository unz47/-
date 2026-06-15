import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ネイティブ iOS プロジェクト（cap sync で web ビルドが ios/App/App/public へ
    // コピーされる。lint 対象外）。
    "ios/**",
  ]),
]);

export default eslintConfig;
