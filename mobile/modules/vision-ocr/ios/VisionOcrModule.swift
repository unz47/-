import ExpoModulesCore
import UIKit
import Vision
import VisionKit

// 端末内レシートOCR（§11.9）。画像は一切外部送信しない。
// JS → scanDocument(VisionKitスキャナ・台形補正) → recognizeText(Vision OCR) → JS。
public class VisionOcrModule: Module {
  // scanDocument 中の保留 Promise（VisionKit デリゲート完了まで保持）。
  private var pendingScan: Promise?

  public func definition() -> ModuleDefinition {
    Name("VisionOcr")

    AsyncFunction("getCapabilities") { () -> [String: Any] in
      // TODO(§11.9): 対応機(A17 Pro〜/iOS26+)で Foundation Models 可否を実検出に差し替える。
      return ["onDeviceLLM": false]
    }

    AsyncFunction("scanDocument") { (promise: Promise) in
      guard VNDocumentCameraViewController.isSupported else {
        promise.reject("E_UNSUPPORTED", "この端末はドキュメントスキャナに対応していません")
        return
      }
      DispatchQueue.main.async {
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("E_NO_VC", "画面を表示できませんでした")
          return
        }
        self.pendingScan = promise
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = self
        presenter.present(scanner, animated: true)
      }
    }

    AsyncFunction("recognizeText") { (path: String, promise: Promise) in
      guard let cgImage = Self.loadImage(path) else {
        promise.reject("E_IMAGE", "画像を読み込めませんでした")
        return
      }
      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          promise.reject("E_OCR", error.localizedDescription)
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
            "height": b.height,
          ])
        }
        promise.resolve(["lines": lines])
      }
      request.recognitionLanguages = ["ja-JP", "en-US"]
      request.recognitionLevel = .accurate
      // レシートは金額・店舗番号が多く、言語補正の誤補正の害が大きい（§11.9）。
      request.usesLanguageCorrection = false

      DispatchQueue.global(qos: .userInitiated).async {
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
          try handler.perform([request])
        } catch {
          promise.reject("E_OCR", error.localizedDescription)
        }
      }
    }
  }

  private static func loadImage(_ path: String) -> CGImage? {
    let url = path.hasPrefix("file://")
      ? (URL(string: path) ?? URL(fileURLWithPath: path))
      : URL(fileURLWithPath: path)
    if let data = try? Data(contentsOf: url), let img = UIImage(data: data) {
      return img.cgImage
    }
    return nil
  }
}

// MARK: - VisionKit ドキュメントスキャナ（台形補正・コントラスト強調はOS側）
extension VisionOcrModule: VNDocumentCameraViewControllerDelegate {
  public func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFinishWith scan: VNDocumentCameraScan
  ) {
    controller.dismiss(animated: true)
    let promise = pendingScan
    pendingScan = nil
    guard scan.pageCount > 0 else {
      promise?.resolve(["canceled": true])
      return
    }
    let image = scan.imageOfPage(at: 0)
    guard let data = image.jpegData(compressionQuality: 0.9) else {
      promise?.reject("E_CONVERT", "スキャン画像の変換に失敗しました")
      return
    }
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("receipt-scan-\(UUID().uuidString).jpg")
    do {
      try data.write(to: url)
      promise?.resolve(["path": url.path])
    } catch {
      promise?.reject("E_WRITE", error.localizedDescription)
    }
  }

  public func documentCameraViewControllerDidCancel(
    _ controller: VNDocumentCameraViewController
  ) {
    controller.dismiss(animated: true)
    let promise = pendingScan
    pendingScan = nil
    promise?.resolve(["canceled": true])
  }

  public func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFailWithError error: Error
  ) {
    controller.dismiss(animated: true)
    let promise = pendingScan
    pendingScan = nil
    promise?.reject("E_SCAN", error.localizedDescription)
  }
}
