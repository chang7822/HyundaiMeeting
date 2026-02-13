# 직장인 솔로 공모 (직쏠공) — 프로젝트 개요

AI 에이전트·신규 개발자가 이 프로젝트를 처음 접할 때 필요한 컨텍스트를 정리한 문서입니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | 직장인 솔로 공모 (직쏠공) |
| **웹사이트** | https://automatchingway.com |
| **앱** | Capacitor 기반 웹뷰 앱 — Google Play Store, Apple App Store 배포 |
| **앱 패키지** | `com.solo.meeting` (Android), 동일 appId (iOS) |

직장인 대상 소개팅/매칭 서비스입니다. 회사·이메일 인증, 프로필 기반 매칭, 채팅, 공지/FAQ, 관리자 기능, 푸시·광고 등이 포함됩니다.

---

## 2. 배포 환경 (Render)

- **배포 플랫폼**: Render
- **서비스 구성**: 아래 세 가지가 **각각 별도 서비스**로 배포됩니다. 환경변수는 **Render 대시보드에서 서비스별로 관리**합니다.

| 서비스 | 설명 | 진입점 |
|--------|------|--------|
| **Front** | React SPA (프론트엔드) | `npm run build` → 정적 빌드 배포 |
| **Backend** | Express API + Socket.io | `backend/server.js` |
| **Scheduler** | 매칭 회차 실행·푸시 등 크론 작업 | `backend/scheduler.js` |

- **단순 웹사이트 반영**: 소스 수정 후 **커밋 → Render 자동 배포**만 하면 됨 (프론트 빌드만 다시 되면 됨).
- **백엔드/스케줄러 변경**: 해당 서비스가 재시작되도록 배포 트리거 필요.

---

## 3. 브랜치

| 브랜치 | 용도 |
|--------|------|
| **main** | 운영(프로덕션). Render 배포는 보통 main 기준. |
| **dev** | 개발. 로컬·스테이징·MCP 개발계 DB 연동 시 사용. |

기능 개발은 dev에서 하고, 검증 후 main에 머지하는 흐름을 권장합니다.

---

## 4. 데이터베이스 (Supabase)

- **DB**: Supabase (PostgreSQL)
- **연결**: 운영계·개발계가 **MCP로 구분**되어 엮여 있음.  
  - 운영: Render 환경변수 또는 운영용 `SUPABASE_*`  
  - 개발: dev 브랜치·로컬 또는 개발용 `SUPABASE_*`
- **백엔드 연결**: `backend/database.js`에서 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 환경변수로 `createClient` 한 뒤 `supabase` export.  
  - 로컬: `backend/config.env` + `dotenv.config()`  
  - Render: config.env 없이 Render에 설정된 환경변수 사용

---

## 5. 앱 vs 웹 — 배포·업데이트 구분

- **웹**: automatchingway.com 은 Render Front 서비스가 빌드 결과물을 서빙. **커밋 기반 배포만으로 반영** 가능.
- **앱**: Capacitor로 **원격 URL(https://automatchingway.com)을 웹뷰로 로드**합니다.  
  - `capacitor.config.ts` 의 `server.url: 'https://automatchingway.com'`  
  - 따라서 **웹 사이트만 바꾸면 앱에서도 그대로 반영**됨 (앱 재배포 불필요).

**아래의 경우에만 스토어 앱 업데이트가 필요합니다.**

- **Capacitor 플러그인 추가/변경/업데이트** (예: 푸시, StatusBar, AdMob, safe-area 등)
- **네이티브 설정 변경** (Android `build.gradle` versionCode/versionName, iOS Info.plist 등)
- **앱 전용 네이티브 코드 수정**

자세한 절차는 저장소 루트의 **`앱_업데이트_가이드.md`** 를 참고하세요.

---

## 6. 프론트엔드 구조 (React)

### 6.1 진입점·라우팅

- **진입**: `src/index.tsx` → `App.tsx` (QueryClient, AuthProvider, Routes)
- **라우팅**: `react-router-dom` 사용. `App.tsx` 안에 `<Routes>` 로 경로 정의.

### 6.2 라우트 ↔ 페이지·역할

**공개 (비로그인 접근 가능)**

| 경로 | 페이지 컴포넌트 | 비고 |
|------|------------------|------|
| `/` | LandingPage | 로그인/프로필 있으면 `/main` 리다이렉트 |
| `/login` | LoginPage | |
| `/register` | RegisterPage | 회원가입 플로우 시작 |
| `/register/company` | CompanySelectionPage | |
| `/register/email-verification` | EmailVerificationPage | |
| `/register/email-sent` | EmailSentPage | |
| `/register/password` | PasswordSetupPage | |
| `/register/required-info` | RequiredInfoPage | |
| `/register/profile` | ProfileSetupPage | |
| `/register/address` | AddressSelectionPage | |
| `/register/nickname` | NicknameSetupPage | |
| `/register/preference` | PreferenceSetupPage | |
| `/register/appeal` | AppealPage | |
| `/forgot-password` | ForgotPasswordPage | |
| `/reset-password-verify` | ResetPasswordVerifyPage | |
| `/reset-password` | ResetPasswordPage | |
| `/privacy-policy` | PrivacyPolicyPage | |
| `/delete-account` | DeleteAccountPage | |
| `/child-safety` | ChildSafetyPage | |

**로그인 필요 (ProtectedRoute)**

| 경로 | 페이지 | 비고 |
|------|--------|------|
| `/main` | MainPage | 메인 대시 + 사이드바 |
| `/profile` | ProfilePage | |
| `/preference` | PreferencePage | |
| `/notice`, `/notice/:id` | NoticePage | |
| `/faq`, `/faq/:id` | FaqPage | |
| `/rps-arena` | RpsArenaPage | 별/보상·광고 |
| `/matching-history` | MatchingHistoryPage | |
| `/community` | CommunityPage | |
| `/extra-matching` | ExtraMatchingPage | |
| `/notifications` | NotificationsPage | |
| `/support/inquiry` | SupportInquiryPage | |
| `/support/my-inquiries` | MySupportInquiriesPage | |
| `/support/inquiry/:id` | SupportInquiryDetailPage | |
| `/chat/:partnerUserId` | ChatPage | **사이드바 없음** |
| `/admin/matching-applications` | MatchingApplicationsPage | (일반 사용자도 접근) |

**관리자 전용 (AdminRoute)**

| 경로 | 페이지 | 비고 |
|------|--------|------|
| `/admin` | AdminPage | |
| `/admin/matching-log` | MatchingLogAdminPage | |
| `/admin/category-manager` | CategoryManagerPage | |
| `/admin/company-manager` | CompanyManagerPage | |
| `/admin/matching-result` | MatchingResultPage | |
| `/admin/user-matching-overview` | UserMatchingOverviewPage | |
| `/admin/notice-manager` | NoticeManagerPage | |
| `/admin/faq-manager` | FaqManagerPage | |
| `/admin/settings` | SettingsPage | 유지보수·버전정책·app_settings 등 |
| `/admin/logs` | LogsPage | |
| `/admin/report-management` | ReportManagementPage | |
| `/admin/support`, `/admin/support/:id` | AdminSupportPage, AdminSupportDetailPage | |
| `/admin/broadcast-email` | BroadcastEmailPage | |
| `/admin/notifications` | AdminNotificationPage | |
| `/admin/star-reward` | AdminStarRewardPage | |
| `/admin/extra-matching` | ExtraMatchingAdminPage | |

대부분 **Sidebar + 해당 페이지** 조합으로 `app-layout` 안에 렌더됩니다. Chat 페이지만 Sidebar 없이 전체 화면입니다.

### 6.3 인증 (AuthContext)

- **파일**: `src/contexts/AuthContext.tsx`
- **역할**: 로그인/로그아웃, 토큰 보관·갱신, `user` / `profile` / `isAuthenticated` / `isLoading` / `isInitialLoading` 제공.
- **토큰**: `localStorage` 의 `token`, `refreshToken`. axios 인터셉터에서 401 시 refresh 후 재시도.
- **사용**: `useAuth()` 훅. `ProtectedRoute` / `AdminRoute` 가 인증·관리자 여부로 접근 제어.

### 6.4 API 레이어

- **파일**: `src/services/api.ts`
- **Base URL**: `REACT_APP_API_URL` (끝 슬래시 제거 후 사용). 미설정 시 `https://auto-matching-way-backend.onrender.com/api` fallback.
- **주요 export**:  
  `authApi`, `userApi`, `matchingApi`, `chatApi`, `systemApi`, `starApi`, `extraMatchingApi`, `adminApi`, `noticeApi`, `faqApi`, `reportApi`, `matchingHistoryApi`, `notificationApi`, `pushApi`, `logsApi`, `communityApi`, `adminChatApi`, 기타 지원 API들.
- **버전 정책**: `systemApi.getVersionPolicy()` → `/api/system/version-policy` (앱 버전 체크·설정 모달 최신 버전 표시에 사용).

### 6.5 주요 컴포넌트·유틸

| 경로 | 역할 |
|------|------|
| `src/components/layout/Sidebar.tsx` | 공통 사이드바. 설정 모달, 앱/최신 버전 표시, `request-version-check` 이벤트 dispatch. |
| `src/components/auth/ProtectedRoute.tsx` | 로그인 필수 라우트 감싸기 |
| `src/components/auth/AdminRoute.tsx` | 관리자 전용 라우트 감싸기 |
| `src/components/UpdateModal.tsx` | 강제/선택 업데이트 모달 (ForceUpdateModal, OptionalUpdateModal) |
| `src/utils/versionCheck.ts` | `getCurrentVersion`, `fetchVersionPolicy`, `checkVersion`, `performVersionCheck`. **version_policy는 systemApi.getVersionPolicy() 사용 (fetch+env 아님).** |
| `src/firebase.ts` | Firebase 메시징, 네이티브 푸시 토큰·권한 등 |
| `src/index.css` | 전역 스타일, `--safe-area-inset-*`, `body.platform-ios` / `body.platform-android` 패딩 |

### 6.5.1 프로필 모달 위치 (재사용 시 참고)

| 종류 | 파일/위치 | 용도 | 사용처 |
|------|-----------|------|--------|
| **ProfileDetailModal** | `src/pages/admin/ProfileDetailModal.tsx` | 관리자용 프로필 상세 (닉네임, 이메일, 성별, 생년, 키, 거주지, 회사, 학력, MBTI, 자기소개, 선호 조건 등). `user` 객체 필요. | UserMatchingOverviewPage, MatchingApplicationsPage, MatchingResultPage, **RpsArenaPage**(가위바위보 통계 닉네임 클릭) |
| 프로필 카드 모달 / 상대방 프로필 모달 | `MainPage.tsx` 인라인 | 메인 페이지 내 내 프로필·상대 프로필 보기 | MainPage |
| 신청/수신 프로필 모달 | `ExtraMatchingPage.tsx` 인라인 | 추가 매칭 도전 시 신청자/수신자 프로필 | ExtraMatchingPage |
| 프로필 모달 | `ChatPage.tsx` | 채팅 상대 프로필 | ChatPage |
| 사용자 프로필 조회 모달 | `ReportManagementPage.tsx` 인라인 | 신고 관리에서 피신고자 등 프로필 조회 | ReportManagementPage |

다른 화면에서 “닉네임 클릭 시 프로필 보기”가 필요하면 **ProfileDetailModal** 재사용을 권장. 사용자 데이터는 `adminReportApi.getUserProfile(userId)` 로 조회 후 `user` prop 으로 넘기면 됨. (필요한 프로필 종류가 다르면 개발 시 문의.)

### 6.6 버전 체크·업데이트 안내

- **트리거**: (1) 앱 시작 후 2초 1회 (2) 설정 모달 열릴 때 `request-version-check` 이벤트.
- **처리**: `App.tsx` 에서 `performVersionCheck()` 호출 → `version_policy`(app_settings) 와 비교 → 강제/선택 업데이트 모달 표시.
- **정책**: Supabase `app_settings` 테이블, `key='version_policy'`, `value` 에 ios/android 의 `minimumVersion`/`latestVersion`/`storeUrl`, `messages.forceUpdate`/`optionalUpdate` JSON 저장. 관리자 설정 페이지에서 편집 가능.

---

## 7. 백엔드 구조 (Node.js / Express)

### 7.1 서버 (server.js)

- **진입**: `backend/server.js`
- **환경**: `backend/config.env` (로컬) 또는 Render 환경변수. `dotenv.config({ path: config.env })` 사용.
- **미들웨어**: CORS (automatchingway.com, localhost, capacitor://localhost 등), `express.json()`.
- **라우트 접두사**: 모두 `/api/...` 아래에 마운트.

| 접두사 | 라우트 파일 | 역할 |
|--------|-------------|------|
| `/api/auth` | routes/auth.js | 로그인, 회원가입, 토큰 갱신, 이메일 인증 등 |
| `/api/companies` | routes/companies.js | 회사 목록·도메인 검증 |
| `/api/users` | routes/users.js | 프로필, 이메일 수신 설정 등 |
| `/api/matching` | routes/matching.js | 회차, 신청, 매칭 결과 등 |
| `/api/chat` | routes/chat.js | 채팅 메시지 |
| `/api/admin` | routes/admin.js | 관리자 전용 (system-settings, version_policy, 유저/매칭/공지/FAQ 등) |
| `/api/notice` | routes/notice.js | 공지 |
| `/api/faq` | routes/faq.js | FAQ |
| `/api/reports` | routes/reports.js | 신고 |
| `/api/matching-history` | routes/matching-history.js | 매칭 이력 |
| `/api/support` | routes/support.js | 문의 |
| `/api/system` | routes/system.js | **status**(유지보수), **version-policy** (공개) |
| `/api/stars` | routes/stars.js | 별·출석 |
| `/api/extra-matching` | routes/extra-matching.js | 추가 매칭 |
| `/api/notifications` | routes/notifications.js | 알림 목록 |
| `/api/push` | routes/push.js | FCM 토큰 등록/해제 |
| `/api/logs` | routes/logs.js | 로그 조회 |
| `/api/community` | routes/community.js | 커뮤니티 |

- **Socket.io**: 같은 http 서버에 붙어 실시간 채팅 등에 사용.
- **DB**: `backend/database.js` 의 `supabase` (Service Role).

### 7.2 스케줄러 (scheduler.js)

- **진입**: `backend/scheduler.js`
- **역할**: 매칭 회차별 실행 시점에 맞춰 `matching-algorithm.js` 실행, 푸시 발송 등. `app_settings`, `matching_log` 등을 참고해 현재/다음 회차 계산.
- **환경**: 동일하게 `config.env` 또는 Render 환경변수. **별도 Render 서비스**로 돌리므로, 스케줄러 전용 환경변수도 Render에서 설정.

---

## 8. 앱 전용 (Capacitor)

- **설정**: `capacitor.config.ts` — `appId: 'com.solo.meeting'`, `webDir: 'build'`, `server.url: 'https://automatchingway.com'`.
- **플랫폼**: `android/`, `ios/` — 각각 네이티브 프로젝트. `npx cap sync` 로 웹 빌드와 플러그인 반영.
- **버전**: Android는 `android/app/build.gradle` 의 `versionCode`, `versionName`. 앱 내 버전 비교는 **versionName** 기준 (예: 1.0.5).

---

## 9. AI / 신규 개발자용 컨텍스트 요약

- **배포**: Render 3서비스(Front, Backend, Scheduler), 환경변수는 Render에서 관리. 운영은 main, 개발은 dev.
- **DB**: Supabase, MCP로 운영계/개발계 구분. `backend/database.js` 에서 한 클라이언트로 연결.
- **웹만 수정**: 커밋 → Render Front 재배포만 하면 됨. 앱은 URL 로드이므로 **앱 재배포 불필요**.
- **플러그인·네이티브 변경**: 앱 빌드 후 스토어 업데이트 필요 → `앱_업데이트_가이드.md` 참고.
- **버전 정책**: `app_settings.version_policy` + 프론트 `systemApi.getVersionPolicy()` + `versionCheck.ts` + 설정 모달에서 트리거/표시.
- **인증**: `AuthContext` + `token`/`refreshToken` + axios 인터셉터. 라우트는 `ProtectedRoute`/`AdminRoute`로 보호.
- **페이지 추가 시**: `App.tsx` 에 Route 추가, 필요 시 `Sidebar` 링크·메뉴 추가, 백엔드 라우트/API 필요하면 해당 `routes/*.js` 및 `api.ts` 에 추가.

---

## 10. 주요 플로우 (백엔드-프론트 연계)

AI·개발자가 기능 수정/추가 시 참고할, **회원가입 / 매칭 / 메인 UI** 등 백엔드-프론트가 맞물리는 흐름만 요약합니다.

### 10.1 회원가입 절차

**페이지 순서 (프론트)**  
`RegisterPage` → `CompanySelectionPage` → `EmailVerificationPage` → (선택) `EmailSentPage` → `PasswordSetupPage` → `RequiredInfoPage` → `ProfileSetupPage` → `PreferenceSetupPage` → `NicknameSetupPage` → `AddressSelectionPage` → `AppealPage` → 완료 시 `/main` 이동.

**백엔드 API (auth.js)**

| 단계 | 프론트 호출 | 백엔드 경로 | 비고 |
|------|-------------|-------------|------|
| 회사 선택 후 이메일 입력 | `companyApi.getCompanies()`, `companyApi.getCompanyByDomain()` | `GET /api/companies`, `GET /api/companies/domain/:domain` | 도메인 검증 |
| 이메일 인증 요청 | `authApi.verifyEmail(email)` | `POST /api/auth/verify-email` | 인증 메일 발송 |
| 인증 코드 확인 | `authApi.confirmVerification(email, code)` | `POST /api/auth/confirm-verification` | 이메일 인증 완료 |
| 최종 가입 | `authApi.registerComplete(userData)` | `POST /api/auth/register` | 프로필·선호·약관 등 전체 전송. `users` + `user_profiles` 생성, 토큰 반환 |

- **경로**: `src/pages/auth/*.tsx`, `src/services/api.ts` (authApi, companyApi), `backend/routes/auth.js`.
- **비밀번호 찾기**: `ForgotPasswordPage` → `authApi.forgotPassword` → `ResetPasswordVerifyPage` → `authApi.verifyResetCode` → `ResetPasswordPage` → `authApi.resetPassword`.

---

### 10.2 매칭 회차·알고리즘

**데이터 구조**

- **matching_log** (회차): `application_start`, `application_end`, `matching_run`, `matching_announce`, `finish`, **status** (`준비중` | `진행중` | `발표완료` | `종료`).
- **현재/다음 회차**: `matching_log` 를 id DESC로 조회한 뒤 status로 필터해 “진행중/발표완료” 한 건이 현재 회차, “발표완료”인 현재 회차 다음의 “준비중” 한 건이 다음 회차. 이 로직은 **scheduler.js** 와 **routes/matching.js** 에서 공통 헬퍼로 사용.

**스케줄러 (scheduler.js)**

- **주기**: cron으로 짧은 주기 실행 (예: 1분마다).
- **하는 일**:  
  - **status 자동 갱신**: `finish` 지나면 → `종료`, `matching_announce` 지나면 `진행중` → `발표완료`, 신청 기간이면 `준비중` → `진행중`.  
  - **matching_run 시각이 지나고** 해당 회차가 아직 실행 전이면 **matching-algorithm.js** 실행 (child_process 등으로 호출).  
  - 회차 **시작/종료** 시점에 `users` 테이블의 `is_applied`/`is_matched` 초기화 (app_settings에 last_period_start_reset_id 등으로 중복 방지).
- **진입**: `backend/scheduler.js`. 알고리즘 본문: `backend/matching-algorithm.js` (Supabase 직접 사용, 남녀 매칭·선호 반영·과거 이력 제외 등).

**프론트 매칭 API (api.ts ↔ matching.js)**

| 용도 | 프론트 | 백엔드 |
|------|--------|--------|
| 현재/다음 회차 | `matchingApi.getPeriod()` | `GET /api/matching/period` |
| 내 매칭 상태 | `matchingApi.getStatus(userId)` | `GET /api/matching/status?userId=` → `is_applied`, `is_matched`, `partner_user_id`, `cancelled` 등 |
| 매칭 신청 | `matchingApi.apply(userId)` | `POST /api/matching/request` (별 차감 등) |
| 신청 취소 | `matchingApi.cancel(userId)` | `POST /api/matching/cancel` |

- **메인페이지**는 `getPeriod()` + `getStatus()` 로 **period** 와 **matchingStatus** 를 갱신하고, 이 두 값으로 UI 분기.

---

### 10.3 메인페이지 UI 분기 (MainPage)

**역할**: `period`(현재 회차) + `matchingStatus`(내 신청/매칭 결과) 기준으로 문구·버튼·채팅 입장 여부 결정.

**신뢰하는 데이터**

- **매칭 성공/실패**: **matchingStatus** 만 사용. `user.is_matched` 등 과거 회차 값은 사용하지 않음.
- **신청 여부**: `matchingStatus.is_applied` (또는 `applied`). 없으면 `user.is_applied` 로 보완.
- **취소**: `matchingStatus.is_cancelled` / `cancelled`, `cancelled_at`.

**시간 기준**

- `period.application_start` ~ `application_end`: 신청 가능 구간.
- `period.matching_announce`: 결과 발표 시각.
- `period.finish`: 회차 종료 시각. `finish` 지나면 “이번 회차 종료” 처리.

**표시/버튼 분기 요약**

- **회차 없음** → “현재 진행 중인 매칭이 없습니다.”
- **회차 종료** (`finish` < now) → “이번 회차가 종료되었습니다.”
- **신청 기간 전** → “신청 기간이 아닙니다.” + 기간 안내.
- **신청 기간 중**  
  - 미신청 → “매칭 미신청” + **매칭 신청** 버튼.  
  - 신청 완료 → “신청 완료” + “매칭 공지를 기다려주세요” (취소 버튼 가능).
- **발표 후**  
  - 성공 (`is_matched === true`) → “매칭 성공” + 상대 프로필·**채팅** 버튼.  
  - 실패 → “매칭 실패” + 종료 시각 안내.

**파일**

- `src/pages/MainPage.tsx`: `getMatchingStatusDisplay()`, `periodLabel`/버튼 비활성화, `handleMatchingRequest` / 취소, 채팅 이동.
- 상태 폴링/간격은 동일 파일 내에서 `matchingApi.getStatus` 호출 주기로 처리.

---

### 10.4 기타 연계 (참고)

- **채팅**: `GET/POST /api/chat/*`, Socket.io 로 실시간. `ChatPage` 는 `partnerUserId` 로 상대와의 채팅만 표시.
- **푸시**: FCM 토큰은 `pushApi.registerToken` → `POST /api/push/register`. 발송은 `pushService.js` + 스케줄러/관리자 등에서 `sendPushToUsers` 호출.
- **공지/FAQ**: `noticeApi`, `faqApi` → `GET /api/notice`, `GET /api/faq`. 관리자 CRUD는 `adminApi` + `routes/admin.js`.
- **추가 매칭**: `extra-matching.js` + `ExtraMatchingPage` / `ExtraMatchingAdminPage`. 회차가 **발표완료**인 동안만 “추가 매칭 도전” 가능 (status 분기 동일).

---

### 10.5 커뮤니티 페이지

**역할:** 매칭 **회차(period) 단위** 익명 게시판. 회원이 익명으로 게시글·댓글·좋아요·신고를 할 수 있음. 접근은 로그인 필수이며, `app_settings.community_enabled` 로 기능 on/off 가능 (관리자 설정 페이지).

**익명 ID 구조**

- **회차별 식별:** 한 회차 안에서 사용자는 **익명 번호(anonymous_number)** 로만 노출됨 (예: "익명3"). 실제 `user_id`는 게시/댓글/좋아요/신고 시 백엔드에서만 사용.
- **일반 회원:** 회차당 **익명 ID 1개**. `GET /api/community/my-identity/:periodId` 호출 시 없으면 자동 생성(해당 회차에서 전역 최대 번호+1), 있으면 기존 것 반환. 게시·댓글·좋아요·신고는 모두 이 하나의 익명 번호로 기록됨.
- **관리자:** 같은 회차에 대해 **여러 익명 ID를 생성**해서 사용할 수 있음. “관리자용 익명 페르소나”를 여러 개 두고, 그중 하나를 **선택한 뒤** 그 ID로 게시·댓글·좋아요·신고를 하는 구조.

**관리자 익명 ID 생성·사용 (핵심)**

| 구분 | 설명 |
|------|------|
| **저장** | `community_user_identities` 테이블. `period_id`, `user_id`(관리자 본인), `anonymous_number`, `color_code`. 관리자가 만든 익명 ID도 동일 테이블에 저장되며 `user_id`는 관리자 계정으로 고정. |
| **생성** | **1개 생성:** `POST /api/community/admin/identities` (body: `period_id`). 해당 회차에서 전역 최대 `anonymous_number`+1 로 한 건 insert. **일괄 생성:** `POST /api/community/admin/identities/bulk` (body: `period_id`, `count`). 한 번에 최대 100개까지. |
| **조회** | `GET /api/community/admin/identities/:periodId` → 해당 회차에서 이 관리자(`user_id`)가 가진 모든 익명 ID 목록 반환. |
| **사용** | 프론트(`CommunityPage`)에서 관리자일 때 **익명 ID 선택 드롭다운** 표시. 선택한 `anonymous_number`를 `selectedAnonymousNumber`로 두고, **게시글 작성 / 댓글 작성 / 좋아요 / 신고** 시 해당 값을 `preferred_anonymous_number` 또는 `anonymous_number`로 API에 넘김. 백엔드는 `isAdmin && preferred_anonymous_number` 있으면 해당 관리자 소유 익명 ID로 게시/댓글/좋아요/신고 처리. |

**관리자 공식 작성 (관리자 ID로 보이게)**

- 관리자가 **익명 OFF(관리자 모드)** 로 글/댓글을 쓰면, 목록·상세에서 **"👑 관리자"** 로 표시되어 누가 봐도 공식 관리자 글로 인지할 수 있음.
- **저장:** `community_posts`, `community_comments` 테이블에 `is_admin_post` 컬럼. 작성 시 body에 `post_as_admin: true` 를 넘기면 해당 행에 `is_admin_post = true` 로 저장됨.
- **API:** 게시글/댓글 작성 시 `POST /api/community/posts`, `POST /api/community/comments` 에서 `post_as_admin` (관리자만 유효) 지원. 목록/상세 응답에 `is_admin_post` 포함.

**관리자 익명 작성 시 표시 태그 (display_tag)**

- 관리자가 **익명 ON** 상태로 글/댓글을 쓸 때, **표시 태그**를 선택해야 함. 회차 상태에 따라 선택 가능한 태그가 다름.
- **회차별 선택 가능 태그**
  - **진행중:** `매칭신청X`, `매칭신청완료` (둘 중 하나 필수)
  - **발표완료:** `매칭실패`, `매칭성공` (둘 중 하나 필수)
- **고정 태그:** 한 익명 ID로 **처음** 글 또는 댓글을 쓸 때 선택한 태그가 그 ID의 **고정 태그**가 됨. 이후 같은 익명 ID로 쓸 때는 태그를 바꿀 수 없고, 드롭다운 대신 "○○ (고정)"으로만 표시되며 동일 태그로 저장됨.
- **매칭실패:** DB에는 `display_tag: '매칭실패'`로 저장되며, **화면(피드)에는 태그를 표시하지 않음** (목록/댓글 응답의 `tag`는 null). 관리자 작성 UI에서만 "매칭실패 (고정)" 등으로 표시.
- **저장:** `community_posts`, `community_comments` 테이블에 nullable `display_tag` 컬럼. 마이그레이션: `supabase/migrations/20250213000000_community_display_tag.sql`.
- **API:** 게시글/댓글 작성 시 body에 `display_tag` (관리자 익명일 때만 유효, 회차 상태에 맞는 값 검증). `GET /api/community/admin/identities/:periodId` 응답에 각 익명 ID별 **fixedDisplayTag** 포함(이미 해당 ID로 글/댓글을 쓴 적 있으면 그때의 태그).
- **표시:** 일반 회원이 보는 글/댓글 목록에서는 `display_tag`가 있으면 그대로 사용(단, `매칭실패`이면 tag는 null로 내려줘서 태그가 미표시됨). 없으면 기존처럼 매칭 신청/성공 여부로 태그 계산. (일반 회원에게는 표시 태그 선택·고정 UI가 보이지 않음.)

**관리자 UI (프론트)**

- **위치:** 관리자일 때만 **주의사항 버튼 바로 아래**에 작은 **익명 ON/OFF 토글**이 플로팅(우측 정렬)으로 노출됨.
- **익명 ON:** 익명 모드. 그 아래 **익명 ID 선택 박스**가 보임(한 줄: 드롭다운·새 ID 생성·다중 생성·**우측 끝 접기/펼치기 화살표**). **표시 태그** 선택란(드롭다운 또는 고정 시 "○○ (고정)")이 글/댓글 작성 영역에 관리자에게만 노출됨. 글/댓글은 선택한 익명 ID와 선택·고정된 태그로 작성.
- **익명 OFF:** 관리자 모드. 익명 ID 박스·표시 태그 선택란 숨김. 글/댓글은 공식 관리자(👑 관리자)로 작성됨.
- **배지:** `is_admin_post === true` 인 글/댓글은 작성자명을 **👑 관리자** 배지(빨간 배경)로 표시. `postAsAdmin` 상태는 상단 토글로만 제어하며, `communityApi.createPost` / `createComment` 호출 시 네 번째 인자 `postAsAdmin`, 다섯 번째 인자 `displayTag` 전달.

**백엔드·프론트**

- **라우트:** `backend/routes/community.js` → `/api/community/*`.
- **주요 API:**  
  - 익명 ID: `getMyIdentity`, `getAdminIdentities`, `createAdminIdentity`, `createAdminIdentitiesBulk`.  
  - 게시: `getPosts`, `createPost`, `deletePost`; 관리자 강제 삭제 `adminDeletePost`.  
  - 댓글: `getComments`, `createComment`, `deleteComment`; 관리자 강제 삭제 `adminDeleteComment`.  
  - 좋아요: `toggleLike`, `getMyLikes`.  
  - 신고: `reportContent` (post/comment).  
- **프론트:** `src/pages/CommunityPage.tsx`. 회차 선택, 게시글 목록/상세/댓글, 작성/삭제/좋아요/신고. **관리자일 때만** 주의사항 버튼 아래 익명 ON/OFF 토글 플로팅, 익명 ON이면 익명 ID 선택 박스(한 줄·우측 접기 화살표)와 "새 익명 ID 생성"/"다중 생성" 노출. 관리자 배지 **👑 관리자**. `communityApi` (`src/services/api.ts`) 사용.

**정리:** 일반 회원은 회차당 익명 1개로 활동한다. 관리자는 상단 **익명 ON/OFF 토글**으로 익명 모드(익명 ID 박스 사용)와 관리자 모드(👑 관리자로 공식 작성)를 바꾸며, 익명 모드일 때는 회차별로 익명 ID를 여러 개 만든 뒤 그중 하나를 골라 “그 페르소나”로 글/댓글/좋아요/신고를 할 수 있다.

---

**AI 참고**: 이 프로젝트에 처음 접할 때는 위 **§1~§9**로 구조를 파악한 뒤, **§10**에서 회원가입·매칭·메인 분기·커뮤니티 등 수정 대상 플로우의 프론트/백엔드 파일을 확인하면 된다. 라우트·API·상태값은 이 문서의 표와 경로를 우선 참고하고, 세부 로직은 해당 파일에서 검색하면 된다. 커뮤니티는 **§10.5**에서 회차별 익명 ID와 관리자 익명 ID 생성·사용 구조를 참고하면 된다.
