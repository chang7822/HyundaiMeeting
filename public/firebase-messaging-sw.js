/* eslint-disable no-undef */
// Firebase Cloud Messaging 서비스 워커

importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js');

// Firebase Web 앱과 동일한 설정 (콘솔에서 발급받은 값 사용)
const firebaseConfig = {
  apiKey: "AIzaSyC-5Svx7sd4DXEPED43U217aP_GJJSASoE",
  authDomain: "solomeeting-cb35b.firebaseapp.com",
  projectId: "solomeeting-cb35b",
  messagingSenderId: "14798026674",
  appId: "1:14798026674:web:2b1eb76bde820cc60796ab",
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // 중복 초기화/설정 오류는 콘솔에만 남기고 무시
  console.warn('[firebase-messaging-sw] Firebase 초기화 오류:', e);
}

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[firebase-messaging-sw] messaging 초기화 오류:', e);
}

if (messaging) {
  messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // notification 필드가 있으면 FCM이 자동으로 알림을 표시하므로 중복 방지
    // notification 필드가 없을 때만 수동으로 알림 표시
    if (payload.notification && payload.notification.title) {
      // FCM이 자동으로 알림을 표시하므로 여기서는 아무것도 하지 않음
      console.log('[firebase-messaging-sw.js] notification 필드가 있어 FCM이 자동으로 알림을 표시합니다.');
      return;
    }

    // data-only 메시지인 경우에만 수동으로 알림 표시
    const notificationTitle =
      (payload.data && payload.data.title) ||
      '새 알림';

    const notificationBody =
      (payload.data && payload.data.body) ||
      '';

    const notificationOptions = {
      body: notificationBody,
      icon: '/logo192.png',
      data: payload.data || null,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

