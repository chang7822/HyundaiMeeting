import UIKit
import Capacitor

/// Android와 동일하게 상단바·네비바와 앱 화면이 겹치지 않도록 WebView를 safe area 안에만 그리도록 합니다.
///
/// **Android 방식**: Safe Area 플러그인(initialViewportFitCover: false)이 DecorView에
/// setPadding(systemBarsInsets) 적용 → WebView가 물리적으로 상태바/네비바 아래·위에만 그려짐.
///
/// **iOS 방식 (이 클래스)**: 컨테이너 뷰를 루트로 두고, CAPBridgeViewController를 자식으로 넣은 뒤
/// 자식 뷰(WebView)의 frame을 컨테이너의 safe area에 맞춤 → 동일한 시각적 결과.
final class SafeAreaBridgeViewController: UIViewController {

    private var bridgeViewController: CAPBridgeViewController?
    private var containerView: UIView!

    override func loadView() {
        containerView = UIView(frame: UIScreen.main.bounds)
        containerView.backgroundColor = .systemBackground
        view = containerView
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        let bridgeVC = CAPBridgeViewController()
        addChild(bridgeVC)
        containerView.addSubview(bridgeVC.view)
        bridgeVC.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            bridgeVC.view.topAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.topAnchor),
            bridgeVC.view.leadingAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.leadingAnchor),
            bridgeVC.view.trailingAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.trailingAnchor),
            bridgeVC.view.bottomAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.bottomAnchor)
        ])
        bridgeVC.didMove(toParent: self)
        bridgeViewController = bridgeVC
    }

    /// 플러그인 등에서 CAPBridgeViewController를 기대할 수 있으므로, 자식 bridge VC를 반환.
    override var childForStatusBarStyle: UIViewController? { bridgeViewController }
    override var childForStatusBarHidden: UIViewController? { bridgeViewController }
    override var childForHomeIndicatorAutoHidden: UIViewController? { bridgeViewController }
}
