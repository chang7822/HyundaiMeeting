const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { sendAdminNotificationEmail } = require('../utils/emailService');

// 임시 매칭 데이터
const matches = [];

const cancelTime = 1;

// 매칭 기간(신청/마감/알고리즘/발표) 정보 조회
router.get('/period', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matching_log')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(); // single() 대신 maybeSingle() 사용
    
    if (error) {
      console.error('매칭 회차 조회 오류:', error);
      return res.status(500).json({ message: '매칭 회차 정보 조회 중 오류가 발생했습니다.' });
    }
    
    if (!data) {
      return res.status(404).json({ message: '아직 생성된 매칭 회차가 없습니다.' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('매칭 기간 조회 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 매칭 요청
router.post('/request', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: '사용자 ID가 필요합니다.' });
    }

    // 정지 상태 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_banned, banned_until, email')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('사용자 상태 조회 오류:', userError);
      return res.status(500).json({ message: '사용자 상태를 확인할 수 없습니다.' });
    }

    if (user.is_banned) {
      if (user.banned_until) {
        const bannedUntil = new Date(user.banned_until);
        const now = new Date();
        if (bannedUntil > now) {
          return res.status(403).json({ 
            message: `정지 상태입니다. ${bannedUntil.toLocaleDateString('ko-KR')}까지 매칭 신청이 불가능합니다.` 
          });
        }
      } else {
        return res.status(403).json({ message: '영구 정지 상태입니다. 매칭 신청이 불가능합니다.' });
      }
    }

    // 최근 신청 내역(취소 포함) 조회
    const { data: lastApp, error: lastAppError } = await supabase
      .from('matching_applications')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .single();
    if (lastAppError && lastAppError.code !== 'PGRST116') throw lastAppError;
    if (lastApp && lastApp.cancelled && lastApp.cancelled_at) {
      const cancelledAt = new Date(lastApp.cancelled_at);
      const now = new Date();
      if (now.getTime() - cancelledAt.getTime() < cancelTime * 60 * 1000) {
        return res.status(400).json({ message: `신청 취소 후 ${cancelTime}분 동안 재신청이 불가합니다.` });
      }
    }

    // 최신 matching_log(=period) id 조회
    const { data: periodData, error: periodError } = await supabase
      .from('matching_log')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (periodError) throw periodError;
    const periodId = periodData.id;

    // 이미 신청한 내역이 있는지 확인 (period_id 포함)
    const { data: existing, error: checkError } = await supabase
      .from('matching_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .eq('applied', true)
      .eq('cancelled', false)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return res.status(400).json({ message: '이미 매칭을 신청하셨습니다.' });
    }

    // 신규 신청 insert (period_id 포함)
    // 1. 프로필/선호 스냅샷 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (profileError || !profile) {
      throw profileError || new Error('프로필 정보가 없습니다.');
    }
    // 선호 필드만 추출 (preferred_로 시작하는 필드)
    const preferenceSnapshot = {};
    Object.keys(profile).forEach(key => {
      if (key.startsWith('preferred_')) {
        preferenceSnapshot[key] = profile[key];
      }
    });
    // 2. 신청 insert
    const { data, error } = await supabase
      .from('matching_applications')
      .insert([{
        user_id: userId,
        period_id: periodId,
        applied: true,
        cancelled: false,
        applied_at: new Date().toISOString(),
        profile_snapshot: profile,
        preference_snapshot: preferenceSnapshot
      }])
      .select()
      .single();

    if (error) throw error;

    // [추가] users 테이블의 is_applied, is_matched 업데이트
    await supabase
      .from('users')
      .update({ is_applied: true, is_matched: null })
      .eq('id', userId);

    // 관리자 알림 메일 발송 (비동기)
    try {
      const adminSubject = '매칭 신청';
      const adminBodyLines = [
        '새로운 매칭 신청이 접수되었습니다.',
        '',
        `사용자 ID: ${userId}`,
        `이메일: ${user?.email || '알 수 없음'}`,
        `닉네임: ${profile.nickname || '알 수 없음'}`,
        `성별: ${profile.gender || '알 수 없음'}`,
        `회차 ID: ${periodId}`,
      ];
      sendAdminNotificationEmail(adminSubject, adminBodyLines.join('\n')).catch(err => {
        console.error('[매칭 신청] 관리자 알림 메일 발송 실패:', err);
      });
    } catch (e) {
      console.error('[매칭 신청] 관리자 알림 메일 처리 중 오류:', e);
    }

    res.json({
      success: true,
      message: '매칭 신청이 완료되었습니다.',
      application: data
    });
  } catch (error) {
    console.error('매칭 신청 오류:', error);
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

// 매칭 신청 상태 조회 (users 테이블 정보 우선 반영)
router.get('/status', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: '사용자 ID가 필요합니다.' });
    }
    
    // 1. users 테이블에서 실시간 상태 조회 (스케줄러 초기화 즉시 반영)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_applied, is_matched')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('users 테이블 조회 실패:', userError);
      return res.status(500).json({ message: '사용자 상태 조회 오류' });
    }
    
    // 2. 최신 matching_log 조회
    const { data: periodData, error: periodError } = await supabase
      .from('matching_log')
      .select('id, application_start, application_end, matching_announce, finish')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (periodError) {
      console.error('회차 정보 조회 실패:', periodError);
      return res.status(500).json({ message: '회차 정보 조회 오류' });
    }
    
    if (!periodData) {
      return res.json({ status: null, message: '아직 생성된 회차가 없습니다.' });
    }
    
    // 3. matching_applications 조회
    const { data: appData, error: appError } = await supabase
      .from('matching_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('period_id', periodData.id)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (appError && appError.code !== 'PGRST116') {
      console.error('matching_applications 조회 실패:', appError);
      throw appError;
    }
    
    // 4. 최종 응답 구성
    const resolvedMatchState = typeof userData.is_matched === 'boolean'
      ? userData.is_matched
      : (typeof appData?.matched === 'boolean' ? appData.matched : null);
    const resolvedAppliedState = typeof userData.is_applied === 'boolean'
      ? userData.is_applied
      : (typeof appData?.applied === 'boolean' ? appData.applied : false);
    
    let finalStatus;
    
    if (!appData) {
      // matching_applications 데이터 없음 - users 기반
      finalStatus = {
        user_id: userId,
        period_id: periodData.id,
        applied: resolvedAppliedState,
        is_applied: resolvedAppliedState,
        cancelled: false,
        is_cancelled: false,
        matched: resolvedMatchState,
        is_matched: resolvedMatchState,
        partner_user_id: null,
        applied_at: null,
        cancelled_at: null,
        matched_at: null
      };
    } else {
      // matching_applications + users 결합
      finalStatus = {
        ...appData,
        applied: resolvedAppliedState,
        is_applied: resolvedAppliedState,
        matched: resolvedMatchState,
        is_matched: resolvedMatchState,
        cancelled: appData.cancelled || false,  // app 기준
        is_cancelled: appData.cancelled || false
      };
    }
    
    res.json({ status: finalStatus });
  } catch (error) {
    console.error('매칭 상태 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 매칭 신청 취소
router.post('/cancel', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: '사용자 ID가 필요합니다.' });
    }

    // 정지 상태 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_banned, banned_until, email')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('사용자 상태 조회 오류:', userError);
      return res.status(500).json({ message: '사용자 상태를 확인할 수 없습니다.' });
    }

    if (user.is_banned) {
      if (user.banned_until) {
        const bannedUntil = new Date(user.banned_until);
        const now = new Date();
        if (bannedUntil > now) {
          return res.status(403).json({ 
            message: `정지 상태입니다. ${bannedUntil.toLocaleDateString('ko-KR')}까지 매칭 신청이 불가능합니다.` 
          });
        }
      } else {
        return res.status(403).json({ message: '영구 정지 상태입니다. 매칭 신청이 불가능합니다.' });
      }
    }
    
    // 1. 최신 회차 id 조회
    const { data: periodData, error: periodError } = await supabase
      .from('matching_log')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (periodError) throw periodError;
    const periodId = periodData.id;
    
    // 2. 해당 회차의 신청 row(applied=true, cancelled=false) 찾기
    const { data: application, error: findError } = await supabase
      .from('matching_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .eq('applied', true)
      .eq('cancelled', false)
      .single();
    if (findError && findError.code !== 'PGRST116') throw findError;
    if (!application) {
      return res.status(404).json({ message: '현재 회차의 신청 내역이 없습니다.' });
    }
    
    // 3. 해당 row의 cancelled=true, cancelled_at=now로 update
    const { data: updated, error: updateError } = await supabase
      .from('matching_applications')
      .update({ cancelled: true, cancelled_at: new Date().toISOString() })
      .eq('id', application.id)
      .select()
      .single();
    if (updateError) throw updateError;

    // 4. users 테이블의 is_applied false로 업데이트
    await supabase
      .from('users')
      .update({ is_applied: false })
      .eq('id', application.user_id);

    // 5. 관리자 알림 메일 발송 (비동기)
    try {
      // 프로필 정보 조회 (닉네임, 성별)
      let nickname = '';
      let gender = '';
      try {
        const { data: profileRow, error: profileError } = await supabase
          .from('user_profiles')
          .select('nickname, gender')
          .eq('user_id', userId)
          .single();
        if (!profileError && profileRow) {
          nickname = profileRow.nickname || '';
          gender = profileRow.gender || '';
        }
      } catch (infoErr) {
        console.error('[매칭 신청 취소] 프로필 정보 조회 오류:', infoErr);
      }

      const adminSubject = '매칭 신청 취소';
      const adminBodyLines = [
        '매칭 신청이 취소되었습니다.',
        '',
        `사용자 ID: ${userId}`,
        `이메일: ${user?.email || '알 수 없음'}`,
        `닉네임: ${nickname || '알 수 없음'}`,
        `성별: ${gender || '알 수 없음'}`,
        `회차 ID: ${periodId}`,
        `신청 ID: ${application.id}`,
      ];
      sendAdminNotificationEmail(adminSubject, adminBodyLines.join('\n')).catch(err => {
        console.error('[매칭 신청 취소] 관리자 알림 메일 발송 실패:', err);
      });
    } catch (e) {
      console.error('[매칭 신청 취소] 관리자 알림 메일 처리 중 오류:', e);
    }

    res.json({ success: true, message: '매칭 신청이 취소되었습니다.', application: updated });
  } catch (error) {
    console.error('매칭 신청 취소 오류:', error);
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