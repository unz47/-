"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { Check, Download, Trash2, Upload, X } from "lucide-react";
import { CATEGORY_PALETTE } from "@/lib/colors";
import {
  clearAllData,
  exportData,
  importData,
} from "@/lib/backup";
import { useCategories, useExpenseStore } from "@/store/useExpenseStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const categories = useCategories();
  const addCategory = useExpenseStore((s) => s.addCategory);
  const updateCategoryColor = useExpenseStore((s) => s.updateCategoryColor);
  const deleteCategory = useExpenseStore((s) => s.deleteCategory);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(CATEGORY_PALETTE[0]);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    await addCategory(name, newColor);
    setNewName("");
  }

  function handleExport() {
    void exportData().then((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense-backup-${format(new Date(), "yyyyMMdd-HHmm")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json: unknown = JSON.parse(await file.text());
      await importData(json);
      setMessage("インポートが完了しました。");
    } catch {
      setMessage("インポートに失敗しました（ファイル形式を確認してください）。");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="px-5 pt-safe">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">設定</h1>

      {/* カテゴリ管理 */}
      <section className="mb-6">
        <h2 className="mb-2 px-1 text-sm font-medium text-text-secondary">
          カテゴリ
        </h2>
        <Card className="divide-y divide-border overflow-hidden">
          {(categories ?? []).map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`${c.name} の色を変更`}
                  onClick={() =>
                    setEditingColorId(editingColorId === c.id ? null : c.id)
                  }
                  className="size-5 shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-border"
                  style={{ backgroundColor: c.color }}
                />
                <span className="flex-1 text-text-primary">{c.name}</span>
                {c.isDefault ? (
                  <span className="text-xs text-text-muted">既定</span>
                ) : (
                  <button
                    type="button"
                    aria-label={`${c.name} を削除`}
                    onClick={() => deleteCategory(c.id)}
                    className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {editingColorId === c.id && (
                <div className="mt-3 flex gap-2">
                  {CATEGORY_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`色 ${color}`}
                      onClick={() => {
                        void updateCategoryColor(c.id, color);
                        setEditingColorId(null);
                      }}
                      className="flex size-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      {c.color.toLowerCase() === color.toLowerCase() && (
                        <Check size={14} className="text-on-accent" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>

        {/* 追加 */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="新規カテゴリの色"
            onClick={() =>
              setNewColor((cur) => {
                const i = CATEGORY_PALETTE.indexOf(cur as never);
                return CATEGORY_PALETTE[(i + 1) % CATEGORY_PALETTE.length];
              })
            }
            className="size-5 shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-border"
            style={{ backgroundColor: newColor }}
          />
          <Input
            placeholder="新しいカテゴリ名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
            }}
          />
          <Button
            variant="accent"
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            追加
          </Button>
        </div>
      </section>

      {/* データ */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-text-secondary">
          データ
        </h2>
        <Card className="space-y-3 p-4">
          <p className="text-xs text-text-muted">
            データは端末内（IndexedDB）のみに保存されます。バックアップは JSON
            の手動エクスポート／インポートで行います。
          </p>
          <div className="flex gap-2">
            <Button variant="surface" className="flex-1" onClick={handleExport}>
              <Download size={16} />
              エクスポート
            </Button>
            <Button
              variant="surface"
              className="flex-1"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} />
              インポート
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
          <Button
            variant="subtle"
            className="w-full"
            onClick={() => setClearOpen(true)}
          >
            全データを削除
          </Button>
          {message && (
            <p className="text-sm text-text-secondary">{message}</p>
          )}
        </Card>
      </section>

      {/* 全削除の確認 */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>全データを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="mb-4 text-sm text-text-secondary">
            支出・サブスク・改定ログ・カテゴリをすべて削除します。この操作は元に
            戻せません。事前のエクスポートを推奨します。
          </p>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="surface" className="flex-1">
                キャンセル
              </Button>
            </DialogClose>
            <Button
              variant="subtle"
              className="flex-1 text-danger"
              onClick={async () => {
                await clearAllData();
                setClearOpen(false);
                setMessage("全データを削除しました。");
              }}
            >
              <X size={16} />
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
