// ハプティクス（触覚フィードバック）。保存成功・選択・警告の3種に絞って使う。
// 失敗しても機能に影響しないため、すべて握りつぶす（シミュレータ等では no-op）。
import * as Haptics from "expo-haptics";

/** 保存・登録などの完了時。 */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

/** チップ選択・シート表示などの軽い操作時。 */
export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** 削除・解約など取り消しにくい操作の確認時。 */
export function hapticWarning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => {},
  );
}
