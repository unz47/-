/**
 * サブスクのプリセット候補（PROJECT_PLAN §5、拡張は docs/subscription-research.md 準拠）。
 * 価格は 2026 年時点の目安初期値（税込・円・整数）。最新価格を取得しに行かず、
 * この値で固定してよい（ユーザーが登録時/編集時に上書きする前提 §10）。
 * USD 建てのサービス（AI 系・Notion・1Password 等）は調査時点の概算円。
 */
import type { BillingCycle } from "@/shared/db/types";

export interface PresetPlan {
  name: string;
  amount: number; // その周期 1 回あたりの実額（円・整数）。yearly なら年額。
  cycle: BillingCycle; // 'monthly' | 'yearly'
}

export type PresetCategory =
  | "video"
  | "music"
  | "ai"
  | "cloud"
  | "books"
  | "gaming"
  | "news"
  | "lifestyle";

export const PRESET_CATEGORY_LABELS: Record<PresetCategory, string> = {
  video: "動画",
  music: "音楽",
  ai: "AI",
  cloud: "クラウド",
  books: "書籍",
  gaming: "ゲーム",
  news: "ニュース",
  lifestyle: "生活",
};

export const PRESET_CATEGORIES = Object.keys(
  PRESET_CATEGORY_LABELS,
) as PresetCategory[];

export interface SubscriptionPreset {
  id: string;
  service: string;
  category: PresetCategory;
  plans: PresetPlan[];
}

const m = (name: string, amount: number): PresetPlan => ({
  name,
  amount,
  cycle: "monthly",
});
const y = (name: string, amount: number): PresetPlan => ({
  name,
  amount,
  cycle: "yearly",
});

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  // ---- 動画配信 ----
  {
    id: "netflix",
    service: "Netflix",
    category: "video",
    plans: [
      m("広告つきスタンダード", 890),
      m("スタンダード", 1590),
      m("プレミアム", 2290),
    ],
  },
  {
    id: "amazon-prime",
    service: "Amazon Prime",
    category: "video",
    plans: [m("月額", 600), y("年額", 5900)],
  },
  {
    id: "disney-plus",
    service: "Disney+",
    category: "video",
    plans: [
      m("スタンダード", 1250),
      m("プレミアム", 1670),
      y("スタンダード（年額）", 12500),
    ],
  },
  {
    id: "apple-tv-plus",
    service: "Apple TV+",
    category: "video",
    plans: [m("月額", 900)],
  },
  {
    id: "u-next",
    service: "U-NEXT",
    category: "video",
    plans: [m("月額", 2189)],
  },
  {
    id: "hulu-japan",
    service: "Hulu",
    category: "video",
    plans: [m("見放題", 1026)],
  },
  {
    id: "d-anime-store",
    service: "dアニメストア",
    category: "video",
    plans: [m("月額", 660)],
  },
  {
    id: "lemino",
    service: "Lemino",
    category: "video",
    plans: [m("プレミアム", 1540)],
  },
  {
    id: "dazn",
    service: "DAZN",
    category: "video",
    plans: [
      m("Standard（月々）", 4200),
      m("Standard（年間・月払）", 3200),
      y("Standard（年間一括）", 32000),
      m("Global", 980),
    ],
  },
  {
    id: "abema-premium",
    service: "ABEMAプレミアム",
    category: "video",
    plans: [m("広告なし", 1180), m("広告つき", 680)],
  },
  {
    id: "wowow-on-demand",
    service: "WOWOWオンデマンド",
    category: "video",
    plans: [m("月額", 2530)],
  },
  {
    id: "telasa",
    service: "TELASA",
    category: "video",
    plans: [m("見放題", 990)],
  },
  {
    id: "fod",
    service: "FOD",
    category: "video",
    plans: [m("スタンダード", 1320), m("広告付きライト", 976)],
  },
  {
    id: "youtube-premium",
    service: "YouTube Premium",
    category: "video",
    plans: [m("個人", 1280), m("ファミリー", 2280)],
  },
  // ---- 音楽 ----
  {
    id: "spotify",
    service: "Spotify",
    category: "music",
    plans: [
      m("Standard", 1080),
      m("学生", 580),
      m("Duo", 1480),
      m("Family", 1880),
    ],
  },
  {
    id: "apple-music",
    service: "Apple Music",
    category: "music",
    plans: [
      m("個人", 1080),
      y("個人（年額）", 10800),
      m("学生", 580),
      m("ファミリー", 1680),
    ],
  },
  {
    id: "youtube-music",
    service: "YouTube Music",
    category: "music",
    plans: [m("個人", 1080), m("学生", 580), m("ファミリー", 1680)],
  },
  {
    id: "amazon-music-unlimited",
    service: "Amazon Music Unlimited",
    category: "music",
    plans: [
      m("個人（プライム会員）", 1080),
      m("個人", 1180),
      m("学生", 580),
      m("ファミリー", 1980),
    ],
  },
  {
    id: "line-music",
    service: "LINE MUSIC",
    category: "music",
    plans: [m("一般", 980), m("学生", 480), m("ファミリー", 1680)],
  },
  {
    id: "awa",
    service: "AWA",
    category: "music",
    plans: [m("Standard", 980), m("学生", 480)],
  },
  {
    id: "dhits",
    service: "dヒッツ",
    category: "music",
    plans: [m("330コース", 330), m("690コース", 690)],
  },
  {
    id: "utapass",
    service: "うたパス",
    category: "music",
    plans: [m("Unlimited", 980)],
  },
  // ---- AI ----
  {
    id: "chatgpt",
    service: "ChatGPT",
    category: "ai",
    plans: [m("Plus", 3000), m("Pro", 30000)],
  },
  {
    id: "claude",
    service: "Claude",
    category: "ai",
    plans: [m("Pro", 3100), m("Max 5x", 15500), m("Max 20x", 31000)],
  },
  {
    id: "google-ai",
    service: "Google AI Pro",
    category: "ai",
    plans: [m("Pro", 2900), m("Ultra", 36000)],
  },
  {
    id: "perplexity",
    service: "Perplexity",
    category: "ai",
    plans: [m("Pro", 3100), m("Max", 31000)],
  },
  {
    id: "github-copilot",
    service: "GitHub Copilot",
    category: "ai",
    plans: [m("Pro", 1550), m("Pro+", 6045)],
  },
  {
    id: "cursor",
    service: "Cursor",
    category: "ai",
    plans: [m("Pro", 3100), m("Pro+", 9300), m("Ultra", 31000)],
  },
  {
    id: "midjourney",
    service: "Midjourney",
    category: "ai",
    plans: [m("Basic", 1550), m("Standard", 4650), m("Pro", 9300)],
  },
  {
    id: "microsoft-copilot-pro",
    service: "Microsoft Copilot Pro",
    category: "ai",
    plans: [m("月額", 3200)],
  },
  {
    id: "notion-ai",
    service: "Notion AI",
    category: "ai",
    plans: [m("アドオン", 1550)],
  },
  // ---- クラウド / 生産性 ----
  {
    id: "google-one",
    service: "Google One",
    category: "cloud",
    plans: [m("100GB", 290), m("200GB", 440), m("2TB", 1450)],
  },
  {
    id: "icloud-plus",
    service: "iCloud+",
    category: "cloud",
    plans: [m("50GB", 150), m("200GB", 450), m("2TB", 1500)],
  },
  {
    id: "dropbox-plus",
    service: "Dropbox Plus",
    category: "cloud",
    plans: [m("月払", 1500), y("年額", 14400)],
  },
  {
    id: "microsoft-365-personal",
    service: "Microsoft 365 Personal",
    category: "cloud",
    plans: [m("月額", 2130), y("Classic（年額）", 14904)],
  },
  {
    id: "microsoft-365-family",
    service: "Microsoft 365 Family",
    category: "cloud",
    plans: [m("月額", 2740)],
  },
  {
    id: "adobe-creative-cloud-pro",
    service: "Adobe Creative Cloud",
    category: "cloud",
    plans: [m("Pro", 9080), m("Standard", 6480)],
  },
  {
    id: "adobe-photography-plan",
    service: "Adobe フォトプラン",
    category: "cloud",
    plans: [m("1TB", 2380)],
  },
  {
    id: "notion-plus",
    service: "Notion Plus",
    category: "cloud",
    plans: [m("月払", 1800), y("年額", 18000)],
  },
  {
    id: "1password",
    service: "1Password",
    category: "cloud",
    plans: [m("Individual", 599), m("Families", 899)],
  },
  {
    id: "evernote",
    service: "Evernote",
    category: "cloud",
    plans: [m("Personal", 1100)],
  },
  {
    id: "canva-pro",
    service: "Canva Pro",
    category: "cloud",
    plans: [m("月払", 1180), y("年額", 8292)],
  },
  // ---- 電子書籍 / マンガ / 雑誌 ----
  {
    id: "kindle-unlimited",
    service: "Kindle Unlimited",
    category: "books",
    plans: [m("読み放題", 980)],
  },
  {
    id: "rakuten-magazine",
    service: "楽天マガジン",
    category: "books",
    plans: [m("月額", 572), y("年額", 5976)],
  },
  {
    id: "d-magazine",
    service: "dマガジン",
    category: "books",
    plans: [m("読み放題", 580)],
  },
  {
    id: "comic-cmoa-yomihodai",
    service: "コミックシーモア読み放題",
    category: "books",
    plans: [m("ライト", 780), m("フル", 1480)],
  },
  {
    id: "book-hodai",
    service: "ブック放題",
    category: "books",
    plans: [m("読み放題", 550)],
  },
  {
    id: "book-walker",
    service: "BOOK☆WALKER",
    category: "books",
    plans: [m("マンガ・雑誌読み放題", 836), m("読み放題MAX", 1100)],
  },
  {
    id: "audible",
    service: "Audible",
    category: "books",
    plans: [m("プレミアム", 1500)],
  },
  {
    id: "audiobook-jp",
    service: "audiobook.jp",
    category: "books",
    plans: [m("月額", 1330), y("年額", 9996)],
  },
  // ---- ゲーム ----
  {
    id: "playstation-plus",
    service: "PlayStation Plus",
    category: "gaming",
    plans: [m("Essential", 850), m("Extra", 1300), m("Premium", 1550)],
  },
  {
    id: "nintendo-switch-online",
    service: "Nintendo Switch Online",
    category: "gaming",
    plans: [
      y("個人（年額）", 4800),
      y("ファミリー（年額）", 5800),
      y("個人＋追加パック（年額）", 5900),
      y("ファミリー＋追加パック（年額）", 9900),
    ],
  },
  {
    id: "xbox-game-pass",
    service: "Xbox Game Pass",
    category: "gaming",
    plans: [m("Essential", 850), m("Premium", 1300), m("Ultimate", 1550)],
  },
  {
    id: "apple-arcade",
    service: "Apple Arcade",
    category: "gaming",
    plans: [m("月額", 900)],
  },
  {
    id: "ea-play",
    service: "EA Play",
    category: "gaming",
    plans: [m("月額", 900)],
  },
  {
    id: "google-play-pass",
    service: "Google Play Pass",
    category: "gaming",
    plans: [m("月額", 600)],
  },
  // ---- ニュース / ビジネス ----
  {
    id: "nikkei-denshi",
    service: "日経電子版",
    category: "news",
    plans: [m("個人", 4277)],
  },
  {
    id: "nikkei-business",
    service: "日経ビジネス電子版",
    category: "news",
    plans: [m("月額", 2500)],
  },
  {
    id: "newspicks-premium",
    service: "NewsPicks",
    category: "news",
    plans: [m("プレミアム", 1850)],
  },
  {
    id: "asahi-shimbun-digital",
    service: "朝日新聞デジタル",
    category: "news",
    plans: [m("ベーシック", 980), m("スタンダード", 1980)],
  },
  {
    id: "mainichi-shimbun-digital",
    service: "毎日新聞デジタル",
    category: "news",
    plans: [m("スタンダード", 1078)],
  },
  {
    id: "toyokeizai-online",
    service: "東洋経済オンライン",
    category: "news",
    plans: [m("月額", 1980)],
  },
  {
    id: "bungeishunju-plus",
    service: "文藝春秋PLUS",
    category: "news",
    plans: [m("月額", 1200)],
  },
  // ---- 生活 / その他 ----
  {
    id: "lyp-premium",
    service: "LYPプレミアム",
    category: "lifestyle",
    plans: [m("月額", 508)],
  },
  {
    id: "uber-one",
    service: "Uber One",
    category: "lifestyle",
    plans: [m("月額", 498), y("年額", 3996)],
  },
];
