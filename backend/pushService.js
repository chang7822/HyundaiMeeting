const { supabase } = require('./database');
const { getMessaging } = require('./firebaseAdmin');

/**
 * 특정 user_id 리스트를 대상으로 Web Push(Firebase FCM)를 전송하는 유틸
 * - user_push_tokens 테이블에서 토큰을 조회해 data-only 메시지로 전송
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
      .select('token')
      .in('user_id', userIds);

    if (error) {
      console.error('[pushService] sendPushToUsers 토큰 조회 오류:', error);
      return { success: false, reason: 'select_error', error };
    }

    const tokens = Array.from(
      new Set((tokenRows || []).map((row) => row.token).filter(Boolean)),
    );

    if (tokens.length === 0) {
      return { success: false, reason: 'no_tokens' };
    }

    const messaging = getMessaging();
    const message = {
      tokens,
      data,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log('[pushService] sendPushToUsers 결과:', response.successCount, 'success,', response.failureCount, 'failure');

    return { success: true, response };
  } catch (e) {
    console.error('[pushService] sendPushToUsers 예외:', e);
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
    const message = {
      tokens,
      data,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log('[pushService] sendPushToAllUsers 결과:', response.successCount, 'success,', response.failureCount, 'failure');

    return { success: true, response };
  } catch (e) {
    console.error('[pushService] sendPushToAllUsers 예외:', e);
    return { success: false, reason: 'exception', error: e };
  }
}

module.exports = {
  sendPushToUsers,
  sendPushToAllUsers,
};


