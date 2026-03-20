-- =====================================================
-- 별(⭐) 상점 & 결제 테이블 마이그레이션
-- 개발계 적용일: 2026-03-20
-- 운영계 적용: Supabase 운영 프로젝트(HyundaiMeeting)에서 실행
-- =====================================================

-- shop_products: 별 상품 목록
CREATE TABLE IF NOT EXISTS shop_products (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,           -- "별 30개"
  stars       INT     NOT NULL,           -- 지급할 별 개수
  price       INT     NOT NULL,           -- 원화 가격 (KRW, 원 단위)
  bonus_stars INT     DEFAULT 0,          -- 보너스 별 (이벤트 프로모션용)
  is_active   BOOLEAN DEFAULT true,       -- false 시 상점에서 미노출
  sort_order  INT     DEFAULT 0,          -- 표시 순서
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 상품 데이터
INSERT INTO shop_products (name, stars, price, sort_order) VALUES
  ('별 30개',  30,  3000,  1),
  ('별 100개', 100, 9000,  2),
  ('별 200개', 200, 17000, 3),
  ('별 500개', 500, 40000, 4);

-- payment_orders: 결제 주문 내역
CREATE TABLE IF NOT EXISTS payment_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) NOT NULL,
  product_id       INT  REFERENCES shop_products(id) NOT NULL,

  -- 토스페이먼츠 식별자
  order_id         TEXT UNIQUE NOT NULL,  -- 우리가 생성하는 고유 주문번호
  payment_key      TEXT,                  -- 토스 paymentKey
  toss_secret      TEXT,                  -- 웹훅 검증용 secret (보안)

  -- 결제 정보
  amount           INT  NOT NULL,         -- 결제금액 (원)
  stars_to_award   INT  NOT NULL,         -- 지급할 별 (bonus 포함)

  -- 상태: PENDING / WAITING_FOR_DEPOSIT / DONE / CANCELED / FAILED
  status           TEXT DEFAULT 'PENDING',

  -- 가상계좌 정보
  bank_code        TEXT,
  account_number   TEXT,
  customer_name    TEXT,
  due_date         TIMESTAMPTZ,

  deposited_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id  ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status   ON payment_orders(status);
