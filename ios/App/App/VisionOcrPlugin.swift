import Foundation
import Capacitor
import Vision
import VisionKit
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
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanDocument", returnType: CAPPluginReturnPromise)
    ]

    /// scanDocument 中の保留 call（VisionKit のデリゲート完了まで保持）。
    private var pendingScanCall: CAPPluginCall?

    /// VisionKit ドキュメントスキャナで撮影する（§11.9）。
    /// 縁検出・台形補正・コントラスト強調された画像を temp に書き出し、その path を返す。
    /// OCR は既存の recognizeText が担う（撮影と認識を分離）。キャンセル時は { canceled: true }。
    @objc func scanDocument(_ call: CAPPluginCall) {
        guard VNDocumentCameraViewController.isSupported else {
            call.reject("この端末はドキュメントスキャナに対応していません")
            return
        }
        self.pendingScanCall = call
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                print("[VisionOcr] scanDocument: presenter(viewController) が nil")
                self.pendingScanCall = nil
                call.reject("画面を表示できませんでした")
                return
            }
            print("[VisionOcr] scanDocument: スキャナを表示")
            let scanner = VNDocumentCameraViewController()
            scanner.delegate = self
            presenter.present(scanner, animated: true)
        }
    }

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

// MARK: - VisionKit ドキュメントスキャナ（§11.9）
extension VisionOcrPlugin: VNDocumentCameraViewControllerDelegate {
    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFinishWith scan: VNDocumentCameraScan
    ) {
        print("[VisionOcr] didFinishWith pageCount=\(scan.pageCount)")
        controller.dismiss(animated: true)
        let call = pendingScanCall
        pendingScanCall = nil
        guard scan.pageCount > 0 else {
            print("[VisionOcr] pageCount=0 のため canceled 扱い")
            call?.resolve(["canceled": true])
            return
        }
        // レシートは 1 枚想定。先頭ページの補正済み画像を temp に書き出して path を返す。
        let image = scan.imageOfPage(at: 0)
        guard let data = image.jpegData(compressionQuality: 0.9) else {
            call?.reject("スキャン画像の変換に失敗しました")
            return
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("receipt-scan-\(UUID().uuidString).jpg")
        do {
            try data.write(to: url)
            print("[VisionOcr] scanned page saved: \(url.path)")
            call?.resolve(["path": url.path])
        } catch {
            call?.reject(error.localizedDescription)
        }
    }

    public func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        print("[VisionOcr] スキャナをキャンセル")
        controller.dismiss(animated: true)
        let call = pendingScanCall
        pendingScanCall = nil
        call?.resolve(["canceled": true])
    }

    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFailWithError error: Error
    ) {
        controller.dismiss(animated: true)
        let call = pendingScanCall
        pendingScanCall = nil
        call?.reject(error.localizedDescription)
    }
}
