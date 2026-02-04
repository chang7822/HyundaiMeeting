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
 * 네이티브 앱에서 푸시 알림 토큰 가져오기 (Capacitor)
 * @param skipPermissionCheck 권한 확인을 건너뛸지 여부 (이미 권한이 확인된 경우 true)
 */
export async function getNativePushToken(skipPermissionCheck: boolean = false): Promise<string | null> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { Capacitor } = await import('@capacitor/core');
    
    // 권한 확인이 필요한 경우에만 요청
    if (!skipPermissionCheck) {
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive !== 'granted') {
        console.warn('[push] 네이티브 푸시 알림 권한이 거부되었습니다.');
        return null;
      }
    }
    
    // 푸시 알림 등록
    console.log('[push] 🔵 PushNotifications.register() 호출 시작');
    await PushNotifications.register();
    console.log('[push] 🔵 PushNotifications.register() 호출 완료, 토큰 대기 중...');
    
    const timeoutMs = 10000;
    
    // 토큰 받기 (Promise로 감싸기)
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('[push] 🎉 토큰 수신 성공!:', token.value);
        resolve(token.value);
      });
      
      PushNotifications.addListener('registrationError', (error) => {
        console.error('[push] ❌ 네이티브 푸시 토큰 등록 실패:', error);
        console.error('[push] 에러 상세:', JSON.stringify(error));
        resolve(null);
      });
      
      // 타임아웃
      setTimeout(() => {
        console.error('[push] ⏰ 네이티브 푸시 토큰 대기 시간 초과 (10초)');
        console.error('[push] registration 이벤트가 발생하지 않았습니다.');
        resolve(null);
      }, timeoutMs);
    });
  } catch (error) {
    console.error('[push] 네이티브 푸시 알림 초기화 실패:', error);
    return null;
  }
}

/**
 * 네이티브 앱에서 푸시 알림 리스너 설정 (Capacitor)
 */
export async function setupNativePushListeners(onNotificationReceived?: (notification: any) => void) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    
    // 푸시 알림 수신 시 (포어그라운드에서는 표시 안 함)
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      // notification 필드가 있는 알림은 백그라운드에서만 표시됨
      // 포어그라운드에서는 아무것도 하지 않음
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });
    
    // 푸시 알림 클릭 시
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      
      // 커스텀 이벤트로 알림 클릭 정보 전달 (App.tsx에서 처리)
      const data = notification.notification?.data || (notification as any).data || {};
      let linkUrl = data.linkUrl;
      
      // linkUrl이 없으면 타입별로 생성
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
          detail: { linkUrl, data }
        }));
      }
    });
  } catch (error) {
    console.error('[push] 네이티브 푸시 리스너 설정 실패:', error);
  }
}
