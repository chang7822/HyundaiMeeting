-- =============================================================================
-- 직군(job_type) → 학력(education) 스키마 전환
-- 대상: 개발계 DB (Supabase)
-- 학력 값: 고졸, 2년제대졸, 4년제대졸, 석사 이상
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_profiles: 새 컬럼 추가
-- -----------------------------------------------------------------------------
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS preferred_educations TEXT;

COMMENT ON COLUMN user_profiles.education IS '학력: 고졸, 2년제대졸, 4년제대졸, 석사 이상';
COMMENT ON COLUMN user_profiles.preferred_educations IS '선호 학력 JSON 배열 예: ["고졸","4년제대졸"]';

-- 학력 허용값 제약 (NULL 허용 = 미입력 가능)
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_education_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_education_check
  CHECK (education IS NULL OR education IN ('고졸', '2년제대졸', '4년제대졸', '석사 이상'));

-- -----------------------------------------------------------------------------
-- 2. (선택) 기존 job_type이 있는 행에 학력 기본값 부여
--    개발계에서만 사용. 운영계는 정책에 따라 backfill 또는 NULL 유지.
--    ※ backfill을 할 경우 반드시 아래 3번(DROP COLUMN) 실행 전에 주석 해제 후 실행할 것.
-- -----------------------------------------------------------------------------
-- UPDATE user_profiles
-- SET education = '4년제대졸'
-- WHERE job_type IS NOT NULL AND (education IS NULL OR education = '');

-- -----------------------------------------------------------------------------
-- 3. user_profiles: 직군 컬럼 제거
-- -----------------------------------------------------------------------------
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS job_type,
  DROP COLUMN IF EXISTS preferred_job_types;

-- -----------------------------------------------------------------------------
-- 4. companies: job_type_hold 컬럼 제거 (직군 고정 기능 제거)
-- -----------------------------------------------------------------------------
ALTER TABLE companies
  DROP COLUMN IF EXISTS job_type_hold;

-- -----------------------------------------------------------------------------
-- 5. profile_categories / profile_options: '직군' 카테고리 및 옵션 제거
--    학력은 4종 고정값으로 앱에서만 사용하므로 DB 카테고리 불필요
-- -----------------------------------------------------------------------------
DELETE FROM profile_options
WHERE category_id IN (SELECT id FROM profile_categories WHERE name = '직군');

DELETE FROM profile_categories
WHERE name = '직군';
