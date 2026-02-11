# iOS 푸시 알림 전환 — AI 에이전트 실행 명세

> **FOR_AI_AGENT**: 이 문서는 푸시 알림을 `@capacitor/push-notifications`에서 `@capacitor-firebase/messaging`으로 전환하기 위한 **실행 명세**입니다. 사용자가 "iOS 푸시 전환 적용해줘" 또는 "docs/iOS_푸시알림_분석.md 보고 코드 수정해줘"라고 요청하면, 아래 **EXECUTION_ORDER** 순서대로만 작업하세요. **STEP 1~5(코드 수정)를 모두 끝낸 뒤에만** STEP 6(구 플러그인 제거)을 실행하세요. 순서를 바꾸면 로그인 시 알림 권한 창이 뜨지 않습니다.

---

## CONTEXT (목적)

- **문제**: iOS는 `@capacitor/push-notifications`가 APNs 디바이스 토큰을 반환하는데, 백엔드는 FCM 토큰만 받아서 iOS 푸시가 전달되지 않음.
- **해결**: `@capacitor-firebase/messaging`으로 교체해 iOS/Android 모두 FCM 토큰을 받도록 함. 백엔드(`pushService.js`, `routes/push.js`)는 수정하지 않음.
- **제거 시 주의**: `@capacitor/push-notifications` 제거는 **반드시** 새 플러그인 설치 및 코드 수정 완료 후 수행. `ios/App/CapApp-SPM/Package.swift`, `android/capacitor.settings.gradle` 등은 `npx cap sync`로 자동 갱신되므로 수동 편집 금지. `ios/App/App/AppDelegate.swift`의 `didRegisterForRemoteNotificationsWithDeviceToken`, `didFailToRegisterForRemoteNotificationsWithError`는 **삭제하지 말고 유지**하고, `didReceiveRemoteNotification`만 **추가**.

---

## EXECUTION_ORDER

```
STEP_0: 터미널 (패키지 설치)
STEP_1: ios/App/App/AppDelegate.swift (메서드 1개 추가)
STEP_2: src/firebase.ts (전체 로직 교체 — 네이티브만 Firebase Messaging 사용)
STEP_3: src/App.tsx (권한 API만 firebase.ts 새 함수로 교체)
STEP_4: src/pages/MainPage.tsx (권한 API만 firebase.ts 새 함수로 교체)
STEP_5: (선택) capacitor.config.ts 에 FirebaseMessaging 플러그인 설정
STEP_6: 터미널 (구 플러그인 제거 + cap sync)
```

---

## STEP_0: 패키지 설치

- **명령** (프로젝트 루트에서 실행):
  - `npm install @capacitor-firebase/messaging firebase`
  - `npx cap sync`
- **참고**: `firebase`가 이미 package.json에 있으면 `npm install @capacitor-firebase/messaging`만 해도 됨.

---

## STEP_1: AppDelegate.swift — didReceiveRemoteNotification 추가

- **FILE**: `ios/App/App/AppDelegate.swift`
- **ACTION**: 기존 `didRegisterForRemoteNotificationsWithDeviceToken`, `didFailToRegisterForRemoteNotificationsWithError` 메서드는 **그대로 두고**, 아래 메서드 **한 개만 추가**.
- **DO_NOT**: 위 두 메서드를 삭제하지 말 것.

**ADD** (클래스 내부, 기존 메서드들과 같은 레벨에 추가):

```swift
func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    NotificationCenter.default.post(name: Notification.Name("didReceiveRemoteNotification"), object: completionHandler, userInfo: userInfo)
}
```

---

## STEP_2: src/firebase.ts 수정

- **FILE**: `src/firebase.ts`
- **GOAL**: 네이티브(iOS/Android)일 때만 `@capacitor-firebase/messaging` 사용. 웹은 기존 `getFirebaseMessaging()` 유지.

**할 일**:

1. **추가**: `getNativePushPermissionStatus()` 함수 
   - `Capacitor.isNativePlatform()` 아니면 `return null`. 
   - `FirebaseMessaging.checkPermissions()` 호출. 
   - `result.receive === 'prompt-with-rationale'` 이면 `'prompt'`로, 아니면 `result.receive` 반환. 타입: `Promise<'granted'|'denied'|'prompt'|null>`.

2. **추가**: `requestNativePushPermission()` 함수 
   - `Capacitor.isNativePlatform()` 아니면 `return 'denied'`. 
   - `FirebaseMessaging.requestPermissions()` 호출. 
   - `result.receive === 'prompt-with-rationale'` 이면 `'prompt'`로, 아니면 `result.receive` 반환. 타입: `Promise<'granted'|'denied'|'prompt'>`.

3. **교체**: `getNativePushToken(skipPermissionCheck)` 
   - 네이티브가 아니면 `return null`. 
   - `skipPermissionCheck`가 false면 `FirebaseMessaging.requestPermissions()` 호출 후 `receive !== 'granted'`이면 `return null`. 
   - `FirebaseMessaging.getToken()` 호출해 `{ token }` 받아서 `return token` (없으면 null). 
   - **삭제**: `@capacitor/push-notifications`의 `PushNotifications.register()`, `addListener('registration'|'registrationError')`, 타임아웃 Promise 로직 전부.

4. **교체**: `setupNativePushListeners(onNotificationReceived?)` 
   - 네이티브가 아니면 return. 
   - `FirebaseMessaging.addListener('notificationReceived', ...)` 에서 `event.notification` 있으면 `onNotificationReceived?.(event.notification)` 호출. 
   - `FirebaseMessaging.addListener('notificationActionPerformed', ...)` 에서 `event.notification.data`(또는 `event.notification?.data`)로 `data` 객체 얻고, 기존과 동일한 규칙으로 `linkUrl` 계산(타입별 switch: chat_unread, community_comment, notice, support, extra_match_*, matching_*, default 등). 계산한 `linkUrl`로 `window.dispatchEvent(new CustomEvent('push-notification-clicked', { detail: { linkUrl, data } }))` 호출. 
   - **삭제**: `@capacitor/push-notifications`의 `PushNotifications.addListener(...)` 전부 및 `LocalNotifications` import(사용처가 푸시 리스너뿐이면 제거).

5. **유지**: `getFirebaseMessaging()`, `isNativeApp()`, `FIREBASE_VAPID_KEY`, firebaseConfig — 변경 없음.

**IMPORT**: 네이티브 분기 안에서만 `import('@capacitor-firebase/messaging')` 사용. 파일 상단에 `Capacitor` from `@capacitor/core` 유지.

---

## STEP_3: src/App.tsx 수정

- **FILE**: `src/App.tsx`
- **GOAL**: 네이티브 푸시 권한 확인/요청을 `PushNotifications` 대신 firebase.ts의 새 함수로 교체. 토큰/리스너 호출(`getNativePushToken`, `setupNativePushListeners`)은 그대로 두고, 내부 구현만 firebase.ts에서 변경된 상태로 둠.

**할 일**:

1. **import**: `getNativePushPermissionStatus`, `requestNativePushPermission` 를 `./firebase.ts`(또는 `./firebase`)에서 추가로 import.

2. **REPLACE**: `const { PushNotifications } = await import('@capacitor/push-notifications');` 및 그 블록 안의 `PushNotifications.checkPermissions()` 호출 
   → `getNativePushPermissionStatus()` 호출로 교체. 반환값 `receive`는 동일하게 `'prompt-with-rationale'`이면 `'prompt'`로 통일해 사용.

3. **REPLACE**: `PushNotifications.requestPermissions()` 호출 
   → `requestNativePushPermission()` 호출로 교체. 반환값도 위와 같이 `'prompt-with-rationale'` → `'prompt'` 정규화.

4. **유지**: `getNativePushToken(true)`, `setupNativePushListeners()`, `pushApi.registerToken(token)`, `push-status-changed` 이벤트, 모달 표시 로직 등은 변경하지 않음.

---

## STEP_4: src/pages/MainPage.tsx 수정

- **FILE**: `src/pages/MainPage.tsx`
- **GOAL**: 푸시 토글/권한 확인 시 `PushNotifications` 대신 firebase.ts의 `getNativePushPermissionStatus`, `requestNativePushPermission` 사용. 토큰 발급/등록은 계속 `getNativePushToken`, `setupNativePushListeners`, `pushApi.registerToken` 호출.

**할 일**:

1. **import**: `getNativePushPermissionStatus`, `requestNativePushPermission` 를 `../firebase`(또는 `../firebase.ts`)에서 추가로 import.

2. **REPLACE**: `checkPermissionAndTokenStatus` 내부의 
   `const { PushNotifications } = await import('@capacitor/push-notifications');` 및 `PushNotifications.checkPermissions()` 
   → `getNativePushPermissionStatus()` 호출로 교체. 반환값으로 `receive`(또는 동일 의미 변수) 사용, `'prompt-with-rationale'`이면 `'prompt'`로 처리. 나머지 로직(pushApi.getTokens(), hasToken, setIsPushEnabled 등)은 유지.

3. **REPLACE**: `handleTogglePush` 내부 네이티브 분기에서 
   `PushNotifications.checkPermissions()`, `PushNotifications.requestPermissions()` 
   → `getNativePushPermissionStatus()`, `requestNativePushPermission()` 호출로 교체. 권한이 granted가 아닐 때 토스트/설정 모달 처리 로직은 그대로 유지.

4. **유지**: `getNativePushToken(true)`, `setupNativePushListeners()`, `pushApi.registerToken(token)`, `pushApi.unregisterToken()` 등 호출은 변경하지 않음.

---

## STEP_5 (선택): capacitor.config.ts

- **FILE**: `capacitor.config.ts`
- **ACTION**: iOS 포어그라운드 알림 표시 옵션을 넣고 싶을 때만 적용.

**ADD** (기존 config 객체에 `plugins` 없으면 추가, 있으면 그 안에 FirebaseMessaging 추가):

```ts
plugins: {
  FirebaseMessaging: {
    presentationOptions: ['alert', 'badge', 'sound'],
  },
},
```

---

## STEP_6: 구 플러그인 제거 및 동기화

- **실행 시점**: STEP_1 ~ STEP_5(또는 STEP_4까지) 코드 수정이 **모두 완료된 후**에만 실행.

**명령** (프로젝트 루트):

1. `npm uninstall @capacitor/push-notifications`
2. `npx cap sync`

- **DO_NOT**: `ios/App/CapApp-SPM/Package.swift`, `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle` 등을 수동 편집하지 말 것. Capacitor CLI가 sync 시 자동 갱신함.

---

## FILES_SUMMARY (수정 대상만)

| 파일 | 작업 |
|------|------|
| `ios/App/App/AppDelegate.swift` | didReceiveRemoteNotification 메서드 1개 추가. didRegister/didFail 유지. |
| `src/firebase.ts` | getNativePushPermissionStatus, requestNativePushPermission 추가. getNativePushToken, setupNativePushListeners 를 @capacitor-firebase/messaging 기준으로 교체. 웹 로직 유지. |
| `src/App.tsx` | PushNotifications 대신 getNativePushPermissionStatus, requestNativePushPermission 사용. |
| `src/pages/MainPage.tsx` | PushNotifications 대신 getNativePushPermissionStatus, requestNativePushPermission 사용. |
| `capacitor.config.ts` | (선택) FirebaseMessaging.presentationOptions 추가. |
| `package.json` | STEP_0에서 @capacitor-firebase/messaging 추가, STEP_6에서 @capacitor/push-notifications 제거. |

---

## NO_CHANGES (수정하지 말 것)

- `backend/` 전부 (pushService.js, routes/push.js 등).
- `src/services/api.ts` 의 pushApi.
- `ios/App/App/App.entitlements` (개발은 development, 배포는 production — 사람이 빌드 설정에서 처리).
- `ios/App/CapApp-SPM/Package.swift`, `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle` — 수동 편집 금지, cap sync로만 반영.

---

## REFERENCE_LINKS

- npm: https://www.npmjs.com/package/@capacitor-firebase/messaging
- Capacitor Firebase Push: https://capacitorjs.com/docs/guides/push-notifications-firebase
- APNs key upload: https://capacitorjs.com/docs/guides/push-notifications-firebase#upload-the-apns-certificate-or-key-to-firebase

---

## HUMAN_NOTE (사람용 요약)

- 배포 중인 안드로이드 앱은 플러그인 제거와 무관하게 기존 빌드 그대로 동작.
- Render(백엔드/웹) 업데이트는 이 전환과 독립적으로 진행 가능.
- TestFlight/스토어 iOS 빌드 시 `aps-environment` = production 필요. Firebase Console에 APNs 인증 키(.p8) 업로드 필수.
