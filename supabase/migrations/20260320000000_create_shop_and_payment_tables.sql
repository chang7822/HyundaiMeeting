-- =====================================================
-- 별(⭐) 상점 & 결제 — 단일 마이그레이션
-- - shop_products, payment_orders
-- - pay_channel (가상계좌 / 간편결제)
-- - 상품 시드: 정가 개당 300원 → 10개 0% | 50개 10% | 100개 25% | 500개 50%
-- 운영/개발 Supabase: 이 파일 1개만 순서대로 실행하면 됨.
-- =====================================================

-- shop_products: 별 상품 목록
CREATE TABLE IF NOT EXISTS shop_products (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,
  stars       INT     NOT NULL,
  price       INT     NOT NULL,
  bonus_stars INT     DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  sort_order  INT     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- payment_orders: 결제 주문 내역
CREATE TABLE IF NOT EXISTS payment_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) NOT NULL,
  product_id       INT  REFERENCES shop_products(id) NOT NULL,

  order_id         TEXT UNIQUE NOT NULL,
  payment_key      TEXT,
  toss_secret      TEXT,

  amount           INT  NOT NULL,
  stars_to_award   INT  NOT NULL,

  status           TEXT DEFAULT 'PENDING',

  pay_channel      TEXT NOT NULL DEFAULT 'virtual_account',

  bank_code        TEXT,
  account_number   TEXT,
  customer_name    TEXT,
  due_date         TIMESTAMPTZ,

  deposited_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 예전에 pay_channel 없이 생성된 payment_orders 대비
ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS pay_channel TEXT NOT NULL DEFAULT 'virtual_account';

COMMENT ON COLUMN payment_orders.pay_channel IS 'virtual_account | easy_pay';

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id  ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status   ON payment_orders(status);

-- 기존 상품 비활성화 후 현재 판매 4종만 추가 (payment_orders FK 유지)
UPDATE shop_products SET is_active = false;

INSERT INTO shop_products (name, stars, price, bonus_stars, sort_order) VALUES
  ('별 10개',   10,    3000, 0, 1),
  ('별 50개',   50,   13500, 0, 2),
  ('별 100개', 100,   22500, 0, 3),
  ('별 500개', 500,   75000, 0, 4);
