const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { encrypt } = require('../utils/encryption');
const { decrypt } = require('../utils/encryption');

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
    // content 복호화
    const result = (data || []).map(msg => {
      let decrypted = '';
      try {
        decrypted = decrypt(msg.content);
      } catch (e) {
        // 기존 평문 메시지 등 복호화 실패 시 그대로 반환
        decrypted = '[복호화 실패]';
        console.warn('[chat.js] content 복호화 실패:', e);
      }
      return { ...msg, content: decrypted };
    });
    res.json(result);
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
    let encryptedContent;
    try {
      encryptedContent = encrypt(content);
    } catch (e) {
      console.error('[chat.js] 암호화 실패:', e);
      return res.status(500).json({ message: '메시지 암호화에 실패했습니다.' });
    }
    const newMessage = {
      period_id: periodId,
      sender_id,
      receiver_id,
      sender_nickname,
      receiver_nickname,
      content: encryptedContent,
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