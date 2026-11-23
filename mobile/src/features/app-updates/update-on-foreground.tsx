import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

// iOS はアプリを長時間バックグラウンドに置いたままにしがちで、起動時チェック（ON_LOAD）だけだと
// 修正が届くまで間が空く。前面復帰時にも確認するが、頻度は抑える。
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * 前面復帰時に OTA 更新を確認し、あれば裏で取得しておく（適用は次回起動 or 設定の「再起動して適用」）。
 * 入力途中で勝手に再起動しないよう、ここでは reload しない。失敗は黙って次回に回す。
 */
export function UpdateOnForeground() {
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    lastCheck.current = Date.now(); // 起動直後は ON_LOAD が確認済み
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (Date.now() - lastCheck.current < MIN_INTERVAL_MS) return;
      lastCheck.current = Date.now();
      Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : undefined))
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  return null;
}
