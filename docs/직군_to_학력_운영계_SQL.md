# 직군 → 학력 전환: 운영계 DB 반영용 SQL

**개발계에 먼저 적용한 뒤, 검증 후 운영계에 반영할 때 사용하는 문서입니다.**

---

## 1. 운영계 반영 전 체크리스트

- [ ] 개발계에서 마이그레이션 SQL 적용 완료
- [ ] 애플리케이션 코드가 `education` / `preferred_educations` 기준으로 배포됨
- [ ] 운영계 DB 백업 완료
- [ ] 운영계 반영 일시(점검 시간대) 확정

---

## 2. 운영계용 SQL (데이터 보존 옵션 포함)

아래 SQL은 **기존 직군 데이터를 백업 테이블로 남긴 뒤** 스키마를 변경하는 버전입니다.  
백업이 필요 없으면 2-1을 건너뛰고 2-2만 실행하면 됩니다.

### 2-1. (선택) 기존 직군 데이터 백업 테이블 생성

```sql
-- user_profiles의 직군 관련 컬럼 백업 (운영계에서만 필요 시 실행)
CREATE TABLE IF NOT EXISTS user_profiles_job_type_backup (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  job_type TEXT,
  preferred_job_types TEXT,
  backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO user_profiles_job_type_backup (user_id, job_type, preferred_job_types)
SELECT user_id, job_type, preferred_job_types
FROM user_profiles
WHERE job_type IS NOT NULL OR preferred_job_types IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  job_type = EXCLUDED.job_type,
  preferred_job_types = EXCLUDED.preferred_job_types,
  backed_up_at = NOW();
```

### 2-2. 스키마 전환 (개발계와 동일)

```sql
-- -----------------------------------------------------------------------------
-- 1. user_profiles: 새 컬럼 추가
-- -----------------------------------------------------------------------------
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS preferred_educations TEXT;

COMMENT ON COLUMN user_profiles.education IS '학력: 고졸, 2년제대졸, 4년제대졸, 석사 이상';
COMMENT ON COLUMN user_profiles.preferred_educations IS '선호 학력 JSON 배열 예: ["고졸","4년제대졸"]';

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_education_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_education_check
  CHECK (education IS NULL OR education IN ('고졸', '2년제대졸', '4년제대졸', '석사 이상'));

-- (선택) 운영계에서 기존 직군 데이터를 학력으로 일괄 매핑하지 않고 NULL로 두려면
-- 아래 UPDATE는 실행하지 않음. 기본값으로 채우려면 주석 해제 후 실행.
-- UPDATE user_profiles SET education = '4년제대졸'
-- WHERE education IS NULL AND user_id IN (SELECT user_id FROM user_profiles_job_type_backup);

-- -----------------------------------------------------------------------------
-- 2. user_profiles: 직군 컬럼 제거
-- -----------------------------------------------------------------------------
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS job_type,
  DROP COLUMN IF EXISTS preferred_job_types;

-- -----------------------------------------------------------------------------
-- 3. companies: job_type_hold 제거
-- -----------------------------------------------------------------------------
ALTER TABLE companies
  DROP COLUMN IF EXISTS job_type_hold;

-- -----------------------------------------------------------------------------
-- 4. profile_categories / profile_options: '직군' 카테고리 제거
-- -----------------------------------------------------------------------------
DELETE FROM profile_options
WHERE category_id IN (SELECT id FROM profile_categories WHERE name = '직군');

DELETE FROM profile_categories
WHERE name = '직군';
```

---

## 3. 실행 방법

### 개발계 (Supabase)

1. **로컬 스크립트 (권장)**  
   - `backend/config.env`에 개발계 DB 연결 문자열 추가:
     ```env
     DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-xx.pooler.supabase.com:6543/postgres
     ```
     (Supabase Dashboard → 프로젝트 선택 → **Settings** → **Database** → **Connection string** → **URI** 복사)
   - 터미널에서 실행:
     ```bash
     cd backend && node run-education-migration.js
     ```

2. **Supabase Dashboard**  
   프로젝트 → **SQL Editor**에서 `supabase/migrations/20250207000000_job_type_to_education.sql` 내용 붙여넣어 실행.

3. **Supabase CLI**  
   로컬에서 개발계 DB 연결 후:
   ```bash
   supabase db push
   ```
   (또는 `supabase migration up` 등 프로젝트에서 사용하는 방식)

### 운영계

1. 위 **2-1**(백업 필요 시) 실행 후 **2-2** 순서대로 실행.
2. Supabase Dashboard의 SQL Editor에서 실행하거나, CLI로 운영 프로젝트에 연결 후 동일 SQL 실행.

---

## 4. 롤백 (비상 시)

- **백업 테이블을 만든 경우**  
  `user_profiles`에 `job_type`, `preferred_job_types` 컬럼을 다시 추가한 뒤  
  `user_profiles_job_type_backup`에서 복원하는 SQL을 별도로 작성해 사용.
- **백업 없이 진행한 경우**  
  직군 데이터 복구는 불가. 스키마만 롤백하려면 `education`/`preferred_educations` 제거 후  
  `job_type`/`preferred_job_types`/`job_type_hold`/직군 카테고리를 다시 추가하는 DDL이 필요합니다.

이 문서는 개발계 적용 후 **운영계 반영 시 재사용**할 수 있도록 SQL만 정리한 것입니다.
