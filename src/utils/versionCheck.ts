/**
 * 앱 버전 체크 및 업데이트 유도 시스템
 * 
 * 기능:
 * - 서버에서 최소/최신 버전 정보 가져오기
 * - 강제 업데이트 / 선택적 업데이트 판별
 * - 스토어로 이동 (iOS App Store / Google Play Store)
 * - 플랫폼별 개별 제어 가능
 */

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface VersionPolicy {
  // 현재 서버에서 관리하는 버전 정보
  ios: {
    minimumVersion: string;  // 이것보다 낮으면 강제 업데이트
    latestVersion: string;   // 최신 버전
    storeUrl: string;        // App Store URL
  };
  android: {
    minimumVersion: string;
    latestVersion: string;
    storeUrl: string;        // Google Play Store URL
  };
  messages: {
    forceUpdate: string;      // 강제 업데이트 메시지
    optionalUpdate: string;   // 선택적 업데이트 메시지
  };
}

export type UpdateType = 'none' | 'optional' | 'force';

export interface VersionCheckResult {
  type: UpdateType;
  currentVersion: string;
  latestVersion: string;
  message: string;
  storeUrl?: string;
}

/**
 * 버전 문자열 비교 (semantic versioning)
 * @returns -1: v1 < v2, 0: v1 = v2, 1: v1 > v2
 */
const compareVersion = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
};

/**
 * 현재 앱 버전 가져오기
 */
export const getCurrentVersion = async (): Promise<string> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      // 웹에서는 package.json 버전 반환 (테스트용)
      return '0.1.0';
    }

    const appInfo = await App.getInfo();
    return appInfo.version; // 예: "1.0.0"
  } catch (error) {
    console.error('[VersionCheck] Failed to get app version:', error);
    return '0.0.0';
  }
};

/**
 * 현재 플랫폼 가져오기
 */
const getCurrentPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
};

/**
 * 스토어 URL 열기
 */
export const openStore = async (storeUrl: string) => {
  try {
    if (!Capacitor.isNativePlatform()) {
      window.open(storeUrl, '_blank');
      return;
    }

    // 네이티브 앱에서는 스토어 앱으로 이동
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: storeUrl });
  } catch (error) {
    console.error('[VersionCheck] Failed to open store:', error);
    // 폴백: 일반 브라우저로 열기
    window.open(storeUrl, '_blank');
  }
};

/**
 * 서버에서 버전 정책 가져오기
 * 
 * 백엔드에서 다음 API를 구현해야 합니다:
 * GET /api/system/version-policy
 * 
 * 응답 예시:
 * {
 *   "ios": {
 *     "minimumVersion": "1.0.0",
 *     "latestVersion": "1.2.0",
 *     "storeUrl": "https://apps.apple.com/app/id123456789"
 *   },
 *   "android": {
 *     "minimumVersion": "1.0.0",
 *     "latestVersion": "1.2.0",
 *     "storeUrl": "https://play.google.com/store/apps/details?id=com.solo.meeting"
 *   },
 *   "messages": {
 *     "forceUpdate": "필수 업데이트가 필요합니다",
 *     "optionalUpdate": "새로운 버전을 사용하시겠어요?"
 *   }
 * }
 */
export const fetchVersionPolicy = async (): Promise<VersionPolicy | null> => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/system/version-policy`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const policy: VersionPolicy = await response.json();
    return policy;
  } catch (error) {
    console.error('[VersionCheck] Failed to fetch version policy:', error);
    return null;
  }
};

/**
 * 버전 체크 수행
 * @returns 업데이트 필요 여부 및 상세 정보
 */
export const checkVersion = async (): Promise<VersionCheckResult> => {
  try {
    // 1. 현재 버전 가져오기
    const currentVersion = await getCurrentVersion();

    // 2. 서버 정책 가져오기
    const policy = await fetchVersionPolicy();

    if (!policy) {
      // 서버 정책을 가져올 수 없으면 업데이트 안 함
      return {
        type: 'none',
        currentVersion,
        latestVersion: currentVersion,
        message: '',
      };
    }

    // 3. 플랫폼 확인
    const platform = getCurrentPlatform();

    if (platform === 'web') {
      // 웹에서는 버전 체크 안 함
      return {
        type: 'none',
        currentVersion,
        latestVersion: currentVersion,
        message: '',
      };
    }

    const platformPolicy = policy[platform];

    // 4. 최소 버전 체크 (강제 업데이트)
    if (compareVersion(currentVersion, platformPolicy.minimumVersion) < 0) {
      return {
        type: 'force',
        currentVersion,
        latestVersion: platformPolicy.latestVersion,
        message: policy.messages.forceUpdate || '필수 업데이트가 필요합니다',
        storeUrl: platformPolicy.storeUrl,
      };
    }

    // 5. 최신 버전 체크 (선택적 업데이트)
    if (compareVersion(currentVersion, platformPolicy.latestVersion) < 0) {
      return {
        type: 'optional',
        currentVersion,
        latestVersion: platformPolicy.latestVersion,
        message: policy.messages.optionalUpdate || '새로운 버전을 사용하시겠어요?',
        storeUrl: platformPolicy.storeUrl,
      };
    }

    // 6. 최신 버전 사용 중
    return {
      type: 'none',
      currentVersion,
      latestVersion: platformPolicy.latestVersion,
      message: '',
    };
  } catch (error) {
    console.error('[VersionCheck] Error during version check:', error);

    // 에러 발생 시 업데이트 안 함 (앱 사용 가능하도록)
    const currentVersion = await getCurrentVersion();
    return {
      type: 'none',
      currentVersion,
      latestVersion: currentVersion,
      message: '',
    };
  }
};

/**
 * 버전 체크 및 자동 모달 표시
 * App.tsx에서 사용
 * 
 * @param onForceUpdate - 강제 업데이트 모달 표시 콜백
 * @param onOptionalUpdate - 선택적 업데이트 모달 표시 콜백
 */
export const performVersionCheck = async (
  onForceUpdate: (result: VersionCheckResult) => void,
  onOptionalUpdate: (result: VersionCheckResult) => void
) => {
  const result = await checkVersion();

  if (result.type === 'force') {
    onForceUpdate(result);
  } else if (result.type === 'optional') {
    onOptionalUpdate(result);
  }
};
