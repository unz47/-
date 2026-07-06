/**
 * サブスクのブランドロゴ（サムネ）解決。
 * バンドルした simple-icons の単色シルエットだけを使う（外部CDN送信なし）。
 * 色は付けない（テーマ色 currentColor で描く）＝「赤=値上げ/超過 専用」のシグナル規律を守る。
 *
 * simple-icons は商標方針で多くのブランドを収録していない（Amazon系 / Adobe / Nintendo /
 * Xbox / Microsoft / Disney / Hulu / ABEMA / Canva / ChatGPT(OpenAI) / 国内サービス等）。
 * ここに無いサービスは ServiceLogo 側で頭文字アバターにフォールバックする。
 * プリセット拡張（docs/subscription-research.md）時は下の BRANDS に presetId / 別名を足すだけ。
 */
import {
  si1password,
  siApplearcade,
  siApplemusic,
  siAppletv,
  siAudible,
  siClaude,
  siCursor,
  siDazn,
  siDropbox,
  siEa,
  siEvernote,
  siGithubcopilot,
  siGoogle,
  siGooglegemini,
  siGoogleplay,
  siIcloud,
  siLine,
  siNetflix,
  siNotion,
  siPerplexity,
  siPlaystation,
  siRakuten,
  siSpotify,
  siUber,
  siYoutube,
  siYoutubemusic,
} from "simple-icons";

export interface BrandIcon {
  title: string;
  path: string; // 24x24 viewBox の SVG パス
}

interface BrandEntry {
  icon: BrandIcon;
  /** 現行/将来の presetId（src/lib/presets.ts, docs/subscription-research.md）。 */
  presetIds?: string[];
  /** サービス名の別名。手入力（presetId なし）でも拾えるよう英日・表記ゆれを列挙。 */
  names: string[];
}

// simple-icons に実在するブランドだけを網羅。無いものは載せない＝頭文字フォールバック。
const BRANDS: BrandEntry[] = [
  // 動画配信
  {
    icon: siNetflix,
    presetIds: ["netflix"],
    names: ["Netflix", "ネットフリックス"],
  },
  {
    icon: siAppletv,
    presetIds: ["apple-tv-plus"],
    names: ["Apple TV+", "Apple TV Plus", "AppleTV"],
  },
  {
    icon: siDazn,
    presetIds: ["dazn"],
    names: ["DAZN", "ダゾーン"],
  },
  {
    icon: siYoutube,
    presetIds: ["youtube-premium"],
    names: ["YouTube Premium", "YouTube", "ユーチューブ"],
  },
  // 音楽
  {
    icon: siSpotify,
    presetIds: ["spotify"],
    names: ["Spotify", "スポティファイ"],
  },
  {
    icon: siApplemusic,
    presetIds: ["apple-music"],
    names: ["Apple Music", "アップルミュージック"],
  },
  {
    icon: siYoutubemusic,
    presetIds: ["youtube-music"],
    names: ["YouTube Music"],
  },
  {
    icon: siLine,
    presetIds: ["line-music"],
    names: ["LINE MUSIC", "LINEミュージック", "LINE"],
  },
  // AI
  {
    icon: siClaude,
    presetIds: ["claude"],
    names: ["Claude", "Anthropic", "Claude Pro", "Claude Max"],
  },
  {
    icon: siGooglegemini,
    presetIds: ["google-ai", "gemini"],
    names: [
      "Google AI Pro",
      "Gemini",
      "Gemini Advanced",
      "Google Gemini",
    ],
  },
  {
    icon: siPerplexity,
    presetIds: ["perplexity"],
    names: ["Perplexity", "Perplexity Pro"],
  },
  {
    icon: siGithubcopilot,
    presetIds: ["github-copilot"],
    names: ["GitHub Copilot", "Copilot"],
  },
  {
    icon: siCursor,
    presetIds: ["cursor"],
    names: ["Cursor"],
  },
  {
    icon: siNotion,
    presetIds: ["notion-ai", "notion-plus", "notion"],
    names: ["Notion", "Notion AI", "Notion Plus"],
  },
  // クラウド / 生産性
  {
    icon: siGoogle,
    presetIds: ["google-one"],
    names: ["Google One", "グーグルワン"],
  },
  {
    icon: siIcloud,
    presetIds: ["icloud-plus", "icloud"],
    names: ["iCloud+", "iCloud", "アイクラウド"],
  },
  {
    icon: siDropbox,
    presetIds: ["dropbox-plus", "dropbox-essentials", "dropbox"],
    names: ["Dropbox", "Dropbox Plus", "Dropbox Essentials"],
  },
  {
    icon: si1password,
    presetIds: ["1password"],
    names: ["1Password", "ワンパスワード"],
  },
  {
    icon: siEvernote,
    presetIds: ["evernote"],
    names: ["Evernote", "エバーノート"],
  },
  // 電子書籍
  {
    icon: siRakuten,
    presetIds: ["rakuten-magazine"],
    names: ["楽天マガジン", "Rakuten", "楽天"],
  },
  {
    icon: siAudible,
    presetIds: ["audible"],
    names: ["Audible", "オーディブル"],
  },
  // ゲーム
  {
    icon: siPlaystation,
    presetIds: ["playstation-plus"],
    names: ["PlayStation Plus", "PlayStation", "PS Plus", "プレイステーション"],
  },
  {
    icon: siApplearcade,
    presetIds: ["apple-arcade"],
    names: ["Apple Arcade"],
  },
  {
    icon: siEa,
    presetIds: ["ea-play"],
    names: ["EA Play", "EA"],
  },
  {
    icon: siGoogleplay,
    presetIds: ["google-play-pass"],
    names: ["Google Play Pass", "Google Play"],
  },
  // 生活
  {
    icon: siUber,
    presetIds: ["uber-one"],
    names: ["Uber One", "Uber", "ウーバー"],
  },
];

/** マッチ用にサービス名を正規化（小文字化＋英数字以外を除去。日本語はそのまま残す）。 */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^\p{Letter}\p{Number}]/gu, "");
}

const BY_PRESET_ID = new Map<string, BrandIcon>();
const BY_NAME = new Map<string, BrandIcon>();
for (const entry of BRANDS) {
  for (const id of entry.presetIds ?? []) BY_PRESET_ID.set(id, entry.icon);
  for (const name of entry.names) BY_NAME.set(normalize(name), entry.icon);
}

/** サブスク（または preset 候補）に対応する単色ロゴ。無ければ null。 */
export function getServiceIcon(input: {
  presetId?: string;
  serviceName?: string;
}): BrandIcon | null {
  if (input.presetId) {
    const byId = BY_PRESET_ID.get(input.presetId);
    if (byId) return byId;
  }
  if (input.serviceName) {
    const byName = BY_NAME.get(normalize(input.serviceName));
    if (byName) return byName;
  }
  return null;
}
