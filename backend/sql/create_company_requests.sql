-- ============================================================
-- company_requests: 신규 회사 추가 요청 테이블
-- ============================================================
-- Supabase SQL Editor 또는 psql에서 실행
-- companies 테이블이 먼저 존재해야 함 (company_id FK)
-- ============================================================

-- company_requests 테이블 생성
CREATE TABLE IF NOT EXISTS company_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  reply_email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  company_id INTEGER REFERENCES companies(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_company_requests_status ON company_requests(status);
CREATE INDEX IF NOT EXISTS idx_company_requests_created_at ON company_requests(created_at DESC);

-- RLS (Row Level Security)
-- Supabase Service Role 사용 시 RLS 우회되므로, 필요 시 아래 정책 적용
ALTER TABLE company_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access" ON company_requests;
CREATE POLICY "Allow service role full access" ON company_requests
  FOR ALL USING (true) WITH CHECK (true);
