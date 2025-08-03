const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const bcrypt = require('bcrypt');
const authenticate = require('../middleware/authenticate');

// 임시 사용자 데이터 (auth.js와 공유)
const users = [];

// KST(한국시간) ISO 문자열 반환 함수
function getKSTISOString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace('T', ' ').substring(0, 19); // 'YYYY-MM-DD HH:mm:ss'
}

// 비밀번호 변경 API
router.put('/:id/password', authenticate, async (req, res) => {
  if (String(req.user.userId) !== String(req.params.id)) {
    return res.status(403).json({ error: '본인 비밀번호만 변경할 수 있습니다.' });
  }
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요.' });
  }
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('[비번변경] 유저 조회 에러:', error);
      return res.status(500).json({ error: '사용자 조회 중 오류가 발생했습니다.' });
    }
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashed, updated_at: getKSTISOString() })
      .eq('id', userId);
    if (updateError) {
      console.error('[비번변경] 비밀번호 업데이트 에러:', updateError);
      return res.status(500).json({ error: '비밀번호 업데이트 중 오류가 발생했습니다.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[비번변경] 서버 오류:', err);
    res.status(500).json({ error: '비밀번호 변경 중 서버 오류가 발생했습니다.' });
  }
});

// 내 정보 수정 (PUT /me)
router.put('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = { ...req.body, updated_at: getKSTISOString() };
    // undefined 값 제거
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    // body_type 처리: 배열이면 stringify, string이면 그대로, 그 외(null 등)면 null
    if (updateData.body_type !== undefined) {
      if (Array.isArray(updateData.body_type)) {
        if (updateData.body_type.length === 0) {
          return res.status(400).json({ message: '체형은 최소 1개 이상 선택해야 합니다.' });
        }
        updateData.body_type = JSON.stringify(updateData.body_type);
      } else if (typeof updateData.body_type === 'string') {
        try {
          const arr = JSON.parse(updateData.body_type);
          if (Array.isArray(arr) && arr.length === 0) {
            return res.status(400).json({ message: '체형은 최소 1개 이상 선택해야 합니다.' });
          }
        } catch {}
        // 이미 string이면 그대로 둠
      } else {
        return res.status(400).json({ message: '체형은 최소 1개 이상 선택해야 합니다.' });
      }
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      // 에러 상세 반환
      return res.status(500).json({ message: '프로필 업데이트에 실패했습니다.', supabaseError: error.message, details: error.details, hint: error.hint });
    }
    res.json({ success: true, profile: data });
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내 정보 조회 (GET /me)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    // 계정 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_verified, is_active, is_admin, created_at, updated_at')
      .eq('id', userId)
      .single();
    if (userError || !user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    // 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    // 계정 정보와 프로필 정보를 합쳐서 반환
    const userData = {
      ...user,
      ...profile
    };
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 프로필 카테고리 조회
router.get('/profile-categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_categories')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('프로필 카테고리 조회 오류:', error);
      return res.status(500).json({ message: '프로필 카테고리 조회에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('프로필 카테고리 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 프로필 옵션 조회
router.get('/profile-options', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_options')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('프로필 옵션 조회 오류:', error);
      return res.status(500).json({ message: '프로필 옵션 조회에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('프로필 옵션 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 프로필 업데이트
router.put('/:userId', authenticate, async (req, res) => {
  if (String(req.user.userId) !== String(req.params.userId)) {
    return res.status(403).json({ error: '본인 정보만 수정할 수 있습니다.' });
  }
  try {
    const { userId } = req.params;
    const updateData = { ...req.body, updated_at: getKSTISOString() };
    if (updateData.body_type && Array.isArray(updateData.body_type)) {
      updateData.body_type = JSON.stringify(updateData.body_type);
    }
    // user_profiles 테이블에서 업데이트
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      console.error('프로필 업데이트 오류:', error);
      return res.status(500).json({ message: '프로필 업데이트에 실패했습니다.' });
    }
    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      profile: data
    });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 정보 조회 (계정 정보 + 프로필 정보)
router.get('/:userId', authenticate, async (req, res) => {
  if (String(req.user.userId) !== String(req.params.userId)) {
    return res.status(403).json({ error: '본인 정보만 조회할 수 있습니다.' });
  }
  try {
    const { userId } = req.params;
    
    // 계정 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_verified, is_active, is_admin, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('사용자 조회 오류:', userError);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 계정 정보와 프로필 정보를 합쳐서 반환
    const userData = {
      ...user,
      ...profile
    };

    res.json(userData);
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 프로필만 조회
router.get('/:userId/profile', authenticate, async (req, res) => {
  // 본인 또는 매칭된 상대방이면 허용
  const requesterId = String(req.user.userId);
  const targetId = String(req.params.userId);
  if (requesterId !== targetId) {
    // 매칭 성공 여부 확인
    const { data: matchRow, error: matchError } = await supabase
      .from('matching_applications')
      .select('matched, partner_user_id, period_id')
      .eq('user_id', requesterId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .single();
    if (matchError || !matchRow || !matchRow.matched || matchRow.partner_user_id !== targetId) {
      return res.status(403).json({ error: '본인 또는 매칭된 상대방만 프로필을 조회할 수 있습니다.' });
    }
  }
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      console.error('프로필 조회 오류:', error);
      return res.status(404).json({ message: '프로필을 찾을 수 없습니다.' });
    }
    res.json(data);
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 탈퇴 (DELETE /me)
router.delete('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    // 1. matching_applications 삭제
    await supabase.from('matching_applications').delete().eq('user_id', userId);
    // 2. matching_history 삭제 (male_user_id, female_user_id)
    await supabase.from('matching_history').delete().eq('male_user_id', userId);
    await supabase.from('matching_history').delete().eq('female_user_id', userId);
    // 3. chat_messages 삭제 (sender_id, receiver_id)
    await supabase.from('chat_messages').delete().eq('sender_id', userId);
    await supabase.from('chat_messages').delete().eq('receiver_id', userId);
    // 4. reports 삭제 (reporter_user_id, reported_user_id)
    await supabase.from('reports').delete().eq('reporter_user_id', userId);
    await supabase.from('reports').delete().eq('reported_user_id', userId);
    // 5. user_profiles 삭제
    await supabase.from('user_profiles').delete().eq('user_id', userId);
    // 6. users 삭제
    await supabase.from('users').delete().eq('id', userId);
    res.json({ success: true });
  } catch (err) {
    console.error('[회원탈퇴] 서버 오류:', err);
    res.status(500).json({ error: '회원 탈퇴 중 서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 