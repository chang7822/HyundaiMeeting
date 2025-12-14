const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

// 모든 /api/notifications/* 요청은 인증 필요
router.use(authenticate);

/**
 * 알림 생성 헬퍼 (서버 내부/다른 라우터에서 사용용)
 * 
 * @param {string} userId - 대상 사용자 ID (users.id, uuid)
 * @param {{ type: string, title: string, body: string, linkUrl?: string|null, meta?: any }} payload 
 * @returns {Promise<any>}
 */
async function createNotification(userId, payload) {
  const { type, title, body, linkUrl, meta } = payload || {};

  if (!userId || !type || !title || !body) {
    throw new Error('createNotification: userId, type, title, body 는 필수입니다.');
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      link_url: linkUrl || null,
      meta: meta || null,
    })
    .select('id, user_id, type, title, body, link_url, is_read, read_at, created_at, meta')
    .single();

  if (error) {
    console.error('[notifications] createNotification 오류:', error);
    throw error;
  }

  return data;
}

// 내 알림 목록 조회
// GET /api/notifications?onlyUnread=true|false&limit=20
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { onlyUnread, limit } = req.query;

    let query = supabase
      .from('notifications')
      .select('id, type, title, body, link_url, is_read, read_at, created_at, meta')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (String(onlyUnread) === 'true') {
      query = query.eq('is_read', false);
    }

    const realLimit = Math.min(parseInt(limit, 10) || 20, 100);
    query = query.limit(realLimit);

    const { data, error } = await query;
    if (error) {
      console.error('[notifications] 리스트 조회 오류:', error);
      return res.status(500).json({ message: '알림을 조회하는 중 오류가 발생했습니다.' });
    }

    return res.json({ notifications: data || [] });
  } catch (error) {
    console.error('[notifications] GET / 오류:', error);
    return res.status(500).json({ message: '알림을 조회하는 중 서버 오류가 발생했습니다.' });
  }
});

// 내 읽지 않은 알림 개수
// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.userId;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[notifications] unread-count 조회 오류:', error);
      return res.status(500).json({ message: '읽지 않은 알림 수를 조회하는 중 오류가 발생했습니다.' });
    }

    return res.json({ unreadCount: count || 0 });
  } catch (error) {
    console.error('[notifications] GET /unread-count 오류:', error);
    return res.status(500).json({ message: '읽지 않은 알림 수를 조회하는 중 서버 오류가 발생했습니다.' });
  }
});

// 특정 알림 읽음 처리
// POST /api/notifications/:id/read
router.post('/:id/read', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { data: notif, error: findError } = await supabase
      .from('notifications')
      .select('id, user_id, is_read')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('[notifications] 단건 조회 오류:', findError);
      return res.status(500).json({ message: '알림을 찾는 중 오류가 발생했습니다.' });
    }

    if (!notif || notif.user_id !== userId) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
    }

    if (notif.is_read) {
      return res.json({ success: true, alreadyRead: true });
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: nowIso })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[notifications] 단건 읽음 처리 오류:', updateError);
      return res.status(500).json({ message: '알림을 읽음 처리하는 중 오류가 발생했습니다.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[notifications] POST /:id/read 오류:', error);
    return res.status(500).json({ message: '알림을 읽음 처리하는 중 서버 오류가 발생했습니다.' });
  }
});

// 내 모든 알림 일괄 읽음 처리
// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  try {
    const userId = req.user.userId;
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: nowIso })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[notifications] read-all 업데이트 오류:', error);
      return res.status(500).json({ message: '알림을 읽음 처리하는 중 오류가 발생했습니다.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[notifications] POST /read-all 오류:', error);
    return res.status(500).json({ message: '알림을 읽음 처리하는 중 서버 오류가 발생했습니다.' });
  }
});

// 헬퍼를 라우터 객체에 부착 (다른 모듈에서 require하여 사용 가능)
router.createNotification = createNotification;

module.exports = router;


