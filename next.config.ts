import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor で iOS にラップするため静的書き出し（out/）。全ルートはクライアント完結。
  output: "export",
};

export default nextConfig;
