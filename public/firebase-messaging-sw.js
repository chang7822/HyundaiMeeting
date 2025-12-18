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

    // 서버에서 data-only 메시지로 내려보내므로, 우선 data의 title/body를 사용하고
    // 없을 경우 notification 필드를 fallback 으로 사용한다.
    const notificationTitle =
      (payload.data && payload.data.title) ||
      (payload.notification && payload.notification.title) ||
      '새 알림';

    const notificationBody =
      (payload.data && payload.data.body) ||
      (payload.notification && payload.notification.body) ||
      '';

    const notificationOptions = {
      body: notificationBody,
      icon: '/logo192.png',
      data: payload.data || null,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

