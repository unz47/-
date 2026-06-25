import UIKit
import Capacitor

/// Capacitor の標準ブリッジ VC を継承し、アプリ内ローカルプラグインを明示登録する。
/// （SPM＋アプリターゲット内プラグインは CAPBridgedPlugin 自動検出が効かないことがあるため）
/// Main.storyboard の初期 VC をこのクラスに差し替えて使う。
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(VisionOcrPlugin())
    }
}
