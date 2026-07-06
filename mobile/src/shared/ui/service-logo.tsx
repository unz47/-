import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { getServiceIcon } from "@/shared/config/brands";
import { useThemeColors } from "@/shared/config/theme";

/**
 * サブスクのサービスロゴ。simple-icons の単色シルエットを text-secondary で描き
 * （ブランド色は付けない＝赤シグナル規律 §3）、未収録ブランドは頭文字アバターに
 * フォールバックする。Web 版 components/subscriptions/service-logo.tsx の移植。
 */
interface ServiceLogoProps {
  presetId?: string;
  serviceName: string;
  size?: number;
}

export function ServiceLogo({
  presetId,
  serviceName,
  size = 20,
}: ServiceLogoProps) {
  const colors = useThemeColors();
  const icon = getServiceIcon({ presetId, serviceName });

  if (icon) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        accessibilityLabel={serviceName}
      >
        <Path d={icon.path} fill={colors.textSecondary} />
      </Svg>
    );
  }

  // 頭文字アバター（simple-icons 未収録ブランド）。
  return (
    <View
      accessibilityLabel={serviceName}
      className="items-center justify-center rounded-full bg-surface-raised"
      style={{
        width: size,
        height: size,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        className="font-semibold text-text-secondary"
        style={{ fontSize: Math.max(9, size * 0.5) }}
      >
        {serviceName.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}
