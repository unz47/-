import CoreImage
import ExpoModulesCore
import UIKit
import Vision

// 端末内レシートOCR（§11.9）。画像は一切外部送信しない。
// 撮影は JS(expo-image-picker)で1枚 → recognizeText(自動台形補正 + Vision OCR) → JS。
public class VisionOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VisionOcr")

    AsyncFunction("getCapabilities") { () -> [String: Any] in
      // TODO(§11.9): 対応機(A17 Pro〜/iOS26+)で Foundation Models 可否を実検出に差し替える。
      return ["onDeviceLLM": false]
    }

    AsyncFunction("recognizeText") { (path: String, promise: Promise) in
      guard let cgImage = loadCGImage(path) else {
        promise.reject("E_IMAGE", "画像を読み込めませんでした")
        return
      }
      // 撮影画像に対し書類矩形を検出して台形補正（失敗時は原画像のまま）。
      let target = correctDocumentPerspective(cgImage)

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
        let handler = VNImageRequestHandler(cgImage: target, options: [:])
        do {
          try handler.perform([request])
        } catch {
          promise.reject("E_OCR", error.localizedDescription)
        }
      }
    }
  }
}

private func loadCGImage(_ path: String) -> CGImage? {
  let url = path.hasPrefix("file://")
    ? (URL(string: path) ?? URL(fileURLWithPath: path))
    : URL(fileURLWithPath: path)
  if let data = try? Data(contentsOf: url), let img = UIImage(data: data) {
    return img.cgImage
  }
  return nil
}

/// 撮影画像から書類の矩形を検出し、台形補正した画像を返す。検出/補正に失敗したら原画像。
private func correctDocumentPerspective(_ cgImage: CGImage) -> CGImage {
  let ciImage = CIImage(cgImage: cgImage)
  let width = ciImage.extent.width
  let height = ciImage.extent.height

  let request = VNDetectDocumentSegmentationRequest()
  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
  do {
    try handler.perform([request])
  } catch {
    return cgImage
  }
  guard let obs = (request.results as? [VNRectangleObservation])?.first else {
    return cgImage
  }

  // 正規化座標（原点左下）→ ピクセル座標へ。
  func vec(_ p: CGPoint) -> CIVector {
    return CIVector(x: p.x * width, y: p.y * height)
  }
  guard let filter = CIFilter(name: "CIPerspectiveCorrection") else {
    return cgImage
  }
  filter.setValue(ciImage, forKey: kCIInputImageKey)
  filter.setValue(vec(obs.topLeft), forKey: "inputTopLeft")
  filter.setValue(vec(obs.topRight), forKey: "inputTopRight")
  filter.setValue(vec(obs.bottomLeft), forKey: "inputBottomLeft")
  filter.setValue(vec(obs.bottomRight), forKey: "inputBottomRight")

  guard let output = filter.outputImage else { return cgImage }
  let context = CIContext()
  return context.createCGImage(output, from: output.extent) ?? cgImage
}
