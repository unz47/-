import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  addCategory,
  updateCategory,
} from "@/entities/category/model/category-repo";
import {
  CATEGORY_PALETTE,
  CATEGORY_SWATCH_INK,
} from "@/shared/config/colors";
import type { Category } from "@/shared/db/types";
import { cn } from "@/shared/lib/cn";
import { hapticLight, hapticSuccess } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";
import { Sheet } from "@/shared/ui/sheet";
import { TextField } from "@/shared/ui/text-field";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 重複名チェック用の既存カテゴリ名（編集時は自身を除いて渡す）。 */
  existingNames: string[];
  /** 指定時は編集モード（名前・色をプリフィル）。呼び出し側で key={id} を付けて再マウントする。 */
  editing?: Category | null;
}

/** カテゴリ追加/編集シート。色は §3 のカテゴリパレットからのみ選ぶ（シグナル色を混ぜない）。 */
export function CategoryFormSheet({
  visible,
  onClose,
  existingNames,
  editing,
}: Props) {
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState<string>(
    editing?.color ?? CATEGORY_PALETTE[0],
  );

  const trimmed = name.trim();
  const duplicate = existingNames.includes(trimmed);
  const valid = trimmed.length > 0 && !duplicate;

  function reset() {
    setName(editing?.name ?? "");
    setColor(editing?.color ?? CATEGORY_PALETTE[0]);
  }

  async function submit() {
    if (!valid) return;
    if (editing) await updateCategory(editing.id, { name: trimmed, color });
    else await addCategory({ name: trimmed, color });
    hapticSuccess();
    reset();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={editing ? "カテゴリを編集" : "カテゴリを追加"}
    >
      <Text className="text-lg font-bold text-text-primary">
        {editing ? "カテゴリを編集" : "カテゴリを追加"}
      </Text>

      <TextField
        label="カテゴリ名"
        value={name}
        onChangeText={setName}
        placeholder="例: 医療費"
      />
      {duplicate && (
        <Text className="text-xs text-warning">
          同じ名前のカテゴリがあります
        </Text>
      )}

      <View className="gap-1">
        <Text className="text-xs text-text-secondary">色</Text>
        <View className="flex-row justify-between py-1">
          {CATEGORY_PALETTE.map((c) => {
            const selected = color === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  hapticLight();
                  setColor(c);
                }}
                accessibilityRole="button"
                accessibilityLabel={`色 ${c}`}
                accessibilityState={{ selected }}
                className={cn(
                  "h-11 w-11 items-center justify-center rounded-full border-2",
                  selected ? "border-accent" : "border-border",
                )}
              >
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: c }}
                >
                  {selected && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={CATEGORY_SWATCH_INK}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row gap-3 pt-1">
        <Button
          label="キャンセル"
          variant="ghost"
          onPress={onClose}
          className="flex-1"
        />
        <Button
          label={editing ? "保存" : "追加"}
          onPress={submit}
          disabled={!valid}
          className="flex-1"
        />
      </View>
    </Sheet>
  );
}
