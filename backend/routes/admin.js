const express = require('express');
const router = express.Router();

// 임시 데이터 (다른 라우트와 공유)
const users = [];
const matches = [];

// 모든 사용자 조회
router.get('/users', (req, res) => {
  try {
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPassword);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 모든 매칭 조회
router.get('/matches', (req, res) => {
  try {
    res.json(matches);
  } catch (error) {
    console.error('매칭 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 상태 업데이트
router.put('/users/:userId/status', (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    users[userIndex].isActive = isActive;
    
    res.json({
      success: true,
      message: '사용자 상태가 업데이트되었습니다.',
      user: users[userIndex]
    });
  } catch (error) {
    console.error('사용자 상태 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 시스템 통계
router.get('/stats', (req, res) => {
  try {
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      totalMatches: matches.length,
      confirmedMatches: matches.filter(m => m.status === 'confirmed').length,
      pendingMatches: matches.filter(m => m.status === 'pending').length,
      cancelledMatches: matches.filter(m => m.status === 'cancelled').length
    };
    
    res.json(stats);
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 