import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable } from "react-native";

import { useThemeColors } from "@/shared/config/theme";
import {
  ocrAvailable,
  scanReceipt,
  toPrefill,
  type ReceiptPrefill,
} from "@/shared/ocr";

interface Props {
  onScanned: (prefill: ReceiptPrefill) => void;
}

/**
 * レシート撮影→OCR→プレフィル起動（§11.5）。
 * OCR は iOS の dev build のみ動くため、非対応環境（Expo Go/Web）では何も描画しない。
 */
export function ReceiptScanButton({ onScanned }: Props) {
  const [scanning, setScanning] = useState(false);
  const colors = useThemeColors();

  if (!ocrAvailable()) return null;

  async function run() {
    if (scanning) return;
    setScanning(true);
    const out = await scanReceipt();
    setScanning(false);
    if (out.status === "ok") {
      onScanned(toPrefill(out.receipt));
    } else if (out.status === "error") {
      Alert.alert("読み取り失敗", out.message);
    }
    // canceled / unavailable は無言。
  }

  return (
    <Pressable
      onPress={run}
      disabled={scanning}
      accessibilityLabel="レシートから追加"
      className="absolute bottom-8 right-24 h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-raised shadow-lg active:opacity-80"
    >
      {scanning ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Ionicons name="camera-outline" size={24} color={colors.accent} />
      )}
    </Pressable>
  );
}
