const admin = require('firebase-admin');
const path = require('path');

let app;

function getFirebaseApp() {
  if (app) return app;

  /**
   * 서비스 계정 로딩 전략
   * - 운영(Render 등): 환경변수 FIREBASE_SERVICE_ACCOUNT_JSON 에 전체 JSON 문자열 저장
   * - 로컬 개발: backend/firebase-service-account.json 파일 사용
   */
  let serviceAccount;

  const rawFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawFromEnv) {
    try {
      serviceAccount = JSON.parse(rawFromEnv);
    } catch (e) {
      console.error('[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON 파싱 오류:', e);
      throw e;
    }
  } else {
    // 로컬 개발용: 파일에서 로드 (이 파일은 .gitignore 로 Git에 올리지 않음)
    // eslint-disable-next-line global-require, import/no-dynamic-require
    serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return app;
}

function getMessaging() {
  const appInstance = getFirebaseApp();
  return admin.messaging(appInstance);
}

module.exports = {
  getMessaging,
};


