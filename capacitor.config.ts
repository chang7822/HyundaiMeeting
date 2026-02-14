/// <reference types="@capacitor-community/safe-area" />
import type { CapacitorConfig } from '@capacitor/cli';
import { SystemBarsStyle } from '@capacitor-community/safe-area';

const config: CapacitorConfig = {
  appId: 'com.solo.meeting',
  appName: '직쏠공',
  webDir: 'build',
  // 원격 서버 모드: 앱이 Render 서버에서 웹 파일을 로드
  // main 브랜치 변경 시 자동으로 앱에 반영됨
  // server 주석처리시 로컬 번들 사용(실기기 테스트용)
  server: {
    url: 'https://automatchingway.com',
    cleartext: false, // HTTPS 사용
  },

  android: {
    allowMixedContent: true, // WebView Mixed Content 허용
    // @capacitor-community/safe-area 플러그인 권장: 'force'는 플러그인과 충돌할 수 있음 → 'disable'
    adjustMarginsForEdgeToEdge: 'disable',
  } as CapacitorConfig['android'],
  ios: {
    // iOS 전용 설정
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'disable', // @capacitor-community/safe-area 필수 설정
    },
    SafeArea: {
      statusBarStyle: SystemBarsStyle.Light,
      navigationBarStyle: SystemBarsStyle.Light,
      // padding 모드: decor view에 상태바·네비바 inset만큼 패딩 → 콘텐츠가 구간 안에만 배치
      initialViewportFitCover: false,
      detectViewportFitCoverChanges: false,
    },
    AdMob: {
      appId: 'ca-app-pub-1352765336263182~2662629184', // Android
      iosAppId: 'ca-app-pub-1352765336263182~9266276922', // iOS
      testingDevices: ['YOUR_DEVICE_ID']
    },
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  }
};

export default config;
