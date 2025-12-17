/* eslint-disable no-undef */
// Firebase Cloud Messaging 서비스 워커
// - 실제 firebaseConfig 값은 나중에 Firebase 콘솔에서 발급받은 값으로 교체하면 됩니다.

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

    const notificationTitle = (payload.notification && payload.notification.title) || '새 알림';
    const notificationOptions = {
      body: (payload.notification && payload.notification.body) || '',
      icon: '/logo192.png',
      data: payload.data || null,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}


