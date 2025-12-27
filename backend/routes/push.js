const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');
const { getMessaging } = require('../firebaseAdmin');

/**
 * User-Agent에서 상세한 기기/브라우저 정보 감지
 * @param {string} userAgent 
 * @returns {string} 세분화된 기기 타입
 */
function getDeviceTypeFromUA(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  
  // iOS 기기
  if (/iphone/.test(ua)) {
    return 'iphone';
  } else if (/ipad/.test(ua)) {
    return 'ipad';
  } else if (/ipod/.test(ua)) {
    return 'ipod';
  }
  
  // Android 기기
  else if (/android/.test(ua)) {
    // Android 태블릿 감지
    if (/tablet|tab/.test(ua) || (!/mobile/.test(ua) && /android/.test(ua))) {
      return 'android_tablet';
    }
    return 'android_phone';
  }
  
  // 데스크톱 OS
  else if (/windows/.test(ua)) {
    // Windows Phone (레거시)
    if (/windows phone/.test(ua)) {
      return 'windows_phone';
    }
    // 브라우저별 분류
    if (/edg/.test(ua)) {
      return 'windows_edge';
    } else if (/chrome/.test(ua)) {
      return 'windows_chrome';
    } else if (/firefox/.test(ua)) {
      return 'windows_firefox';
    } else if (/safari/.test(ua) && !/chrome/.test(ua)) {
      return 'windows_safari';
    }
    return 'windows_other';
  }
  
  else if (/macintosh|mac os x/.test(ua)) {
    // 브라우저별 분류
    if (/safari/.test(ua) && !/chrome/.test(ua)) {
      return 'mac_safari';
    } else if (/chrome/.test(ua)) {
      return 'mac_chrome';
    } else if (/firefox/.test(ua)) {
      return 'mac_firefox';
    } else if (/edg/.test(ua)) {
      return 'mac_edge';
    }
    return 'mac_other';
  }
  
  else if (/linux/.test(ua)) {
    // Chrome OS
    if (/cros/.test(ua)) {
      return 'chromeos';
    }
    // 브라우저별 분류
    if (/chrome/.test(ua)) {
      return 'linux_chrome';
    } else if (/firefox/.test(ua)) {
      return 'linux_firefox';
    }
    return 'linux_other';
  }
  
  // 기타 모바일 OS
  else if (/blackberry/.test(ua)) {
    return 'blackberry';
  } else if (/webos/.test(ua)) {
    return 'webos';
  }
  
  // 알 수 없는 기기
  return 'unknown';
}

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
      .from('user_profiles')
      .select('nickname')
      .eq('user_id', userId)
      .single();

    const email = userData?.email || null;
    const nickname = profileData?.nickname || null;
    
    // User-Agent에서 기기 타입 감지
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = getDeviceTypeFromUA(userAgent);

    // upsert 시 onConflict 명시 (복합 기본 키: user_id, token)
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          token: trimmedToken,
          email: email,
          nickname: nickname,
          device_type: deviceType,
        },
        {
          onConflict: 'user_id,token', // 복합 기본 키 명시
        }
      );

    if (error) {
      console.error('[push][register-token] upsert 오류:', error);
      return res.status(500).json({ success: false, message: '푸시 토큰 저장 중 오류가 발생했습니다.' });
    }

    console.log(`[push]푸시알림 토큰 등록: user_id=${userId}, email=${email}, nickname=${nickname}, device=${deviceType}`);
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
    // 앱에서 알림을 받기 위해 notification 필드 추가
    // 웹에서는 서비스워커가 notification 필드를 무시하고 data만 처리하므로 중복 알림 발생하지 않음
    const message = {
      tokens: tokenList,
      notification: {
        title: '푸시알람 테스트',
        body: '푸시알람 테스트 (기능개선 진행중)',
      },
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
    // 앱에서 알림을 받기 위해 notification 필드 추가
    // 웹에서는 서비스워커가 notification 필드를 무시하고 data만 처리하므로 중복 알림 발생하지 않음
    const pushMessage = {
      tokens: tokenList,
      notification: {
        title: title,
        body: message,
      },
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

