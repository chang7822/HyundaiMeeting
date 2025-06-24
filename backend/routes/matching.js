const express = require('express');
const router = express.Router();

// 임시 매칭 데이터
const matches = [];

// 매칭 요청
router.post('/request', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: '사용자 ID가 필요합니다.' });
    }
    
    // 임시로 매칭 성공 응답
    const newMatch = {
      id: Date.now().toString(),
      userId1: userId,
      userId2: 'temp_user_' + Date.now(),
      matchDate: new Date(),
      status: 'pending',
      chatEnabled: true,
      createdAt: new Date()
    };
    
    matches.push(newMatch);
    
    res.json({
      success: true,
      message: '매칭이 성공했습니다!',
      match: newMatch
    });
  } catch (error) {
    console.error('매칭 요청 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내 매칭 목록 조회
router.get('/my-matches', (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: '사용자 ID가 필요합니다.' });
    }
    
    const userMatches = matches.filter(m => 
      m.userId1 === userId || m.userId2 === userId
    );
    
    res.json(userMatches);
  } catch (error) {
    console.error('매칭 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 매칭 상세 정보
router.get('/:matchId', (req, res) => {
  try {
    const { matchId } = req.params;
    const match = matches.find(m => m.id === matchId);
    
    if (!match) {
      return res.status(404).json({ message: '매칭을 찾을 수 없습니다.' });
    }
    
    res.json(match);
  } catch (error) {
    console.error('매칭 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 매칭 확인
router.post('/:matchId/confirm', (req, res) => {
  try {
    const { matchId } = req.params;
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      return res.status(404).json({ message: '매칭을 찾을 수 없습니다.' });
    }
    
    matches[matchIndex].status = 'confirmed';
    
    res.json({
      success: true,
      message: '매칭이 확인되었습니다.',
      match: matches[matchIndex]
    });
  } catch (error) {
    console.error('매칭 확인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 매칭 취소
router.post('/:matchId/cancel', (req, res) => {
  try {
    const { matchId } = req.params;
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      return res.status(404).json({ message: '매칭을 찾을 수 없습니다.' });
    }
    
    matches[matchIndex].status = 'cancelled';
    
    res.json({
      success: true,
      message: '매칭이 취소되었습니다.',
      match: matches[matchIndex]
    });
  } catch (error) {
    console.error('매칭 취소 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 