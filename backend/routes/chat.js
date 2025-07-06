const express = require('express');
const router = express.Router();
const { supabase } = require('../database');

// 채팅 메시지 조회 (period_id, sender_id, receiver_id)
router.get('/:periodId/:partnerUserId/messages', async (req, res) => {
  try {
    const { periodId, partnerUserId } = req.params;
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'userId 쿼리 파라미터 필요' });
    // 내 메시지 or 상대 메시지 모두 조회
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('period_id', periodId)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerUserId}),and(sender_id.eq.${partnerUserId},receiver_id.eq.${userId})`)
      .order('timestamp', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 메시지 전송 (period_id, sender_id, receiver_id, 닉네임)
router.post('/:periodId/:partnerUserId/messages', async (req, res) => {
  try {
    const { periodId, partnerUserId } = req.params;
    const { content, sender_id, receiver_id, sender_nickname, receiver_nickname, timestamp } = req.body;
    if (!content || !sender_id || !receiver_id) {
      return res.status(400).json({ message: 'content, sender_id, receiver_id 필수' });
    }
    const newMessage = {
      period_id: periodId,
      sender_id,
      receiver_id,
      sender_nickname,
      receiver_nickname,
      content,
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
    };
    const { data, error } = await supabase.from('chat_messages').insert([newMessage]).select().single();
    if (error) throw error;
    res.json({ success: true, message: '메시지가 전송되었습니다.', chatMessage: data });
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 