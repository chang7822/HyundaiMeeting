import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solo.meeting',
  appName: '직쏠공',
  webDir: 'build',
  // server 설정을 명시하지 않으면 Capacitor가 기본적으로 로컬 파일을 사용함
  // server.url이 설정되지 않으면 로컬 파일(assets/public)을 사용
  android: {
    allowMixedContent: true, // WebView Mixed Content 허용
    // Android WebView의 origin을 명시적으로 설정
    // 기본값은 capacitor://localhost이지만, 일부 경우 https://localhost로 표시될 수 있음
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-1352765336263182~2662629184',
      testingDevices: ['YOUR_DEVICE_ID']
    }
  }
};

export default config;
