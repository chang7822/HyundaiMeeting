import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

// Firebase 설정은 전부 .env 에서만 읽도록 구성
// (값은 나중에 Firebase 콘솔에서 프로젝트 생성 후 채우면 됨)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// VAPID Key (.env 에 REACT_APP_FIREBASE_VAPID_KEY 로 설정 예정)
export const FIREBASE_VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

let messagingPromise: Promise<Messaging | null> | null = null;

/**
 * 브라우저에서만 Firebase Messaging 인스턴스를 가져오는 헬퍼
 * - 알림 미지원 환경에서는 null 반환
 * - env / 초기화 오류 시에도 null 반환 (토스트 대신 콘솔 경고)
 */
export function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      // Firebase isSupported() 대신 직접 환경 체크
      const hasBasicSupport =
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        (window.isSecureContext || window.location.hostname === 'localhost');

      if (!hasBasicSupport) {
        console.error('[push] 이 환경에서는 Web Push를 사용할 수 없습니다.');
        console.error('[push] 체크:', {
          isSecureContext: window.isSecureContext,
          href: window.location.href,
          hasServiceWorker: 'serviceWorker' in navigator,
          hasPushManager: 'PushManager' in window,
          hasNotification: 'Notification' in window,
        });
        return null;
      }

      const hasConfig =
        !!firebaseConfig.apiKey &&
        !!firebaseConfig.projectId &&
        !!firebaseConfig.messagingSenderId &&
        !!firebaseConfig.appId;

      if (!hasConfig) {
        console.error('[push] Firebase 설정(env)이 아직 완전히 채워지지 않았습니다. (푸시 초기화 생략)');
        console.error('[push] env 체크:', {
          apiKey: !!firebaseConfig.apiKey,
          projectId: !!firebaseConfig.projectId,
          messagingSenderId: !!firebaseConfig.messagingSenderId,
          appId: !!firebaseConfig.appId,
        });
        return null;
      }

      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
      const messaging = getMessaging(app);
      console.info('[push] Firebase Messaging 초기화 성공');
      return messaging;
    } catch (e) {
      console.error('[push] Firebase Messaging 초기화 중 오류:', e);
      return null;
    }
  })();

  return messagingPromise;
}


