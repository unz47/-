import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";

import { Button } from "@/shared/ui/button";

/**
 * 描画エラーの最終防波堤。白画面クラッシュの代わりにメッセージと再試行を出す。
 * データは SQLite に永続化済みなので、再試行（再マウント）で大半は復帰できる。
 */
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.warn("[app] render error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center gap-3 bg-base px-6">
          <Text className="text-base font-semibold text-text-primary">
            問題が発生しました
          </Text>
          <Text className="text-center text-xs text-text-muted">
            {this.state.error.message}
          </Text>
          <Button
            label="再試行"
            onPress={() => this.setState({ error: null })}
          />
        </View>
      );
    }
    return this.props.children;
  }
}
