# 직군 → 학력 전환: 운영계 SQL

운영계 DB 반영 시 아래 SQL을 순서대로 실행.

---

## 스키마 전환

```sql
-- user_profiles: 새 컬럼
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS preferred_educations TEXT;

COMMENT ON COLUMN user_profiles.education IS '학력: 고졸, 2년제대졸, 4년제대졸, 석사 이상';
COMMENT ON COLUMN user_profiles.preferred_educations IS '선호 학력 JSON 배열';

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_education_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_education_check
  CHECK (education IS NULL OR education IN ('고졸', '2년제대졸', '4년제대졸', '석사 이상'));

-- user_profiles: 직군 컬럼 제거
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS job_type,
  DROP COLUMN IF EXISTS preferred_job_types;

-- companies
ALTER TABLE companies DROP COLUMN IF EXISTS job_type_hold;

-- profile_categories / profile_options: 직군 제거
DELETE FROM profile_options
WHERE category_id IN (SELECT id FROM profile_categories WHERE name = '직군');
DELETE FROM profile_categories WHERE name = '직군';
```
