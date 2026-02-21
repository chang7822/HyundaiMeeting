# 24시간 호감 자동 거절 — TODO 리스트

현재 상태에서 구현에 필요한 작업들을 단계별로 정리한 문서입니다.

---

## rejected_reason 값 정의

| 값 | 의미 | 표시 문구 (보낸 사람) |
|----|------|------------------------|
| `'manual'` | 받은 사람이 수락/거절 중 **거절** 선택 | 호감을 거절한 상대 |
| `'timeout'` | 24시간 내 답변 없어 **자동 거절** | 시간 초과로 거절됨 |
| `'other_accepted'` | 받은 사람이 **다른 사람을 수락** | 상대가 다른 분을 선택했습니다 |
| `null` | 기존 데이터 (레거시) | 호감을 거절한 상대 (기본값) |

---

## Phase 0: 사전 확인

| # | 작업 | 파일/위치 | 비고 |
|---|------|-----------|------|
| 0.1 | `extra_matching_applies` 테이블에 `created_at` 컬럼 확인 | Supabase Table Editor | 기본 있음 (insert 시 자동). 없다면 추가 |
| 0.2 | `extra_matching_applies`에 `rejected_reason` 컬럼 존재 여부 확인 | Supabase | 없으면 마이그레이션 필요 |

---

## Phase 1: DB 마이그레이션

| # | 작업 | 설명 |
|---|------|------|
| 1.1 | `rejected_reason` 컬럼 추가 | `extra_matching_applies`에 `TEXT` nullable. 값: `'timeout'`, `'manual'`, `'other_accepted'` |
| 1.2 | (선택) `expires_at` 컬럼 추가 | `created_at + 24h` 계산해서 저장. 없으면 API에서 매번 계산 |

---

## Phase 2: 백엔드 — 스케줄러

### 2-A. pg_cron 사용 시

pg_cron은 SQL만 실행 가능. 별 환불(awardStars)은 Node.js 함수이므로 **pg_cron → HTTP webhook → Backend** 구조 필요.

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 2A.1 | pg_cron 활성화 | Supabase Dashboard | Integrations → Cron → Enable |
| 2A.2 | 내부 API 엔드포인트 추가 | `backend/routes/extra-matching.js` | `POST /api/extra-matching/cron/process-expired-applies` (헤더에 `X-Cron-Secret` 검증) |
| 2A.3 | 엔드포인트 로직 구현 | `extra-matching.js` | pending + created_at < now-24h 조회 → 각 apply: status=rejected, rejected_reason='timeout', refunded_star_amount=5, awardStars(), notification, push |
| 2A.4 | pg_cron Job 등록 (pg_net 사용) | Supabase SQL | 1분마다 `net.http_post`로 Backend URL 호출. `X-Cron-Secret` 헤더 포함 |
| 2A.5 | 환경변수 | Render | `CRON_SECRET`, `BACKEND_URL` (또는 고정 URL) |
| 2A.6 | pg_net 확장 활성화 | Supabase | pg_cron이 HTTP 호출하려면 pg_net 필요 |

### 2-B. scheduler.js 사용 시 (권장 — 구현 단순)

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 2B.1 | 만료 apply 처리 함수 추출 | `backend/routes/extra-matching.js` | `processExpiredApplies()` — 재사용 가능한 공통 함수 |
| 2B.2 | scheduler.js에 1분 주기 cron 추가 | `backend/scheduler.js` | `cron.schedule('* * * * *', processExpiredApplies)` |
| 2B.3 | processExpiredApplies 내부 로직 | `extra-matching.js` | awardStars, createNotification, sendPush 기존 코드 활용 |

### 2-C. 공통 (pg_cron / scheduler 모두)

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 2C.1 | 수동 거절 시 `rejected_reason` 설정 | `extra-matching.js` | `POST /applies/:applyId/reject`에서 `rejected_reason: 'manual'` 추가 |
| 2C.2 | 수락 시 다른 apply 자동 거절 시 `rejected_reason` 설정 | `extra-matching.js` | `POST /applies/:applyId/accept` 내 다른 pending 업데이트 시 `rejected_reason: 'other_accepted'` 추가 |

---

## Phase 3: 백엔드 — API 수정

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 3.1 | GET `/entries` 응답에 `expires_at` 추가 | `backend/routes/extra-matching.js` | `my_apply_status === 'pending'` 인 entry에만 `expires_at = created_at + 24h` 포함. apply 조회 시 `created_at` 추가 필요 |
| 3.2 | GET `/entries` 응답에 `my_apply_id`, `my_apply_created_at` 포함 | `extra-matching.js` | sender가 보낸 apply의 id, created_at 필요 시 |
| 3.3 | GET `/my-received-applies` 응답에 `expires_at` 포함 | `extra-matching.js` | 각 apply에 `expires_at: created_at + 24h` 추가 |
| 3.4 | GET `/my-received-applies` 응답에 `rejected_reason` 포함 | `extra-matching.js` | apply가 rejected일 때 `rejected_reason` 반환 |
| 3.5 | POST `/applies/:applyId/accept` 만료 체크 | `extra-matching.js` | apply 조회 후 `created_at + 24h < now()`면 400 + `{ message: "이 호감은 이미 만료되었습니다." }` (기존 "이미 처리된 신청"과 구분) |
| 3.6 | POST `/applies/:applyId/reject` 만료 체크 | `extra-matching.js` | 위와 동일 |
| 3.7 | POST `/entries/:entryId/apply` 응답에 `expires_at` 포함 (선택) | `extra-matching.js` | 성공 시 `apply.created_at + 24h` 반환 → 프론트 즉시 타이머 표시 가능 |

---

## Phase 4: 프론트 — 유틸/훅

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 4.1 | `formatRemainingTime(expiresAt: string)` 유틸 함수 | `src/utils/` (신규 또는 기존) | `1일 N시간`, `N시간 M분`, `N분`, `곧 만료`, `만료됨` |
| 4.2 | `useCountdown(expiresAt: string)` 훅 | `src/hooks/` (신규) | 1분마다 갱신, `{ remainingMs, isExpired }` 반환 |
| 4.3 | 만료 여부 판별 | 위 유틸 내 | `Date.now() >= new Date(expires_at).getTime()` |

---

## Phase 5: 프론트 — 이성들의 추가 매칭 도전 (보낸 사람)

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 5.1 | entries API 응답 타입에 `expires_at` 추가 | `src/pages/ExtraMatchingPage.tsx` 또는 types | |
| 5.2 | "대답을 기다리는 중" 오버레이에 타이머 표시 | `EntryCardOverlayBadge` | `expires_at` 사용해 남은 시간 노출 |
| 5.3 | `expires_at <= now` 일 때 "만료됨" 표시 | 오버레이 | `expires_at` 기반으로 프론트에서 먼저 만료 처리 |
| 5.4 | `rejected_reason`별 오버레이 문구 분기 | `EntryCardOverlayBadge` | `timeout`→"시간 초과로 거절됨", `manual`→"호감을 거절한 상대", `other_accepted`→"상대가 다른 분을 선택했습니다", null→"호감을 거절한 상대" |
| 5.4a | 오버레이 우선순위 수정 | `EntryCardOverlayBadge` | `my_apply_status === 'rejected'` 일 때는 `sold_out`보다 우선 표시 (other_accepted 시 "품절" 대신 "상대가 다른 분을 선택했습니다") |
| 5.5 | 프로필 모달: rejected_reason별 안내 문구 | 모달 하단 | `timeout`→"24시간 내 답변이 없어 자동으로 거절되었습니다. 별 5개가 환불되었습니다.", `other_accepted`→"상대가 다른 분과 매칭되었습니다." |
| 5.6 | 타이머 1분마다 갱신 | `useCountdown` 또는 `setInterval` | 만료 시점에 UI 자동 전환 |
| 5.7 | 호감 보내기 직후 목록 갱신 | `ExtraMatchingPage.tsx` | `applyEntry` 성공 시 `listEntries()` 재호출 → 새 pending + expires_at 반영 |

---

## Phase 6: 프론트 — 나에게 온 호감 (받은 사람)

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 6.1 | applies API 응답 타입에 `expires_at` 추가 | `ExtraMatchingPage.tsx` | |
| 6.2 | pending 호감 1개 이상일 때 상단 배너 표시 | `ExtraMatchingPage.tsx` | "⏱ 24시간 내에 답변해 주세요" + `min(expires_at)` 남은 시간. pending 0되면 배너 숨김 |
| 6.3 | 각 카드에 타이머 배지 표시 | EntryCard 또는 ReceivedCard | pending일 때만 |
| 6.4 | 만료된 pending: 수락/거절 버튼 비활성화 | 카드 | `expires_at <= now` |
| 6.5 | 만료된 pending: 오버레이 + 버튼 숨김 | `EntryCardOverlay` | "24시간 내 답변이 없어 자동 거절되었습니다." (스케줄러 처리 전, 프론트에서 먼저 만료 표시) |
| 6.6 | 만료 후 수락 클릭 시 토스트 | `handleAccept` | "이 호감은 이미 만료되었습니다." |
| 6.7 | 만료 후 거절 클릭 시 토스트 | `handleReject` | "이 호감은 이미 만료되었습니다." |
| 6.8 | 프로필 모달: 만료된 pending — 수락/거절 비활성 + 안내 | 모달 | "이 호감은 24시간 내 답변이 없어 자동 거절되었습니다." |

---

## Phase 7: 프론트 — API 호출 보강

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 7.1 | accept/reject 호출 전 만료 체크 | `ExtraMatchingPage.tsx` | `expires_at <= now`면 API 호출 생략, 토스트만 |
| 7.2 | accept/reject API 400 응답 시 토스트 | `handleAccept`, `handleReject` | "이미 만료" 메시지 표시 |
| 7.3 | 데이터 폴링 또는 리프레시 | `ExtraMatchingPage.tsx` | 탭 포커스 시(`visibilitychange`/`focus`) 또는 5분마다 `listEntries`, `getMyReceivedApplies` 재호출 |
| 7.4 | 탭 백그라운드 복귀 시 타이머 재계산 | `useCountdown` | `visibilitychange` 이벤트에서 `document.visibilityState === 'visible'` 일 때 remainingMs 재계산 (브라우저 throttle 보정) |

---

## Phase 8: 푸시/알림

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 8.1 | 자동 거절 시 보낸 사람에게 in-app 알림 | `processExpiredApplies` 또는 cron webhook 핸들러 | `createNotification()` — "24시간 내 답변이 없어 자동 거절되었습니다. 별 5개가 환불되었습니다." |
| 8.2 | 자동 거절 시 푸시 발송 | 동일 | `sendPushToUsers([sender_id], {...})` — 기존 거절 푸시와 유사한 메시지 |

---

## Phase 9: 테스트·검증

| # | 작업 | 비고 |
|---|------|------|
| 9.1 | 24시간 미만 pending → 수락/거절 정상 동작 | |
| 9.2 | 24시간 경과 후 수락/거절 시도 → 토스트 표시 | |
| 9.3 | Cron 1분 주기 실행 확인 | Supabase Cron Job runs 또는 scheduler 로그 |
| 9.4 | 자동 거절 후 별 5개 환불 확인 | star_transactions |
| 9.5 | 타이머 표시 정확도 (1분 단위 갱신) | |
| 9.6 | 수락 race: pg_cron과 동시에 수락 시도 → 한 쪽만 성공, 중복 처리 없음 | |
| 9.7 | rejected_reason 3종 표시 확인 | manual, timeout, other_accepted |
| 9.8 | 배너: pending 여러 건일 때 "가장 빨리 만료" 정확히 표시 | |
| 9.9 | 모달 열린 상태에서 만료 시점 도달 → 버튼 비활성, 안내 문구 표시 | |
| 9.10 | 타임존: created_at(UTC), expires_at(UTC), Date.now()(UTC) 일치 확인 | |
---

## 추가 고려 사항 (선택/후순위)

| # | 상황 | 대응 |
|---|------|------|
| A.1 | **회차 종료** 시점에 아직 pending인 apply | 회차 finish 시 모든 pending apply 자동 거절 로직 추가 (별 5 환불). settle 또는 별도 처리 |
| A.2 | applyEntry 응답에 `expires_at` 포함 | 성공 시 `expires_at: new Date(created_at).getTime() + 24*60*60*1000` 반환 → 프론트 즉시 반영 가능 (5.7 대체) |
| A.3 | 다중 탭 동시 사용 | 한 탭에서 수락 시 다른 탭은 폴링/포커스 시 갱신. WebSocket/SSE로 실시간 동기화는 선택 |
| A.4 | API 400 "이미 만료" vs "이미 처리됨" | accept/reject 모두 `status !== 'pending'`이면 "이미 처리된 신청", 만료 체크 실패 시 "이미 만료" — 메시지 구분 |

---

## 구현 순서 권장

1. **Phase 1** (DB) → **Phase 2** (스케줄러, 2-B 권장) → **Phase 3** (API)
2. **Phase 4** (유틸) → **Phase 5** (보낸 사람 UI) → **Phase 6** (받은 사람 UI) → **Phase 7** (API 연동)
3. **Phase 8** (알림) → **Phase 9** (테스트)

## 시나리오별 분기 요약

| 역할 | 상태 | expires_at | 화면/동작 |
|------|------|------------|-----------|
| 보낸 사람 | pending, 만료 전 | 있음 | "대답을 기다리는 중" + 타이머 |
| 보낸 사람 | pending, 만료됨 | ≤now | "만료됨" → 스케줄러 후 "시간 초과로 거절됨" |
| 보낸 사람 | rejected, timeout | — | "시간 초과로 거절됨" |
| 보낸 사람 | rejected, manual | — | "호감을 거절한 상대" |
| 보낸 사람 | rejected, other_accepted | — | "상대가 다른 분을 선택했습니다" |
| 받은 사람 | pending, 만료 전 | 있음 | 수락/거절 버튼 + 타이머 |
| 받은 사람 | pending, 만료됨 | ≤now | 버튼 비활성 + 만료 오버레이 |
| 받은 사람 | rejected (timeout) | — | "자동 거절" 오버레이 |

---

## 파일별 체크리스트

| 파일 | 수정 예정 |
|------|-----------|
| `backend/routes/extra-matching.js` | 2A.2~2A.3, 2B.1, 2C.1, 2C.2, 3.1~3.7 |
| `backend/scheduler.js` | 2B.2 (scheduler 방식 선택 시) |
| Supabase Migration | 1.1, 1.2 |
| Supabase Cron + pg_net | 2A.1, 2A.4, 2A.6 (pg_cron 방식 선택 시) |
| `src/pages/ExtraMatchingPage.tsx` | 5.1~5.7, 6.1~6.8, 7.1~7.4 |
| `src/utils/` (신규 또는 기존) | 4.1 |
| `src/hooks/` (신규) | 4.2 |
