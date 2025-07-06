import { test, expect } from '@playwright/test';

// 테스트 계정 정보 (실제 DB에 존재하는 계정으로 수정 필요)
const TEST_EMAIL = 'hhggom@hyundai.com';
const TEST_PASSWORD = 'Hgmrrha12!@';

// partnerUserId는 실제 매칭된 상대 user_id로 교체 필요
const PARTNER_USER_ID = '630dc742-b343-45e4-ac36-31cdcb30337e';

// 채팅방 URL 생성 함수
function getChatUrl(partnerUserId: string) {
  return `http://localhost:3000/chat/${partnerUserId}`;
}

test('채팅방 새로고침 시 메시지 정상 불러오기', async ({ page }) => {
  // 1. 로그인 페이지 진입
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // 2. 메인페이지 진입 대기
  await page.waitForURL('**/main');
  // 3. 채팅방 진입
  await page.goto(getChatUrl(PARTNER_USER_ID));
  // 4. 메시지 입력 및 전송
  const testMsg = `E2E-메시지-${Date.now()}`;
  await page.fill('input[type="text"]', testMsg);
  await page.keyboard.press('Enter');
  // 5. 메시지 전송 후 메시지 노출 대기
  await expect(page.locator(`text=${testMsg}`)).toBeVisible({ timeout: 3000 });
  // 6. 새로고침
  await page.reload();
  // 7. 새로고침 후에도 메시지가 보이는지 확인
  await expect(page.locator(`text=${testMsg}`)).toBeVisible({ timeout: 3000 });
}); 