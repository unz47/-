# サブスク プリセット拡張 リサーチ（2026-06-14）

> 目的: `src/lib/presets.ts` を拡張するための情報収集。日本市場・2026年の**目安価格**（税込・円・整数）。
> 注意: §10「プリセット価格は固定初期値／最新価格を調べに行かない」はアプリ実行時の話。本調査は
> ユーザー依頼による一回限りの初期値整備であり、ユーザー上書き前提は変わらない。
> 海外USD建ては調査時点の概算（為替前提は各 notes 参照、目安として ¥150〜155/USD）。

## 採用方針（要点）

- 各 preset に `category` / `iconSlug`(Simple Icons slug, 任意) / `brandColor`(#RRGGBB) を追加する。
- **ロゴは外部CDN不可（外部送信なし原則）**。`simple-icons` を npm でバンドルし path を描画。
  Simple Icons 未収録（日本サービス等）は**頭文字＋ブランド色のアバター**でフォールバック（ロゴ画像は同梱しない＝商標・再配布リスク回避）。Simple Icons は CC0 だがロゴ商標は各社に帰属＝識別目的のみで使う。
- ブランド色が赤系（Netflix 等）でも、それは**ブランドアイコンの色**でありUIシグナル（赤=値上げ）とは別レイヤー。ただしアバター背景に純赤を使うとシグナルと紛れるため、フォールバックの赤系は彩度を落とすか枠で区別する。
- 価格改定が間近/直近のもの（NSO 2026-07-01、東洋経済 2026-06-01 等）は notes に明記。

## 要確認の slug（実在未確定。実装時に `cdn.simpleicons.org/<slug>` か npm で確認）
- `linemusic`（`line` は別物）, `awa` … 未確定なら null 扱い推奨。
- 確認済みで実在: netflix, appletv, dazn, spotify, applemusic, youtubemusic, amazonmusic, claude, perplexity, githubcopilot, cursor, notion, googlegemini, googleone, icloud, dropbox, adobecreativecloud, adobe, evernote, canva, 1password, audible, rakuten, playstation, nintendoswitch, xbox, applearcade, ea, googleplay, uber。
- 未収録（→アバター）: Amazon系（商標方針で削除）, Disney+, Hulu, ABEMA, U-NEXT, dアニメ, Lemino, WOWOW, TELASA, FOD, 各新聞・雑誌・日本サービス, ChatGPT/OpenAI, Midjourney, Microsoft365/Copilot。

---

## 動画配信 (video)
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| netflix | Netflix | 広告つきスタンダード890 / スタンダード1590 / プレミアム2290 | netflix | #E50914 |
| amazon-prime-video | Amazon Prime Video | プライム月額600 / 年額月割492 / 広告なしオプション+390 | – | #00A8E1 |
| disney-plus | Disney+ | スタンダード1250(年月割1042) / プレミアム1670(年月割1392) | – | #113CCF |
| apple-tv-plus | Apple TV+ | 月額900 | appletv | #000000 |
| u-next | U-NEXT | 月額2189(毎月1200pt付与) | – | #000000* |
| hulu-japan | Hulu（日本） | 見放題1026 | – | #1CE783 |
| d-anime-store | dアニメストア | 月額660（2026-02値上げ） | – | #B2D235* |
| lemino | Lemino | 無料0 / プレミアム1540（2026-02値上げ） | – | #000000* |
| dazn | DAZN | Standard月々4200 / 年間(月払)3200 / 年間一括月割2667 / Global980 | dazn | #F8F8F5 |
| abema-premium | ABEMAプレミアム | 広告なし1180 / 広告つき680（2026-04改定） | – | #43CD5E |
| wowow-on-demand | WOWOWオンデマンド | 月額2530 | – | #0068B7 |
| telasa | TELASA | 見放題990 | – | #E8380D |
| fod | FOD | スタンダード1320 / 広告付ライト976 / ポイントMAX2090 | – | #1B1464 |
| youtube-premium | YouTube Premium | 個人1280 / ファミリー2280（既存presetを維持） | youtube | #FF0000 |

## 音楽 (music)
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| spotify | Spotify | 個人1080 / 学生580 / Duo1480 / Family1880 | spotify | #1DB954 |
| apple-music | Apple Music | 個人1080(年月割900) / 学生580 / ファミリー1680 | applemusic | #FA243C |
| youtube-music | YouTube Music | 個人1080(年月割900) / 学生580 / ファミリー1680 | youtubemusic | #FF0000 |
| amazon-music-unlimited | Amazon Music Unlimited | 個人(プライム)1080(年月割900) / 個人(非プライム)1180 / 学生580 / ファミリー1980(年月割1650) | amazonmusic | #25D1DA |
| line-music | LINE MUSIC | 一般980(アプリ内1080) / 学生480(580) / ファミリー1680 | linemusic? | #4CC764 |
| awa | AWA | Standard980 / 学生480 | awa? | – |
| dhits | dヒッツ | 330コース / 690コース | – | – |
| utapass | うたパス | Unlimited980 | – | – |

## AI (ai)  ※多くがUSD建て→概算円
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| chatgpt | ChatGPT (OpenAI) | Plus3000 / Pro16800 / Pro上位30000 | – | #10A37F |
| claude | Claude (Anthropic) | Pro3100 / Max5x15500 / Max20x31000 | claude | #D97757 |
| google-ai | Google AI Pro (旧Gemini Advanced) | Pro2900 / Ultra36000 | googlegemini | #8E75B2 |
| perplexity | Perplexity | Pro3100 / Max31000 | perplexity | #1FB8CD |
| github-copilot | GitHub Copilot | Pro1550 / Pro+6045 | githubcopilot | #000000 |
| cursor | Cursor | Pro3100 / Pro+9300 / Ultra31000 | cursor | #000000 |
| midjourney | Midjourney | Basic1550 / Standard4650 / Pro9300 / Mega18600 | – | #000000 |
| microsoft-copilot-pro | Microsoft Copilot Pro | 3200（M365 Premium統合） | – | #0078D4 |
| notion-ai | Notion AI | アドオン1550 | notion | #000000 |

## クラウド/生産性 (productivity)
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| google-one | Google One | 100GB290 / 200GB440 / 2TB1450 | googleone | #4285F4 |
| icloud-plus | iCloud+ | 50GB150 / 200GB450 / 2TB1500 / 6TB4500 / 12TB9000 | icloud | #3693F3 |
| dropbox-plus | Dropbox Plus | 2TB月払1500 / 年月割1200 | dropbox | #0061FF |
| dropbox-essentials | Dropbox Essentials | 3TB2400 | dropbox | #0061FF |
| microsoft-365-personal | Microsoft 365 Personal | Copilot付2130 / Classic年月割1242 | – | #D83B01 |
| microsoft-365-family | Microsoft 365 Family | Copilot付2740 / Classic年月割1750 | – | #D83B01 |
| adobe-creative-cloud-pro | Adobe CC Pro | Pro年月々9080 / 年一括月割8580 / Standard6480 | adobecreativecloud | #DA1F26 |
| adobe-photography-plan | Adobe フォトプラン | 1TB2380 | adobe | #FF0000 |
| notion-plus | Notion Plus | 年月割1500 / 月払1800（USD建て） | notion | #000000 |
| 1password | 1Password | Individual599 / Families899（USD建て） | 1password | #3B66BC |
| evernote | Evernote | Personal1100 / Advanced年月割1492 | evernote | #00A82D |
| canva-pro | Canva Pro | 月払1180 / 年月割691 | canva | #00C4CC |

## 電子書籍/マンガ/雑誌 (books)
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| kindle-unlimited | Kindle Unlimited | 読み放題980 | – | #FF9900 |
| rakuten-magazine | 楽天マガジン | 月額572 / 年月割498 | rakuten | #BF0000 |
| d-magazine | dマガジン | 読み放題580 | – | #CC0000 |
| comic-cmoa-yomihodai | コミックシーモア読み放題 | ライト780 / フル1480 | – | #F39800 |
| book-hodai | ブック放題 | 読み放題550 | – | – |
| book-walker | BOOK☆WALKER | マンガ836 / MAX1100 | – | – |
| audible | Audible | プレミアム1500 | audible | #F8991C |
| audiobook-jp | audiobook.jp | 月額1330 / 年月割833 | – | – |

## ゲーム (gaming)
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| playstation-plus | PlayStation Plus | Essential850 / Extra1300 / Premium1550 | playstation | #003791 |
| nintendo-switch-online | Nintendo Switch Online | 個人400 / ファミリー月割483 / 個人+追加パック492 / ファミリー+追加825（2026-07-01改定後） | nintendoswitch | #E60012 |
| xbox-game-pass | Xbox Game Pass | Essential850 / Premium1300 / PC1300 / Ultimate1550（2026-04改定） | xbox | #107C10 |
| apple-arcade | Apple Arcade | 月額900（2025-11新規受付終了情報あり） | applearcade | #000000 |
| ea-play | EA Play | EA Play900（Proは円建て未確定） | ea | #FF4747 |
| google-play-pass | Google Play Pass | 月額600 | googleplay | #01875F |

## ニュース/ビジネス (news)
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| nikkei-densi | 日経電子版 | 個人4277 / ファミリー6800 | – | – |
| nikkei-business | 日経ビジネス電子版 | 月額2500 | – | – |
| newspicks-premium | NewsPicks プレミアム | 月額1850 / 年割月割1533 | – | – |
| asahi-shimbun-digital | 朝日新聞デジタル | ベーシック980 / スタンダード1980 / プレミアム3800 | – | – |
| mainichi-shimbun-digital | 毎日新聞デジタル | スタンダード1078 | – | – |
| toyokeizai-online | 東洋経済オンライン | 月額1980 / 年月割1650（2026-06新体系予定） | – | – |
| bungeishunju-plus | 文藝春秋PLUS | 月額1200 | – | – |

## 生活/その他 (lifestyle)
| id | service | plans (月額円) | slug | color |
|---|---|---|---|---|
| lyp-premium | LYPプレミアム | 月額508 | – | – |
| uber-one | Uber One | 月額498 / 年月割333 | uber | #000000 |

*印=ブランド色は推定/未確認（公式未確認）。`–`=該当なし/不明。

## 主な注意・データ品質
- **USD建て**（AIの多く・Notion・1Password）は為替で変動。円固定で持つと乖離する点をユーザーに伝える。
- **改定間近**: Nintendo Switch Online(2026-07-01)、東洋経済(2026-06-01)。NSO は改定後価格を採用済み。
- **一次情報取得不可**だった項目（Amazon系・U-NEXT公式が動的描画/403）は二次情報ベース＝推定の可能性。
- **重複排除済み**: 楽天マガジン/dマガジンは books に集約（news/lifestyle 側の重複は不採用）。
- Apple Arcade / EA Play Pro 等、新規受付終了・円建て未確定のものは notes 注意。
