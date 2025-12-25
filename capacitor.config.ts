import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solo.meeting',
  appName: '직쏠공',
  webDir: 'build',
  server: {
    androidScheme: 'http', // HTTP로 로드하여 Mixed Content 문제 해결
  },
  android: {
    allowMixedContent: true, // WebView Mixed Content 허용 (개발 환경용)
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-1352765336263182~2662629184',
      testingDevices: ['YOUR_DEVICE_ID']
    }
  }
};

export default config;
