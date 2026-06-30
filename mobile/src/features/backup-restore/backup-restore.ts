// バックアップのエクスポート/インポート（§6）。JSON を端末内ファイルに書き、共有 / 取り込みする。
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { exportData, importData } from "@/shared/db/backup";

/** 全データを JSON ファイルに書き出し、共有シートで送る（保存先はユーザーが選ぶ）。 */
export async function exportBackup(): Promise<void> {
  const data = await exportData();
  const stamp = data.exportedAt.slice(0, 10);
  const file = new File(Paths.cache, `expense-backup-${stamp}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(data, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      dialogTitle: "バックアップを保存",
      UTI: "public.json",
    });
  }
}

export type ImportResult =
  | { status: "ok" }
  | { status: "canceled" }
  | { status: "error"; message: string };

/** JSON ファイルを選んで全データを置き換える。 */
export async function importBackup(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { status: "canceled" };
  try {
    const file = new File(picked.assets[0].uri);
    const raw = JSON.parse(file.textSync());
    await importData(raw);
    return { status: "ok" };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
