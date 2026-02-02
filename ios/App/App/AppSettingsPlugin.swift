import Foundation
import Capacitor
import UIKit

/// iOS 앱 설정 화면으로 이동하는 플러그인
/// 사용자가 알림 권한을 거부한 후, 수동으로 설정에서 허용하도록 안내할 때 사용
@objc(AppSettingsPlugin)
public class AppSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    
    /// Capacitor 플러그인 식별자
    public let identifier = "AppSettingsPlugin"
    
    /// JavaScript에서 호출 가능한 메서드 정의
    public let jsName = "AppSettings"
    
    /// 플러그인 메서드 목록
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]
    
    /// 앱 설정 화면 열기
    /// JavaScript에서 AppSettings.open() 으로 호출 가능
    @objc func open(_ call: CAPPluginCall) {
        // UI 작업은 메인 쓰레드에서 실행
        DispatchQueue.main.async {
            // iOS 설정 앱의 이 앱 설정 화면 URL
            if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
                // URL을 열 수 있는지 확인
                if UIApplication.shared.canOpenURL(settingsUrl) {
                    // 설정 앱 열기
                    UIApplication.shared.open(settingsUrl, options: [:]) { success in
                        if success {
                            // 성공: JavaScript에 성공 응답
                            call.resolve()
                        } else {
                            // 실패: JavaScript에 에러 응답
                            call.reject("Failed to open settings")
                        }
                    }
                } else {
                    // URL을 열 수 없음
                    call.reject("Cannot open settings URL")
                }
            } else {
                // 잘못된 URL
                call.reject("Invalid settings URL")
            }
        }
    }
}
