import { type ReactNode, useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * ボトムシート（全フォーム共通の器）。プレーン Modal の置き換え。
 * - スプリングで下から出し、閉じるときはフェード＋スライドアウト
 * - グラバーを下スワイプで dismiss（本文が ScrollView でも競合しないようグラバーのみ検知）
 * - キーボードで入力欄が隠れないよう iOS は padding で回避
 */
interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 内容が長いシートは true（max-height 88% でスクロール）。 */
  scrollable?: boolean;
  accessibilityLabel?: string;
}

const SPRING = { damping: 24, stiffness: 280, mass: 0.9 };
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

export function Sheet({
  visible,
  onClose,
  children,
  scrollable = false,
  accessibilityLabel,
}: SheetProps) {
  // 閉じるアニメーションを流し切るため、Modal の実マウントは visible より遅らせる。
  // 表示側はレンダー中の状態調整、非表示側はアニメーション完了コールバックで反映する。
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const progress = useSharedValue(0); // 0=画面外, 1=表示
  const drag = useSharedValue(0); // スワイプ中の追従量
  const height = useSharedValue(Dimensions.get("window").height);

  useEffect(() => {
    if (visible) {
      drag.value = 0;
      progress.value = withSpring(1, SPRING);
    } else {
      progress.value = withTiming(0, { duration: 160 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress, drag]);

  function close() {
    Keyboard.dismiss();
    onClose();
  }

  const pan = Gesture.Pan()
    .onChange((e) => {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated の SharedValue は .value 書き込みが公式 API
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(close)();
      } else {
        // eslint-disable-next-line react-hooks/immutability -- 同上
        drag.value = withSpring(0, SPRING);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - progress.value) * height.value + drag.value },
    ],
  }));

  const maxHeight = Dimensions.get("window").height * 0.88;
  const body = scrollable ? (
    <ScrollView
      style={{ maxHeight }}
      contentContainerClassName="gap-4 px-5 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className="gap-4 px-5 pb-10">{children}</View>
  );

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.fill}>
        <View className="flex-1 justify-end">
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable
              style={styles.fill}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            />
          </Animated.View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Animated.View
              style={sheetStyle}
              onLayout={(e) => {
                height.value = e.nativeEvent.layout.height;
              }}
            >
              <View
                className="rounded-t-3xl border-t border-border bg-surface"
                accessibilityViewIsModal
                accessibilityLabel={accessibilityLabel}
              >
                <GestureDetector gesture={pan}>
                  <View
                    className="items-center py-3"
                    accessibilityRole="adjustable"
                    accessibilityLabel="下にスワイプで閉じる"
                  >
                    <View className="h-1 w-10 rounded-full bg-border" />
                  </View>
                </GestureDetector>
                {body}
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
