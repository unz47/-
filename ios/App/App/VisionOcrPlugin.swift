import Foundation
import Capacitor
import Vision
import UIKit

/// レシートOCR（§11）。JS から呼ばれ、Apple Vision で端末内 OCR して行データを返す。
/// 返す座標は正規化(0〜1)・原点左下（Vision 規約。TS 側 OcrLine と一致）。
/// 画像は一切外部送信しない。
@objc(VisionOcrPlugin)
public class VisionOcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VisionOcrPlugin"
    public let jsName = "VisionOcr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognizeText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise)
    ]

    /// 端末能力（§11.9）。TS 側が抽出方式（llm / heuristic）を分岐するのに使う。
    /// 現状は端末内LLM=false 固定（まず非対応機経路=Vision+パースで動かす）。
    /// TODO(§11.9): LLMアーム実装時に Foundation Models の availability で実検出へ差し替える
    ///   （iOS26+ / A17 Pro〜。`if #available(iOS 26, *)` + SystemLanguageModel）。
    @objc func getCapabilities(_ call: CAPPluginCall) {
        call.resolve(["onDeviceLLM": false])
    }

    @objc func recognizeText(_ call: CAPPluginCall) {
        print("[VisionOcr] recognizeText called. path=\(call.getString("path") ?? "nil") base64?=\(call.getString("base64") != nil)")
        guard let cgImage = loadImage(call) else {
            print("[VisionOcr] 画像を読み込めませんでした")
            call.reject("画像を読み込めませんでした")
            return
        }
        print("[VisionOcr] image loaded: \(cgImage.width)x\(cgImage.height)")

        let request = VNRecognizeTextRequest { request, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
            var lines: [[String: Any]] = []
            for o in observations {
                guard let top = o.topCandidates(1).first else { continue }
                let b = o.boundingBox
                lines.append([
                    "text": top.string,
                    "confidence": top.confidence,
                    "x": b.minX,
                    "y": b.minY,
                    "width": b.width,
                    "height": b.height
                ])
            }
            print("[VisionOcr] recognized \(lines.count) lines")
            call.resolve(["lines": lines])
        }
        request.recognitionLanguages = ["ja-JP", "en-US"]
        request.recognitionLevel = .accurate
        // レシートは金額・店舗番号・略語が多く、言語補正は誤補正（例: 数字→単語）の害が大きい。
        // §11.9: 補正オフが精度向上の要。
        request.usesLanguageCorrection = false

        DispatchQueue.global(qos: .userInitiated).async {
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    /// path（ファイルURL/パス）優先、なければ base64 から CGImage を作る。
    private func loadImage(_ call: CAPPluginCall) -> CGImage? {
        if let path = call.getString("path"), !path.isEmpty {
            let url = path.hasPrefix("file://")
                ? (URL(string: path) ?? URL(fileURLWithPath: path))
                : URL(fileURLWithPath: path)
            if let data = try? Data(contentsOf: url), let img = UIImage(data: data) {
                return img.cgImage
            }
        }
        if let b64 = call.getString("base64") {
            let clean = b64.contains(",") ? String(b64.split(separator: ",").last ?? "") : b64
            if let data = Data(base64Encoded: clean), let img = UIImage(data: data) {
                return img.cgImage
            }
        }
        return nil
    }
}
