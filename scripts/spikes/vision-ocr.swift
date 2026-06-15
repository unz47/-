// v0.2 スパイク1（投げ捨て）: Apple Vision でレシート画像から〈金額・店名・購入日時〉が抜けるか検証。
// iOS の Vision と同じフレームワーク。これは「エンジンが実用に足るか」だけを見るためのもの。
// 使い方: swift scripts/spikes/vision-ocr.swift <画像パス>
//   例:   swift scripts/spikes/vision-ocr.swift /tmp/receipt.jpg
import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count > 1 else {
  FileHandle.standardError.write(Data("usage: swift vision-ocr.swift <image>\n".utf8))
  exit(2)
}
let path = args[1]
guard let img = NSImage(contentsOfFile: path),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  FileHandle.standardError.write(Data("画像を読めません: \(path)\n".utf8))
  exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLanguages = ["ja-JP", "en-US"]
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([request])
let obs = request.results ?? []

// Vision の原点は左下。minY 降順 ≒ 上→下の並びに直す。
struct Line { let text: String; let conf: Float; let y: CGFloat; let x: CGFloat }
let lines: [Line] = obs.compactMap { o in
  guard let t = o.topCandidates(1).first else { return nil }
  return Line(text: t.string, conf: t.confidence, y: o.boundingBox.minY, x: o.boundingBox.minX)
}.sorted { $0.y > $1.y }

print("==== RAW（上→下 / conf\\ttext）====")
for l in lines { print(String(format: "%.2f\t%@", l.conf, l.text)) }

// ---- ナイーブ抽出（あくまで当たりを見るための素朴ロジック）----
let joined = lines.map { $0.text }

func firstMatch(_ pattern: String, _ s: String) -> String? {
  guard let re = try? NSRegularExpression(pattern: pattern) else { return nil }
  let r = NSRange(s.startIndex..., in: s)
  guard let m = re.firstMatch(in: s, range: r), let rr = Range(m.range, in: s) else { return nil }
  return String(s[rr])
}

// 日付・時刻（先に確定させ、金額の「年」誤検出を防ぐ）
let datePattern = "20[0-9]{2}[/年.\\-][0-9]{1,2}[/月.\\-][0-9]{1,2}"
let date = joined.compactMap { firstMatch(datePattern, $0) }.first
let time = joined.compactMap { firstMatch("[0-9]{1,2}:[0-9]{2}", $0) }.first
func isDateOrTimeLine(_ s: String) -> Bool {
  firstMatch(datePattern, s) != nil || firstMatch("[0-9]{1,2}:[0-9]{2}", s) != nil
}

// 金額: 日付/時刻行は除外。¥付き or 3桁以上の数字を候補に。
// 「合計」等のキーワード行に近い（同じ視覚行 y が近い）候補を最優先、なければ最大値。
func yen(_ s: String) -> Int? {
  guard !isDateOrTimeLine(s) else { return nil }
  guard let raw = firstMatch("[0-9][0-9,]{2,8}", s) else { return nil }
  return Int(raw.replacingOccurrences(of: ",", with: ""))
}
let totalKeywords = ["合計", "お会計", "総額", "ご請求", "計"]
var amount: Int? = nil
if let kw = lines.first(where: { l in totalKeywords.contains(where: { l.text.contains($0) }) }) {
  // キーワード行と y が最も近い金額候補（同一行に割れているケースを拾う）
  amount = lines
    .compactMap { l -> (Int, CGFloat)? in yen(l.text).map { ($0, abs(l.y - kw.y)) } }
    .filter { $0.1 < 0.05 }      // ほぼ同じ高さ＝同一視覚行
    .min { $0.1 < $1.1 }?.0
    ?? yen(kw.text)              // キーワード行自体に金額があればそれ
}
if amount == nil { amount = lines.compactMap { yen($0.text) }.max() }

// 店名: 先頭付近で、金額/日付/電話番号でない最初の意味のある行。
let storeBlocklist = totalKeywords + ["TEL", "電話", "領収", "レシート", "様"]
let store = lines.prefix(6).map { $0.text }.first { t in
  t.count >= 2 && yen(t) == nil
    && firstMatch("20[0-9]{2}", t) == nil
    && !storeBlocklist.contains(where: { t.contains($0) })
}

print("\n==== GUESS（素朴抽出）====")
print("店名(推定):   \(store ?? "—")")
print("金額(推定):   \(amount.map { "¥\($0)" } ?? "—")")
print("日付(推定):   \(date ?? "—")")
print("時刻(推定):   \(time ?? "—")")
print("\n認識行数: \(lines.count)")
