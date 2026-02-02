const { supabase } = require('./database');
const { getMessaging } = require('./firebaseAdmin');

/**
 * 특정 user_id 리스트를 대상으로 Web Push(Firebase FCM)를 전송하는 유틸
 * - user_push_tokens 테이블에서 토큰을 조회해 data-only 메시지로 전송
 * - notification 필드 없이 data만 전송 (포어그라운드 이벤트 발생을 위해)
 * @param {string[]} userIds
 * @param {Record<string, string>} data
 */
async function sendPushToUsers(userIds, data) {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, reason: 'no_users' };
    }

    const { data: tokenRows, error } = await supabase
      .from('user_push_tokens')
      .select('token, user_id')
      .in('user_id', userIds);

    if (error) {
      console.error('[pushService] 토큰 조회 오류:', error);
      return { success: false, reason: 'select_error', error };
    }

    const tokens = Array.from(
      new Set((tokenRows || []).map((row) => row.token).filter(Boolean)),
    );

    if (tokens.length === 0) {
      return { success: false, reason: 'no_tokens' };
    }

    const messaging = getMessaging();
    
    // 모든 알림: notification + data 방식 (백그라운드 자동 표시)
    const message = {
      tokens,
      notification: {
        title: data.title || '새 알림',
        body: data.body || '',
      },
      data: data,  // data 객체 그대로 전달 (server.js에서 이미 String 변환됨)
      android: {
        priority: 'high',
        ttl: 86400000,
        notification: {
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    if (response.failureCount > 0) {
      console.error('[pushService] 일부 전송 실패:', response.responses.filter(r => !r.success).map(r => r.error?.message));
    }

    return { success: true, response };
  } catch (e) {
    console.error('[pushService] 예외 발생:', e);
    return { success: false, reason: 'exception', error: e };
  }
}

/**
 * user_push_tokens 에 등록되어 있는 "모든 사용자"를 대상으로 Web Push 전송
 * @param {Record<string, string>} data
 */
async function sendPushToAllUsers(data) {
  try {
    const { data: tokenRows, error } = await supabase
      .from('user_push_tokens')
      .select('token');

    if (error) {
      console.error('[pushService] sendPushToAllUsers 토큰 조회 오류:', error);
      return { success: false, reason: 'select_error', error };
    }

    const tokens = Array.from(
      new Set((tokenRows || []).map((row) => row.token).filter(Boolean)),
    );

    if (tokens.length === 0) {
      return { success: false, reason: 'no_tokens' };
    }

    const messaging = getMessaging();
    
    // 기본적으로 notification + data 방식 사용
    const message = {
      tokens,
      notification: {
        title: data.title || '새 알림',
        body: data.body || '',
      },
      data: data,  // data 객체 그대로 전달
      android: {
        priority: 'high',
        ttl: 86400000,
        notification: {
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    if (response.failureCount > 0) {
      console.error('[pushService] sendPushToAllUsers 일부 전송 실패:', response.failureCount);
    }

    return { success: true, response };
  } catch (e) {
    console.error('[pushService] sendPushToAllUsers 예외:', e);
    return { success: false, reason: 'exception', error: e };
  }
}

/**
 * 관리자 이메일로 등록된 토큰에 푸시 알림 전송
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {object} extraData - 추가 데이터 (linkUrl, postId 등)
 */
async function sendPushToAdmin(title, body, extraData = {}) {
  try {
    const adminEmail = 'hhggom@hyundai.com';
    
    // 관리자 이메일로 user_id 조회
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle();

    if (userError) {
      console.error('[pushService] 관리자 사용자 조회 오류:', userError);
      return { success: false, reason: 'user_query_error', error: userError };
    }

    if (!adminUser) {
      console.log('[pushService] 관리자 사용자를 찾을 수 없음:', adminEmail);
      return { success: false, reason: 'admin_not_found' };
    }

    // 관리자의 푸시 토큰 조회
    const { data: tokenRows, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', adminUser.id);

    if (tokenError) {
      console.error('[pushService] 관리자 토큰 조회 오류:', tokenError);
      return { success: false, reason: 'token_query_error', error: tokenError };
    }

    const tokens = Array.from(
      new Set((tokenRows || []).map((row) => row.token).filter(Boolean)),
    );

    if (tokens.length === 0) {
      console.log('[pushService] 관리자 푸시 토큰이 없음');
      return { success: false, reason: 'no_admin_tokens' };
    }

    const messaging = getMessaging();
    
    // 관리자 푸시: notification + data 방식
    const message = {
      tokens,
      notification: {
        title: title || '[직쏠공 관리자]',
        body: body || '새로운 알림이 있습니다.',
      },
      data: {
        title: title || '[직쏠공 관리자]',
        body: body || '새로운 알림이 있습니다.',
        ...extraData,
      },
      android: {
        priority: 'high',
        ttl: 86400000,
        notification: {
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    // console.log('[pushService] 관리자 푸시 전송 결과:', response.successCount, 'success,', response.failureCount, 'failure');

    return { success: true, response };
  } catch (e) {
    console.error('[pushService] sendPushToAdmin 예외:', e);
    return { success: false, reason: 'exception', error: e };
  }
}

module.exports = {
  sendPushToUsers,
  sendPushToAllUsers,
  sendPushToAdmin,
};
