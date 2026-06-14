/**
 * サブスクのプリセット候補（PROJECT_PLAN §5）。
 * 価格は 2026 年時点の目安初期値。最新価格を取得しに行かず、この値で固定してよい
 * （ユーザーが登録時/編集時に上書きする前提）。
 */
import type { BillingCycle } from "./db";

export interface PresetPlan {
  name: string;
  amount: number; // その周期 1 回あたりの実額（円・整数）。yearly なら年額。
  cycle: BillingCycle; // 'monthly' | 'yearly'
}

export interface SubscriptionPreset {
  id: string;
  service: string;
  plans: PresetPlan[];
}

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  {
    id: "netflix",
    service: "Netflix",
    plans: [
      { name: "広告つきスタンダード", amount: 890, cycle: "monthly" },
      { name: "スタンダード", amount: 1590, cycle: "monthly" },
      { name: "プレミアム", amount: 2290, cycle: "monthly" },
    ],
  },
  {
    id: "spotify",
    service: "Spotify",
    plans: [
      { name: "Standalone", amount: 980, cycle: "monthly" },
      { name: "Duo", amount: 1280, cycle: "monthly" },
      { name: "Family", amount: 1580, cycle: "monthly" },
    ],
  },
  {
    id: "amazon-prime",
    service: "Amazon Prime",
    plans: [
      { name: "月額", amount: 600, cycle: "monthly" },
      { name: "年額", amount: 5900, cycle: "yearly" },
    ],
  },
  {
    id: "youtube-premium",
    service: "YouTube Premium",
    plans: [
      { name: "個人", amount: 1280, cycle: "monthly" },
      { name: "ファミリー", amount: 2280, cycle: "monthly" },
    ],
  },
  {
    id: "chatgpt",
    service: "ChatGPT",
    plans: [{ name: "Plus", amount: 3000, cycle: "monthly" }],
  },
  {
    id: "apple-music",
    service: "Apple Music",
    plans: [
      { name: "個人", amount: 1080, cycle: "monthly" },
      { name: "個人（年額）", amount: 10800, cycle: "yearly" },
      { name: "ファミリー", amount: 1680, cycle: "monthly" },
    ],
  },
  {
    id: "custom",
    service: "その他（手入力）",
    plans: [],
  },
];
