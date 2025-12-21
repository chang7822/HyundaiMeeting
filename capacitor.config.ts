import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solo.meeting',
  appName: 'Solo Meeting',
  webDir: 'build',
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-1352765336263182~2662629184',
      testingDevices: ['YOUR_DEVICE_ID']
    }
  }
};

export default config;
