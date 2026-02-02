import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solo.meeting',
  appName: '직쏠공',
  webDir: 'build',
  // 원격 서버 모드: 앱이 Render 서버에서 웹 파일을 로드
  // main 브랜치 변경 시 자동으로 앱에 반영됨
  //server 부분 주석처리시 로컬 서버 모드로 변경
  server: {
    url: 'https://automatchingway.com',
    cleartext: false, // HTTPS 사용
  },

  android: {
    allowMixedContent: true, // WebView Mixed Content 허용
    // Android WebView의 origin을 명시적으로 설정
    // 기본값은 capacitor://localhost이지만, 일부 경우 https://localhost로 표시될 수 있음
  },
  ios: {
    // iOS 전용 설정
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-1352765336263182~2662629184', // Android
      iosAppId: 'ca-app-pub-1352765336263182~9266276922', // iOS
      testingDevices: ['YOUR_DEVICE_ID']
    }
  }
};

export default config;
