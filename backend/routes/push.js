const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');
const { getMessaging } = require('../firebaseAdmin');

/**
 * 푸시 토큰 등록
 * - body: { token: string }
 * - 인증된 사용자(req.user.userId)에 대해 user_push_tokens 테이블에 upsert
 * - 사용자 정보(nickname, email)도 함께 저장
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

    // 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', userId)
      .single();

    const email = userData?.email || null;
    const nickname = profileData?.nickname || null;

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          token: trimmedToken,
          email: email,
          nickname: nickname,
        },
        // 기본 키(또는 unique 제약조건)에 맞춰 upsert되므로 onConflict 생략 가능
      );

    if (error) {
      console.error('[push][register-token] upsert 오류:', error);
      return res.status(500).json({ success: false, message: '푸시 토큰 저장 중 오류가 발생했습니다.' });
    }

    console.log(`[push][register-token] 푸시알림 토큰 등록: user_id=${userId}, email=${email}, nickname=${nickname}`);
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
    // Web에서 중복 알림을 방지하기 위해 notification 필드는 사용하지 않고,
    // data-only 메시지로 보내고 서비스워커(firebase-messaging-sw.js)에서 직접 표시한다.
    const message = {
      tokens: tokenList,
      data: {
        type: 'test',
        title: '푸시알람 테스트',
        body: '푸시알람 테스트 (기능개선 진행중)',
      },
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

/**
 * 관리자용 푸시 알림 전송
 * - body: { email: string, title: string, message: string }
 * - 특정 사용자에게 관리자가 직접 푸시 전송
 */
router.post('/send-admin', authenticate, async (req, res) => {
  try {
    const adminUserId = req.user && req.user.userId;
    const { email, title, message } = req.body || {};

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: '인증 정보가 없습니다.' });
    }

    // 관리자 권한 확인
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminUser || !adminUser.is_admin) {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }

    if (!email || !title || !message) {
      return res.status(400).json({ success: false, message: '이메일, 제목, 내용을 모두 입력해주세요.' });
    }

    // 대상 사용자 조회
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ success: false, message: '해당 이메일의 사용자를 찾을 수 없습니다.' });
    }

    const targetUserId = targetUser.id;

    // 사용자의 푸시 토큰 조회
    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', targetUserId);

    if (tokenError) {
      console.error('[push][send-admin] 토큰 조회 오류:', tokenError);
      return res.status(500).json({ success: false, message: '푸시 토큰 조회 중 오류가 발생했습니다.' });
    }

    const tokenList = (tokens || []).map((row) => row.token).filter(Boolean);
    if (tokenList.length === 0) {
      return res.json({ success: false, message: '해당 사용자의 등록된 푸시 토큰이 없습니다.', sent: 0 });
    }

    const messaging = getMessaging();
    const pushMessage = {
      tokens: tokenList,
      data: {
        type: 'admin',
        title: title,
        body: message,
      },
    };

    const response = await messaging.sendEachForMulticast(pushMessage);
    console.log(`[push][send-admin] 관리자 푸시 전송 결과: email=${email}, sent=${response.successCount}, failed=${response.failureCount}`);

    return res.json({
      success: true,
      sent: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (e) {
    console.error('[push][send-admin] 예외:', e);
    return res.status(500).json({ success: false, message: '관리자 푸시 전송 중 서버 오류가 발생했습니다.' });
  }
});

module.exports = router;

