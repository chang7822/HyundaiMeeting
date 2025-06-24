const express = require('express');
const router = express.Router();

// 임시 채팅 메시지 데이터
const messages = [];

// 채팅 메시지 조회
router.get('/:matchId/messages', (req, res) => {
  try {
    const { matchId } = req.params;
    const matchMessages = messages.filter(m => m.matchId === matchId);
    
    res.json(matchMessages);
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 메시지 전송
router.post('/:matchId/messages', (req, res) => {
  try {
    const { matchId } = req.params;
    const { content, senderId } = req.body;
    
    if (!content || !senderId) {
      return res.status(400).json({ message: '메시지 내용과 발신자 ID가 필요합니다.' });
    }
    
    const newMessage = {
      id: Date.now().toString(),
      matchId,
      senderId,
      content,
      timestamp: new Date()
    };
    
    messages.push(newMessage);
    
    res.json({
      success: true,
      message: '메시지가 전송되었습니다.',
      chatMessage: newMessage
    });
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 