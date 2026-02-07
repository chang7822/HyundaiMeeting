# 직군(job_type) → 학력(education) 전환 기획서

## 1. 목표
- **user_profiles** 테이블의 **job_type**(직군) 컬럼을 **education**(학력)으로 대체
- **선호 직군**(preferred_job_types) → **선호 학력**(preferred_educations)으로 대체
- 학력 값: **고졸**, **2년제대졸**, **4년제대졸**, **석사 이상** (4종 고정)
- 매칭 알고리즘에서 직군 대신 학력 기준으로 필터링

### DB 스키마 변경 (개발계 우선 적용)

- **개발계 적용용 SQL**: `supabase/migrations/20250207000000_job_type_to_education.sql`
- **운영계 반영용 SQL·체크리스트**: `docs/직군_to_학력_운영계_SQL.md`
- 개발계 적용: Supabase Dashboard → SQL Editor에서 해당 마이그레이션 파일 내용 실행 (연결된 프로젝트가 개발계인지 확인).

---

## 2. 현재 직군(job_type) 사용처 정리

### 2.1 DB·백엔드

| 구분 | 파일 | 내용 |
|------|------|------|
| **user_profiles** | (DB) | `job_type` (단일 값), `preferred_job_types` (JSON 배열) |
| **companies** | (DB) | `job_type_hold` — 특정 회사는 직군을 "일반직"으로 고정 |
| **profile_categories** | (DB) | 이름이 `'직군'`인 카테고리 → 프로필 옵션과 연동 |
| **profile_options** | (DB) | 직군 카테고리 하위 옵션 (일반직(사무직), 기술직 등) |
| **auth.js** | 회원가입 | `jobType` 수신 → `job_type` 저장, `job_type_hold` 시 "일반직" 자동 세팅, `preferences.preferredJobTypes` → `preferred_job_types`, `case '직군'` 처리 |
| **auth.js** | 회사 조회 | `companies`에서 `job_type_hold` 조회 |
| **matching-algorithm.js** | 매칭 | `isMutualMatch` 내 직군 조건: `preferred_job_types` ↔ `job_type` 상호 일치 |
| **matching-algorithm.js** | 프로필 로드 | select에 `job_type`, `preferred_job_types` 포함, profiles 배열에 매핑 |
| **admin.js** | 매칭 불일치 사유 | "직군 불일치" (preferred_job_types vs job_type), `profileMatchesPreference`에서 직군 체크 |
| **admin.js** | 회사 목록/수정 | `job_type_hold` select/update, API 응답 `jobTypeHold` |
| **admin.js** | 사용자 목록 등 | `user_profiles` select 시 `job_type` 포함, 응답에 `job_type` |
| **matching-history.js** | 매칭 이력 목록(my-history) | partner 프로필에서 `nickname`, `gender`만 조회 → `partner_job_type` 미포함 (수정 불필요) |
| **matching-history.js** | 매칭 이력 **상세**(GET /:id) | partner 프로필에서 `job_type` 조회 → `partner_job_type`으로 반환 → **partner_education**으로 변경 필요 |
| **extra-matching.js** | 추가 매칭 | 프로필 select/응답에 `job_type` 포함 |
| **matching.js** | 매칭 관련 | 로그/이메일 등에서 "직군", "선호 직군" 문자열 사용 |
| **users.js** | 프로필 조회/수정 | "직군", "선호 직군" 로그, 프로필 업데이트 시 `job_type` 가능성 |
| **support.js** | 고객지원 | "직군" 로그 |
| **reports.js** | 신고 | "직군" 로그 |
| **companies.js** | 회사 API | `jobTypeHold: !!company.job_type_hold` |
| **run-education-migration.js** | (스크립트) | 개발계 DB에 마이그레이션 SQL 실행. `DATABASE_URL`이 개발계를 가리키는지 확인 필요 |

### 2.2 프론트엔드

| 페이지/파일 | 용도 |
|-------------|------|
| **회원가입 · 프로필 설정** | **ProfileSetupPage.tsx** — 직군 필수 선택, `getOptions('직군')`, `jobType` state, `job_type_hold`일 때 "일반직"만 선택 가능 |
| **회원가입 · 선호도 설정** | **PreferenceSetupPage.tsx** — "선호 직군" 다중 선택, `jobTypeCategory`(이름 '직군'), `preferredJobTypes` state, 모달 문구 "선호 직군" |
| **회원가입 · 어필** | **AppealPage.tsx** — `profileData.jobType`를 API로 전달 |
| **프로필 수정** | **ProfilePage.tsx** — 직군 섹션, `getOptions('직군')`, `job_type` 저장, `job_type_hold` 처리, 필수값 검사('직군') |
| **선호 스타일 변경** | **PreferencePage.tsx** — "선호 직군" 섹션, `preferred_job_types` 로드/저장, `jobTypeOptions`(직군 카테고리 기반), 모달 "선호 직군 선택" |
| **매칭 신청 전 검증** | **MainPage.tsx** — "선호 직군 선택 여부" 확인 후 매칭 신청 허용, 프로필/파트너 카드에 `job_type` 표시, 내 프로필 요약에 "직군" 라벨 |
| **추가 매칭 도전** | **ExtraMatchingPage.tsx** — 여러 위치에서 "직군: {profile.job_type}" 표시 |
| **채팅** | **ChatPage.tsx** — 파트너 정보에 `job_type` 표시 |
| **관리자** | **ProfileDetailModal.tsx** — "직군", "선호 직군" 표시 |
| **관리자** | **ReportManagementPage.tsx** — "직군" 표시 |
| **관리자** | **UserMatchingOverviewPage.tsx** — 컬럼 라벨 `job: '직군'` |
| **관리자** | **MatchingApplicationsPage.tsx** — 컬럼 라벨 `job: '직군'` |
| **매칭 이력** | **MatchingHistoryPage.tsx** — 목록은 `getMyHistory()`만 사용(partner_job_type 미표시). **상세** `getHistoryDetail(id)` 사용 시 응답의 `partner_job_type` → `partner_education` 표시로 변경 필요 |
| **API·타입** | **api.ts** — `updatePreferences`의 `jobType` ↔ `preferred_job_types`, `getPreferences`의 `jobType` |
| **타입** | **types/index.ts** | `UserProfile.job_type`, `UserProfile.preferred_job_types`, `Company.jobTypeHold` |

---

## 3. 수정이 필요한 부분 (작업 목록)

### 3.1 DB (개발계 기준)
- [ ] **user_profiles**
  - `job_type` 컬럼 제거 또는 deprecated 후 **education** 컬럼 추가 (값: `'고졸' | '2년제대졸' | '4년제대졸' | '석사 이상'`)
  - `preferred_job_types` 제거 또는 deprecated 후 **preferred_educations** 추가 (JSON 배열, 동일 4값)
- [ ] **companies**
  - **job_type_hold** 컬럼 제거 또는 의미 변경(학력 고정 등으로 재정의할 경우만 유지)
- [ ] **profile_categories / profile_options**
  - "직군" 카테고리 및 해당 옵션 제거 또는 "학력" 카테고리로 대체 (학력은 4종 고정이면 카테고리 없이 앱/백엔드에서만 처리해도 됨)

### 3.2 백엔드
- [ ] **auth.js**: `jobType` → `education`, `preferredJobTypes` → `preferredEducations`, `job_type_hold` 로직 제거 또는 학력 고정으로 변경, `case '직군'` 제거
- [ ] **matching-algorithm.js**: `job_type` / `preferred_job_types` → `education` / `preferred_educations`, 동일한 상호 필터 로직으로 학력 적용
- [ ] **admin.js**: 직군 불일치 → 학력 불일치, `job_type` → `education`, `preferred_job_types` → `preferred_educations`, `job_type_hold` → 제거 또는 학력용으로 변경
- [ ] **matching-history.js**: `job_type` → `education`, `partner_job_type` → `partner_education`
- [ ] **extra-matching.js**: select/응답의 `job_type` → `education`
- [ ] **matching.js**, **users.js**, **support.js**, **reports.js**: 로그/이메일 문구 "직군" → "학력", "선호 직군" → "선호 학력"
- [ ] **companies.js**: `job_type_hold` 제거 또는 `educationHold` 등으로 변경

### 3.3 프론트엔드
- [ ] **types/index.ts**: `job_type` → `education`(4종 리터럴), `preferred_job_types` → `preferred_educations`, `Company.jobTypeHold` 제거 또는 변경
- [ ] **api.ts**: `jobType` / `preferred_job_types` → `education` / `preferred_educations`
- [ ] **ProfileSetupPage.tsx**: 직군 → 학력, 4종 라디오/셀렉트, `jobType`/`job_type_hold` 제거 또는 학력 고정으로 변경
- [ ] **PreferenceSetupPage.tsx**: 선호 직군 → 선호 학력(4종, 다중 선택 가능 시), `preferredJobTypes` → `preferredEducations`
- [ ] **AppealPage.tsx**: `profileData.jobType` → `profileData.education`
- [ ] **ProfilePage.tsx**: 직군 섹션 → 학력, `getOptions('직군')` 제거, 학력 4종 UI, `job_type_hold` 제거 또는 학력 고정
- [ ] **PreferencePage.tsx**: 선호 직군 → 선호 학력, `preferredJobTypes` → `preferredEducations`, 카테고리 '직군' 의존 제거
- [ ] **MainPage.tsx**: "선호 직군" 검증 → "선호 학력", 표시 라벨/필드 `job_type` → `education`
- [ ] **ExtraMatchingPage.tsx**: 모든 "직군" 표시 → "학력"
- [ ] **ChatPage.tsx**: `job_type` → `education`
- [ ] **ProfileDetailModal.tsx**, **ReportManagementPage.tsx**: 직군/선호 직군 → 학력/선호 학력
- [ ] **UserMatchingOverviewPage.tsx**, **MatchingApplicationsPage.tsx**: `job: '직군'` → `education: '학력'` 등
- [ ] **MatchingHistoryPage.tsx**: 매칭 이력 **상세** 조회(getHistoryDetail)를 사용하는 UI가 있는 경우, 응답 `partner_job_type` → `partner_education` 표시로 변경

---

## 4. 학력 반영 방식 (매칭 알고리즘)
- **현재**: A의 `preferred_job_types`에 B의 `job_type`이 포함되고, B의 `preferred_job_types`에 A의 `job_type`이 포함될 때만 매칭.
- **변경**: A의 `preferred_educations`에 B의 `education`이 포함되고, B의 `preferred_educations`에 A의 `education`이 포함될 때만 매칭.
- 학력 4종: **고졸**, **2년제대졸**, **4년제대졸**, **석사 이상** — 백엔드/프론트 공통 상수로 관리 권장.

---

## 5. 직군 제거 시 발생 가능한 문제점 (리스크)

1. **기존 데이터**
   - 이미 저장된 `job_type`, `preferred_job_types` 값은 학력과 매핑 불가. 마이그레이션 시 기존 회원의 학력을 어떻게 채울지(기본값, 필수 재입력, NULL 허용) 정책 필요.
   - **Backfill 정책**: 기존 값을 학력 기본값으로 채우려면 반드시 `education`/`preferred_educations` 추가 후, **DROP COLUMN(job_type 등) 실행 전에** UPDATE 실행해야 함. 현재 개발계 마이그레이션 SQL은 backfill UPDATE가 주석 처리되어 있어, 그대로 실행하면 기존 직군 데이터는 복구 불가하게 삭제됨.

2. **매칭 이력·스냅샷**
   - 과거 매칭 이력/스냅샷에 `partner_job_type` 또는 `job_type`이 저장돼 있으면, 이력 조회 화면·관리자 화면에서 필드명/값 표시 방식 변경 필요. 기존 값은 "직군(과거)" 등으로 표시하거나 마이그레이션으로 `partner_education` 등으로 이전 여부 결정 필요.

3. **companies.job_type_hold**
   - "일반직 고정"은 직군 개념에 묶여 있음. 학력으로 전환 시 이 옵션을 제거할지, "학력 고정"(예: 4년제대졸만 선택 가능) 등으로 재정의할지 결정 필요.

4. **profile_categories / profile_options**
   - "직군" 카테고리를 쓰는 다른 플로우가 있으면 깨질 수 있음. 직군만 쓰고 있었다면 카테고리 삭제 또는 "학력"으로 이름만 바꾸고 옵션을 4종으로 교체하는 방안 검토.

5. **회원가입·프로필 완성도**
   - 직군이 필수였던 곳을 학력 필수로 바꾸면, 기존에 직군만 없던 사용자는 "필수 미입력"으로 잡힐 수 있음. DB/앱에서 `education` 필수 여부와 기존 계정 처리 방안을 통일해야 함.

6. **매칭 풀 변화**
   - 직군 기반 선호와 학력 기반 선호는 다르므로, 동일 인원이라도 매칭 결과가 달라질 수 있음. 테스트 환경에서 매칭 결과 비교 권장.

7. **관리자·로그·이메일**
   - "직군 불일치", "선호 직군" 등 하드코딩된 한글 문구를 "학력 불일치", "선호 학력"으로 모두 교체해야 하며, 이메일 템플릿이나 로그 수집/검색에 직군이 들어간 부분이 있으면 함께 수정 필요.

8. **API 호환성**
   - 앱/웹 클라이언트가 아직 `jobType`/`job_type`을 보내거나 기대하는 경우, 배포 순서(백엔드 먼저 vs 프론트 먼저)에 따라 일시적으로 이중 지원하거나 버전 분리 검토.

9. **추가 매칭·신고·고객지원**
   - ExtraMatching, 신고, 고객지원 등에서 프로필 스냅샷/복사본에 `job_type`이 들어가 있을 수 있음. 해당 스키마/응답도 `education` 기준으로 정리 필요.

10. **다국어/접근성**
    - "직군" → "학력"으로 바꾸면서 라벨/안내 문구가 바뀌므로, 추후 다국어나 스크린리더 대응 시 새 라벨 기준으로 반영 필요.

11. **과거 데이터·스냅샷**
    - **현재 프로필**: `user_profiles`에서 `job_type` 컬럼을 제거했기 때문에 기존 가입자는 `education`/`preferred_educations`가 NULL. 재입력 유도·기본값·NULL 허용 중 정책 결정 필요.
    - **과거 스냅샷**: `matching_applications.profile_snapshot` / `preference_snapshot`, `extra_matching_entries.profile_snapshot` JSON에는 **그대로** `job_type`, `preferred_job_types`가 남아 있음(컬럼 삭제는 user_profiles만 해당).
    - **표시 시 fallback**: 스냅샷을 보여줄 때 `education`이 없으면 `job_type`을, `preferred_educations`가 없으면 `preferred_job_types`를 사용하도록 백엔드에서 정규화·응답 시 반영함. 매칭 이력 상세의 상대방 학력은 현재 프로필이 없으면 당시 신청 스냅샷의 `education`/`job_type`으로 채움.

---

## 6. 권장 작업 순서
1. DB 스키마: `education`, `preferred_educations` 추가 및 마이그레이션 정책 수립 (기존 데이터 backfill 시 **DROP 전에** UPDATE 실행)
2. 백엔드: auth → matching-algorithm → admin → matching-history, extra-matching → 나머지 라우트/로그
3. 프론트: types · api → 회원가입(ProfileSetup, PreferenceSetup, Appeal) → 프로필/선호(ProfilePage, PreferencePage) → Main, ExtraMatching, Chat → 관리자 페이지
4. companies.job_type_hold / profile_categories 직군: 제거 또는 학력용으로 변경
5. 통합 테스트: 회원가입, 프로필 수정, 선호 변경, 매칭 신청, 추가 매칭, 관리자·매칭 이력

---

## 7. 기획서 점검 요약 (프로젝트 재파악 결과)

- **백엔드**: auth.js, matching-algorithm.js, admin.js, matching-history.js(상세), extra-matching.js, matching.js, users.js, support.js, reports.js, companies.js — 위 표와 작업 목록과 일치.
- **프론트**: ProfileSetupPage, PreferenceSetupPage, AppealPage, ProfilePage, PreferencePage, MainPage, ExtraMatchingPage, ChatPage, ProfileDetailModal, ReportManagementPage, UserMatchingOverviewPage, MatchingApplicationsPage, api.ts, types/index.ts — 모두 반영됨. MatchingHistoryPage는 목록만 사용 중이며, 상세 조회 시 partner_education 반영 필요 항목으로 추가함.
- **DB**: user_profiles(job_type, preferred_job_types), companies(job_type_hold), profile_categories/profile_options('직군') — 마이그레이션 SQL 및 운영계 문서와 일치.
- **주의**: `run-education-migration.js`로 개발계 마이그레이션 실행 시 `backend/config.env`의 `DATABASE_URL`이 **개발계 DB**를 가리키는지 반드시 확인할 것.

이 문서는 **코드 수정 전** 수정 범위 캐치 및 기획용이며, 실제 코드 변경은 이후 단계에서 진행하면 됩니다.
