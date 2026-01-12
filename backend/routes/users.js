const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const bcrypt = require('bcrypt');
const authenticate = require('../middleware/authenticate');
const { sendAdminNotificationEmail } = require('../utils/emailService');
const { sendPushToAdmin } = require('../pushService');

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

    // 비밀번호 변경 시 모든 Refresh Token 무효화 (보안)
    try {
      const { error: tokenError } = await supabase
        .from('refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null);
      if (tokenError) {
        console.error('[비번변경] Refresh Token 무효화 오류:', tokenError);
      } else {
        console.log(`[비번변경] 사용자 ${userId}의 모든 Refresh Token 무효화 완료`);
      }
    } catch (tokenErr) {
      console.error('[비번변경] 토큰 무효화 처리 중 오류:', tokenErr);
      // 토큰 무효화 실패해도 비밀번호 변경은 성공했으므로 계속 진행
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
    // 계정 정보 조회 (정지 상태 포함)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_verified, is_active, is_admin, is_banned, banned_until, created_at, updated_at')
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

  // 매칭 정보(상대 프로필 스냅샷용) 보관용 변수
  // period_id + type(main/extra)을 함께 보관해서 어떤 스냅샷을 볼지 결정
  let matchRowForSnapshot = null;

  if (requesterId !== targetId) {
    let isMatchedWithTarget = false;

    // 1) 정규 매칭(matching_applications, type='main') 기준으로 먼저 확인
    try {
    const { data: matchRow, error: matchError } = await supabase
      .from('matching_applications')
        .select('matched, partner_user_id, period_id, type')
      .eq('user_id', requesterId)
        .eq('type', 'main')
      .order('applied_at', { ascending: false })
      .limit(1)
        .maybeSingle();

      if (!matchError && matchRow && matchRow.matched && matchRow.partner_user_id === targetId) {
        isMatchedWithTarget = true;
        matchRowForSnapshot = {
          period_id: matchRow.period_id,
          type: matchRow.type || 'main',
        };
      }
    } catch (e) {
      console.error('[users/:userId/profile] matching_applications 조회 오류:', e);
    }

    // 2) 정규 매칭이 아니더라도, matching_history(정규+추가 매칭 공통)에서 매칭된 적이 있으면 허용
    if (!isMatchedWithTarget) {
      try {
        const { data: historyRow, error: historyError } = await supabase
          .from('matching_history')
          .select('period_id, male_user_id, female_user_id, matched, type')
          .eq('matched', true)
          .or(`male_user_id.eq.${requesterId},female_user_id.eq.${requesterId}`)
          .order('matched_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (
          !historyError &&
          historyRow &&
          (
            (historyRow.male_user_id === requesterId && historyRow.female_user_id === targetId) ||
            (historyRow.female_user_id === requesterId && historyRow.male_user_id === targetId)
          )
        ) {
          isMatchedWithTarget = true;
          // 정규 매칭이면 type='main', 추가 매칭이면 type='extra' 로 스냅샷 조회용 정보 보관
          matchRowForSnapshot = {
            period_id: historyRow.period_id,
            type: historyRow.type || 'main',
          };
        }
      } catch (e) {
        console.error('[users/:userId/profile] matching_history 조회 오류:', e);
      }
    }

    if (!isMatchedWithTarget) {
      return res.status(403).json({ error: '본인 또는 매칭된 상대방만 프로필을 조회할 수 있습니다.' });
    }
  }

  try {
    const { userId } = req.params;
    let profileData;

    if (requesterId === targetId) {
      // 본인인 경우: 항상 최신 프로필(user_profiles) 사용
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('프로필 조회 오류:', error);
        return res.status(404).json({ message: '프로필을 찾을 수 없습니다.' });
      }
      profileData = data;
    } else {
      // 매칭된 상대방인 경우: 매칭 당시 스냅샷을 우선 사용 (정규 main / 추가 extra 공통)
      let snapshot = null;
      if (matchRowForSnapshot && matchRowForSnapshot.period_id) {
        const { data: appRow, error: appError } = await supabase
          .from('matching_applications')
          .select('profile_snapshot')
          .eq('user_id', targetId)
          .eq('period_id', matchRowForSnapshot.period_id)
          .eq('type', matchRowForSnapshot.type || 'main')
          .order('applied_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (appError && appError.code !== 'PGRST116') {
          console.error('프로필 스냅샷 조회 오류:', appError);
          return res.status(500).json({ message: '프로필 스냅샷 조회에 실패했습니다.' });
        }

        if (appRow && appRow.profile_snapshot) {
          snapshot = appRow.profile_snapshot;
        }
      }

      if (snapshot) {
        profileData = snapshot;
      } else {
        // 스냅샷이 없으면 안전하게 최신 프로필로 fallback
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('프로필 조회 오류(스냅샷 없음, 최신 프로필 사용):', error);
          return res.status(404).json({ message: '프로필을 찾을 수 없습니다.' });
        }
        profileData = data;
      }
    }

    // 사용자 정지 상태 정보 조회 (항상 실시간)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_banned, banned_until')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return res.status(500).json({ message: '사용자 정보 조회에 실패했습니다.' });
    }

    // 프로필 데이터에 정지 상태 정보 추가
    const responseData = {
      ...profileData,
      user: {
        is_banned: userData.is_banned,
        banned_until: userData.banned_until
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 이메일 수신 허용 설정 조회
router.get('/me/email-notification', authenticate, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증 정보가 없습니다.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('email_notification_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[이메일 수신 설정 조회] 오류:', error);
      return res.status(500).json({ error: '설정 조회 중 오류가 발생했습니다.' });
    }

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    return res.json({
      email_notification_enabled: user.email_notification_enabled !== false, // null이면 true로 처리
    });
  } catch (err) {
    console.error('[이메일 수신 설정 조회] 서버 오류:', err);
    return res.status(500).json({ error: '설정 조회 중 서버 오류가 발생했습니다.' });
  }
});

// 이메일 수신 허용 설정 업데이트
router.put('/me/email-notification', authenticate, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    const { enabled } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '인증 정보가 없습니다.' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 값은 boolean이어야 합니다.' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_notification_enabled: enabled,
        updated_at: getKSTISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[이메일 수신 설정 업데이트] 오류:', updateError);
      return res.status(500).json({ error: '설정 업데이트 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      email_notification_enabled: enabled,
      message: enabled ? '이메일 수신이 허용되었습니다.' : '이메일 수신이 거부되었습니다.',
    });
  } catch (err) {
    console.error('[이메일 수신 설정 업데이트] 서버 오류:', err);
    return res.status(500).json({ error: '설정 업데이트 중 서버 오류가 발생했습니다.' });
  }
});

// 회원 탈퇴 (DELETE /me)
// 이메일 수신 허용 설정 조회
router.get('/me/email-notification', authenticate, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증 정보가 없습니다.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('email_notification_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[이메일 수신 설정 조회] 오류:', error);
      return res.status(500).json({ error: '설정 조회 중 오류가 발생했습니다.' });
    }

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    return res.json({
      email_notification_enabled: user.email_notification_enabled !== false, // null이면 true로 처리
    });
  } catch (err) {
    console.error('[이메일 수신 설정 조회] 서버 오류:', err);
    return res.status(500).json({ error: '설정 조회 중 서버 오류가 발생했습니다.' });
  }
});

// 이메일 수신 허용 설정 업데이트
router.put('/me/email-notification', authenticate, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    const { enabled } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '인증 정보가 없습니다.' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 값은 boolean이어야 합니다.' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_notification_enabled: enabled,
        updated_at: getKSTISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[이메일 수신 설정 업데이트] 오류:', updateError);
      return res.status(500).json({ error: '설정 업데이트 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      email_notification_enabled: enabled,
      message: enabled ? '이메일 수신이 허용되었습니다.' : '이메일 수신이 거부되었습니다.',
    });
  } catch (err) {
    console.error('[이메일 수신 설정 업데이트] 서버 오류:', err);
    return res.status(500).json({ error: '설정 업데이트 중 서버 오류가 발생했습니다.' });
  }
});

router.delete('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 0. 사용자 정보 조회 (이메일과 정지 상태 확인)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, is_banned, banned_until, report_count')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('[회원탈퇴] 사용자 정보 조회 오류:', userError);
      throw userError;
    }
    
    const userEmail = userData.email;
    console.log(`[회원탈퇴] 탈퇴 시작: ${userEmail} (ID: ${userId})`);

    // 0-0. 프로필 정보 조회 (전체 프로필 정보 - 관리자 메일용)
    let profile = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profileError && profileData) {
        profile = profileData;
      }
    } catch (e) {
      console.error('[회원탈퇴] 프로필 정보 조회 오류:', e);
    }
    
    // 0-1. 탈퇴 사용자 정보 로깅 (블랙리스트 시스템 제거)
    if (userData.is_banned || (userData.report_count && userData.report_count > 0)) {
      console.log(`[회원탈퇴] 정지/신고된 사용자 탈퇴: ${userEmail} (정지: ${userData.is_banned}, 신고횟수: ${userData.report_count})`);
    }
    
    // 1. 개인정보 관련 데이터 삭제
    // chat_messages 삭제 (개인 대화 내용)
    const { error: error1 } = await supabase.from('chat_messages').delete().eq('sender_id', userId);
    if (error1) {
      console.error('[회원탈퇴] chat_messages sender 삭제 오류:', error1);
      throw error1;
    }
    
    const { error: error2 } = await supabase.from('chat_messages').delete().eq('receiver_id', userId);
    if (error2) {
      console.error('[회원탈퇴] chat_messages receiver 삭제 오류:', error2);
      throw error2;
    }
    
    // 2. 매칭 데이터 삭제 (matching_applications 행 자체 삭제)
    const { error: error3 } = await supabase
      .from('matching_applications')
      .delete()
      .eq('user_id', userId);
    if (error3) {
      console.error('[회원탈퇴] matching_applications 익명화 오류:', error3);
      throw error3;
    }
    
    // matching_history 익명화 (스냅샷 정보는 보존)
    const { error: error4 } = await supabase
      .from('matching_history')
      .update({ male_user_id: null })
      .eq('male_user_id', userId);
    if (error4) {
      console.error('[회원탈퇴] matching_history male 익명화 오류:', error4);
      throw error4;
    }
    
    const { error: error5 } = await supabase
      .from('matching_history')
      .update({ female_user_id: null })
      .eq('female_user_id', userId);
    if (error5) {
      console.error('[회원탈퇴] matching_history female 익명화 오류:', error5);
      throw error5;
    }
    
    // 3. user_profiles 삭제
    const { error: error6 } = await supabase.from('user_profiles').delete().eq('user_id', userId);
    if (error6) {
      console.error('[회원탈퇴] user_profiles 삭제 오류:', error6);
      throw error6;
    }
    
    // 3-1. Refresh Token 삭제 (users 삭제 전에 먼저 처리하여 Foreign Key 에러 방지)
    try {
      const { error: tokenError } = await supabase
        .from('refresh_tokens')
        .delete()
        .eq('user_id', userId);
      if (tokenError) {
        console.error('[회원탈퇴] Refresh Token 삭제 오류:', tokenError);
        // 에러가 나도 계속 진행
      }
    } catch (tokenErr) {
      console.error('[회원탈퇴] Refresh Token 처리 중 오류:', tokenErr);
    }
    
    // 4. users 삭제 (마지막에 실행)
    const { error: error7 } = await supabase.from('users').delete().eq('id', userId);
    if (error7) {
      console.error('[회원탈퇴] users 삭제 오류:', error7);
      throw error7;
    }
    
    // 5. reports는 보존 (신고 이력 및 정지 관리용)
    // matching_log도 보존 (시스템 통계용)

    // 6. 관리자 알림 메일 발송 (비동기)
    try {
      const adminSubject = '회원 탈퇴';
      
      // JSON 배열 파싱 헬퍼 함수
      const parseJsonArray = (value) => {
        if (!value) return null;
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          return Array.isArray(parsed) ? parsed.join(', ') : parsed;
        } catch {
          return value;
        }
      };

      // 선호 회사명 조회
      let preferCompanyNames = [];
      if (profile && Array.isArray(profile.prefer_company) && profile.prefer_company.length > 0) {
        try {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, name')
            .in('id', profile.prefer_company);
          if (companies && companies.length > 0) {
            preferCompanyNames = companies.map(c => c.name).filter(Boolean);
          }
        } catch (e) {
          console.error('[회원탈퇴] 선호 회사명 조회 오류:', e);
        }
      }

      const adminBodyLines = [
        '회원이 탈퇴했습니다.',
        '',
        '=== 기본 정보 ===',
        `이메일: ${userEmail}`,
        `닉네임: ${profile?.nickname || '-'}`,
        `성별: ${profile?.gender || '-'}`,
        `출생연도: ${profile?.birth_year || '-'}`,
        `키: ${profile?.height ? `${profile.height}cm` : '-'}`,
        `거주지: ${profile?.residence || '-'}`,
        '',
        '=== 회사 정보 ===',
        `회사: ${profile?.company || '-'}`,
        profile?.custom_company_name 
          ? `사용자 입력 회사명: ${profile.custom_company_name}`
          : '',
        `직군: ${profile?.job_type || '-'}`,
        '',
        '=== 프로필 정보 ===',
        `자기소개: ${profile?.appeal || '-'}`,
        `결혼상태: ${profile?.marital_status || '-'}`,
        `종교: ${profile?.religion || '-'}`,
        `흡연: ${profile?.smoking || '-'}`,
        `음주: ${profile?.drinking || '-'}`,
        `MBTI: ${profile?.mbti || '-'}`,
        `체형: ${parseJsonArray(profile?.body_type) || '-'}`,
        `관심사: ${parseJsonArray(profile?.interests) || '-'}`,
        `외모: ${parseJsonArray(profile?.appearance) || '-'}`,
        `성격: ${parseJsonArray(profile?.personality) || '-'}`,
        '',
        '=== 선호 스타일 ===',
        `선호 연령: ${profile?.preferred_age_min || '-'}세 ~ ${profile?.preferred_age_max || '-'}세`,
        `선호 키: ${profile?.preferred_height_min || '-'}cm ~ ${profile?.preferred_height_max || '-'}cm`,
        `선호 체형: ${parseJsonArray(profile?.preferred_body_types) || '-'}`,
        `선호 직군: ${parseJsonArray(profile?.preferred_job_types) || '-'}`,
        `선호 결혼상태: ${parseJsonArray(profile?.preferred_marital_statuses) || '-'}`,
        `선호 회사: ${preferCompanyNames.length > 0 ? preferCompanyNames.join(', ') : '-'}`,
        `선호 지역: ${Array.isArray(profile?.prefer_region) && profile.prefer_region.length > 0 
          ? profile.prefer_region.join(', ') 
          : '-'}`,
        '',
        '=== 계정 정보 ===',
        `정지 상태: ${userData.is_banned ? 'YES' : 'NO'}`,
        `신고 횟수: ${userData.report_count || 0}회`,
      ].filter(line => line !== ''); // 빈 줄 제거
      
      sendAdminNotificationEmail(adminSubject, adminBodyLines.join('\n')).catch(err => {
        console.error('[회원탈퇴] 관리자 알림 메일 발송 실패:', err);
      });

      // 관리자 푸시 알림 발송
      sendPushToAdmin(
        '[직쏠공 관리자] 회원 탈퇴',
        `${profile?.nickname || '회원'}(${userEmail})님이 탈퇴했습니다.`
      ).catch(err => {
        console.error('[회원탈퇴] 관리자 푸시 알림 발송 실패:', err);
      });
    } catch (e) {
      console.error('[회원탈퇴] 관리자 알림 메일 처리 중 오류:', e);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[회원탈퇴] 서버 오류:', err);
    res.status(500).json({ error: '회원 탈퇴 중 서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 