const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');
const { getMessaging } = require('../firebaseAdmin');

/**
 * 푸시 토큰 등록
 * - body: { token: string }
 * - 인증된 사용자(req.user.userId)에 대해 user_push_tokens 테이블에 upsert
 */
router.post('/register-token', authenticate, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    const { token } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: '인증 정보가 없습니다.' });
    }

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ success: false, message: '유효한 푸시 토큰이 필요합니다.' });
    }

    const trimmedToken = token.trim();

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          token: trimmedToken,
        },
        // 기본 키(또는 unique 제약조건)에 맞춰 upsert되므로 onConflict 생략 가능
      );

    if (error) {
      console.error('[push][register-token] upsert 오류:', error);
      return res.status(500).json({ success: false, message: '푸시 토큰 저장 중 오류가 발생했습니다.' });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('[push][register-token] 예외:', e);
    return res.status(500).json({ success: false, message: '푸시 토큰 저장 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 푸시 토큰 해제
 * - body: { token?: string }
 * - token이 있으면 해당 토큰만 삭제, 없으면 해당 user의 모든 토큰 삭제
 */
router.post('/unregister-token', authenticate, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    const { token } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: '인증 정보가 없습니다.' });
    }

    let query = supabase.from('user_push_tokens').delete().eq('user_id', userId);
    if (token && typeof token === 'string' && token.trim().length > 0) {
      query = query.eq('token', token.trim());
    }

    const { error } = await query;
    if (error) {
      console.error('[push][unregister-token] 삭제 오류:', error);
      return res.status(500).json({ success: false, message: '푸시 토큰 해제 중 오류가 발생했습니다.' });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('[push][unregister-token] 예외:', e);
    return res.status(500).json({ success: false, message: '푸시 토큰 해제 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 테스트 푸시 알림 전송
 * - 현재 로그인한 사용자의 모든 토큰을 대상으로 FCM 푸시 발송
 * - notification: { title, body } 고정
 */
router.post('/send-test', authenticate, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '인증 정보가 없습니다.' });
    }

    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      console.error('[push][send-test] 토큰 조회 오류:', error);
      return res.status(500).json({ success: false, message: '푸시 토큰 조회 중 오류가 발생했습니다.' });
    }

    const tokenList = (tokens || []).map((row) => row.token).filter(Boolean);
    if (tokenList.length === 0) {
      return res.json({ success: false, message: '등록된 푸시 토큰이 없습니다.', sent: 0 });
    }

    const messaging = getMessaging();
    const message = {
      notification: {
        title: '푸시알람 테스트',
        body: '푸시알람 테스트 (기능개선 진행중)',
      },
      tokens: tokenList,
      data: { type: 'test' },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log('[push][send-test] 결과:', response);

    return res.json({
      success: true,
      sent: response.successCount,
      failureCount: response.failureCount,
      detail: response,
    });
  } catch (e) {
    console.error('[push][send-test] 예외:', e);
    return res.status(500).json({ success: false, message: '테스트 푸시 전송 중 서버 오류가 발생했습니다.' });
  }
});

module.exports = router;

