import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';

// Firebase 설정은 전부 .env 에서만 읽도록 구성
// (값은 Firebase 콘솔에서 발급받은 값으로 채우면 됨)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// VAPID Key (.env 에 REACT_APP_FIREBASE_VAPID_KEY 로 설정)
export const FIREBASE_VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

/**
 * 네이티브 앱 환경인지 체크
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

let messagingPromise: Promise<Messaging | null> | null = null;

/**
 * 브라우저에서만 Firebase Messaging 인스턴스를 가져오는 헬퍼
 * - 알림 미지원 환경에서는 null 반환
 * - env / 초기화 오류 시에도 null 반환 (토스트 대신 콘솔 경고)
 */
//check

export function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      // 브라우저 환경 지원 여부 체크
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
      // console.info('[push] Firebase Messaging 초기화 성공');
      return messaging;
    } catch (e) {
      console.error('[push] Firebase Messaging 초기화 중 오류:', e);
      return null;
    }
  })();

  return messagingPromise;
}

/**
 * 네이티브 앱에서 푸시 권한 상태 조회 (@capacitor-firebase/messaging)
 */
export async function getNativePushPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const result = await FirebaseMessaging.checkPermissions();
    const receive = result.receive === 'prompt-with-rationale' ? 'prompt' : result.receive;
    return receive as 'granted' | 'denied' | 'prompt';
  } catch (e) {
    console.error('[push] getNativePushPermissionStatus 실패:', e);
    return null;
  }
}

/**
 * 네이티브 앱에서 푸시 권한 요청 (@capacitor-firebase/messaging)
 */
export async function requestNativePushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!Capacitor.isNativePlatform()) return 'denied';
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const result = await FirebaseMessaging.requestPermissions();
    const receive = result.receive === 'prompt-with-rationale' ? 'prompt' : result.receive;
    return receive as 'granted' | 'denied' | 'prompt';
  } catch (e) {
    console.error('[push] requestNativePushPermission 실패:', e);
    return 'denied';
  }
}

/**
 * 네이티브 앱에서 푸시 알림 토큰 가져오기 (FCM 토큰, @capacitor-firebase/messaging)
 * @param skipPermissionCheck 권한 확인을 건너뛸지 여부 (이미 권한이 확인된 경우 true)
 */
export async function getNativePushToken(skipPermissionCheck: boolean = false): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    if (!skipPermissionCheck) {
      const permResult = await FirebaseMessaging.requestPermissions();
      const receive = permResult.receive === 'prompt-with-rationale' ? 'prompt' : permResult.receive;
      if (receive !== 'granted') {
        console.warn('[push] 네이티브 푸시 알림 권한이 거부되었습니다.');
        return null;
      }
    }

    const { token } = await FirebaseMessaging.getToken();
    if (token) {
      console.log('[push] FCM 토큰 수신:', token.substring(0, 20) + '...');
    }
    return token || null;
  } catch (error) {
    console.error('[push] 네이티브 푸시 토큰 가져오기 실패:', error);
    return null;
  }
}

/**
 * 네이티브 앱에서 푸시 알림 리스너 설정 (@capacitor-firebase/messaging)
 */
export async function setupNativePushListeners(onNotificationReceived?: (notification: any) => void) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    await FirebaseMessaging.addListener('notificationReceived', (event: any) => {
      if (event.notification && onNotificationReceived) {
        onNotificationReceived(event.notification);
      }
    });

    await FirebaseMessaging.addListener('notificationActionPerformed', (event: any) => {
      const data = event.notification?.data ?? {};
      let linkUrl = data.linkUrl;

      if (!linkUrl) {
        switch (data.type) {
          case 'chat_unread':
            if (data.senderId) linkUrl = `/chat/${data.senderId}`;
            break;
          case 'community_comment':
            if (data.postId) linkUrl = `/community?postId=${data.postId}&openComments=true`;
            break;
          case 'community_delete':
            linkUrl = '/community';
            break;
          case 'notice':
            linkUrl = '/notice';
            break;
          case 'support':
            linkUrl = '/my-support';
            break;
          case 'extra_match_apply':
          case 'extra_match_accept':
          case 'extra_match_reject':
            linkUrl = '/extra-matching';
            break;
          case 'matching_application_start':
            linkUrl = '/main';
            break;
          case 'matching_result_announce':
            linkUrl = '/matching-history';
            break;
          default:
            if (data.postId) {
              linkUrl = `/community?postId=${data.postId}&openComments=true`;
            } else {
              linkUrl = '/main';
            }
        }
      }

      if (linkUrl) {
        window.dispatchEvent(new CustomEvent('push-notification-clicked', {
          detail: { linkUrl, data },
        }));
      }
    });
  } catch (error) {
    console.error('[push] 네이티브 푸시 리스너 설정 실패:', error);
  }
}
