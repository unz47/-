import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.unz47.expensetracker",
  appName: "支出管理",
  // Next.js の静的書き出し先（next.config.ts の output: "export"）。
  webDir: "out",
};

export default config;
