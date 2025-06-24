const express = require('express');
const router = express.Router();

// 임시 사용자 데이터 (auth.js와 공유)
const users = [];

// 사용자 프로필 업데이트
router.put('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 업데이트 가능한 필드들만 허용
    const allowedFields = [
      'birthYear', 'gender', 'height', 'bodyType', 'maritalStatus',
      'location', 'religion', 'occupation', 'smoking', 'drinking',
      'appearance', 'personality', 'interests', 'address', 'preferences', 'appeal'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        users[userIndex][field] = updateData[field];
      }
    });
    
    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      user: users[userIndex]
    });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 정보 조회
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 비밀번호 제외하고 반환
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 