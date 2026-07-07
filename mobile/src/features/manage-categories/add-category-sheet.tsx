import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { addCategory } from "@/entities/category/model/category-repo";
import { CATEGORY_PALETTE } from "@/shared/config/colors";
import { cn } from "@/shared/lib/cn";
import { hapticSuccess } from "@/shared/lib/haptics";
import { Button } from "@/shared/ui/button";
import { Sheet } from "@/shared/ui/sheet";
import { TextField } from "@/shared/ui/text-field";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 重複名チェック用の既存カテゴリ名。 */
  existingNames: string[];
}

/** カテゴリ追加シート。色は §3 のカテゴリパレットからのみ選ぶ（シグナル色を混ぜない）。 */
export function AddCategorySheet({ visible, onClose, existingNames }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_PALETTE[0]);

  const trimmed = name.trim();
  const duplicate = existingNames.includes(trimmed);
  const valid = trimmed.length > 0 && !duplicate;

  function reset() {
    setName("");
    setColor(CATEGORY_PALETTE[0]);
  }

  async function submit() {
    if (!valid) return;
    await addCategory({ name: trimmed, color });
    hapticSuccess();
    reset();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel="カテゴリを追加">
      <Text className="text-lg font-bold text-text-primary">
        カテゴリを追加
      </Text>

      <TextField
        label="カテゴリ名"
        value={name}
        onChangeText={setName}
        placeholder="例: 医療費"
        autoFocus
      />
      {duplicate && (
        <Text className="text-xs text-warning">同じ名前のカテゴリがあります</Text>
      )}

      <View className="gap-1">
        <Text className="text-xs text-text-secondary">色</Text>
        <View className="flex-row gap-3">
          {CATEGORY_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              accessibilityRole="button"
              accessibilityLabel={`色 ${c}`}
              accessibilityState={{ selected: color === c }}
              className={cn(
                "h-9 w-9 items-center justify-center rounded-full border-2",
                color === c ? "border-accent" : "border-transparent",
              )}
            >
              <View
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: c }}
              />
            </Pressable>
          ))}
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
          label="追加"
          onPress={submit}
          disabled={!valid}
          className="flex-1"
        />
      </View>
    </Sheet>
  );
}
