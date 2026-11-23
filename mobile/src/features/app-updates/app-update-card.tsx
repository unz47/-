import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useState } from "react";
import { Alert, Linking, Text } from "react-native";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

// ASC App ID 6790129026（CLAUDE.md）。レビュー作成画面を直接開く。
const WRITE_REVIEW_URL =
  "https://apps.apple.com/app/id6790129026?action=write-review";

/** "2026/11/23 14:05" */
function formatStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

/**
 * 設定: アプリのバージョンと OTA アップデート（EAS Update）。
 * 起動時にも自動確認（ON_LOAD・非ブロッキング）し、取得した更新は次回起動で適用される。
 * ここでは手動確認と「今すぐ再起動して適用」を提供する。通信は更新の有無の確認と
 * JS バンドルの取得だけで、ユーザーデータは一切送らない（PROJECT_PLAN §10）。
 */
export function AppUpdateCard() {
  const { currentlyRunning, isUpdatePending, isChecking, isDownloading } =
    Updates.useUpdates();
  const [message, setMessage] = useState<string | null>(null);

  const version = Constants.expoConfig?.version ?? "-";
  const running = currentlyRunning.isEmbeddedLaunch
    ? "ストア版"
    : currentlyRunning.createdAt
      ? `アップデート ${formatStamp(currentlyRunning.createdAt)}`
      : "アップデート適用済み";
  const busy = isChecking || isDownloading;

  async function check() {
    if (!Updates.isEnabled) {
      Alert.alert("開発ビルドでは使えません", "ストア版でのみ確認できます。");
      return;
    }
    setMessage(null);
    try {
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) {
        setMessage("最新の状態です。");
        return;
      }
      await Updates.fetchUpdateAsync();
    } catch {
      setMessage("確認できませんでした。通信環境を確認してください。");
    }
  }

  return (
    <Card className="gap-2">
      <Text className="text-sm font-semibold text-text-secondary">
        アプリについて
      </Text>
      <Text className="text-xs text-text-muted">
        バージョン {version}（{running}）。不具合修正などは起動時に自動で取得し、
        次回起動時に反映します。確認時の通信に支出データは含みません。
      </Text>
      {isUpdatePending ? (
        <>
          <Text className="text-xs text-accent">
            新しいアップデートを取得しました。
          </Text>
          <Button
            label="再起動して適用"
            onPress={() => {
              Updates.reloadAsync().catch(() =>
                setMessage("再起動できませんでした。アプリを開き直してください。"),
              );
            }}
          />
        </>
      ) : (
        <Button
          label={
            isDownloading ? "ダウンロード中…" : isChecking ? "確認中…" : "アップデートを確認"
          }
          variant="ghost"
          onPress={check}
          disabled={busy}
        />
      )}
      {message ? (
        <Text className="text-xs text-text-secondary">{message}</Text>
      ) : null}
      <Button
        label="App Store でレビューを書く"
        variant="ghost"
        onPress={() => {
          Linking.openURL(WRITE_REVIEW_URL).catch(() => {});
        }}
      />
    </Card>
  );
}
