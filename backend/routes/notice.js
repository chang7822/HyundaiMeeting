const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');
const notificationRoutes = require('./notifications');
const { sendPushToAllUsers } = require('../pushService');

// 공지사항 목록 조회
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notice')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('공지사항 조회 오류:', error);
      return res.status(500).json({ message: '공지사항 조회에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 공지사항 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 먼저 현재 공지사항 조회
    const { data: currentNotice, error: fetchError } = await supabase
      .from('notice')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('공지사항 조회 오류:', fetchError);
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    const { error: updateError } = await supabase
      .from('notice')
      .update({ view_count: (currentNotice.view_count || 0) + 1 })
      .eq('id', id);

    if (updateError) {
      console.error('조회수 증가 오류:', updateError);
      // 조회수 증가 실패해도 공지사항은 반환
    }

    res.json(currentNotice);
  } catch (error) {
    console.error('공지사항 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 공지사항 생성
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, author, is_important } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    const { data, error } = await supabase
      .from('notice')
      .insert([{
        title,
        content,
        author: author || '관리자',
        is_important: is_important || false,
        view_count: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('공지사항 생성 오류:', error);
      return res.status(500).json({ message: '공지사항 생성에 실패했습니다.' });
    }

    // 🔔 알림: 활성 사용자들에게 새 공지 알림 발송
    try {
      const { data: activeUsers, error: usersError } = await supabase
        .from('users')
        .select('id, is_active, is_banned')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('[notice] 공지 알림용 사용자 조회 오류:', usersError);
      } else if (activeUsers && activeUsers.length > 0) {
        const targets = activeUsers.filter(
          (u) => u.is_active !== false && u.is_banned !== true && u.id,
        );
        const payload = {
          type: 'notice',
          title: '[공지] 새 공지사항이 등록되었습니다',
          body: `새 공지사항 "${title}" 이(가) 등록되었습니다.\n메인 페이지 또는 공지사항 메뉴에서 자세한 내용을 확인해 주세요.`,
          linkUrl: `/notice/${data.id}`,
          meta: { notice_id: data.id },
        };
        
        // 알림 메시지 생성
        await Promise.all(
          targets.map((u) =>
            notificationRoutes
              .createNotification(String(u.id), payload)
              .catch((e) => console.error('[notice] 공지 알림 생성 오류:', e)),
          ),
        );
        
        // 푸시 알림 (전체 사용자)
        try {
          await sendPushToAllUsers({
            type: 'notice',
            title: '[직쏠공]',
            body: '새 공지사항이 등록되었습니다.',
          });
        } catch (pushErr) {
          console.error('[notice] 공지 푸시 알림 발송 오류:', pushErr);
        }
      }
    } catch (e) {
      console.error('[notice] 공지 알림/푸시 처리 중 예외:', e);
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 공지사항 수정
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, author, is_important } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    const { data, error } = await supabase
      .from('notice')
      .update({
        title,
        content,
        author: author || '관리자',
        is_important: is_important || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('공지사항 수정 오류:', error);
      return res.status(500).json({ message: '공지사항 수정에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 공지사항 삭제
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notice')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('공지사항 삭제 오류:', error);
      return res.status(500).json({ message: '공지사항 삭제에 실패했습니다.' });
    }

    res.json({ success: true, message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 