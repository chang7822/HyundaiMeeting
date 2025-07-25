const express = require('express');
const router = express.Router();
const { supabase } = require('../database');

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
      .single();
    if (error || !data) {
      return res.status(404).json({ message: '매칭 회차 정보가 없습니다.' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 매칭 요청
router.post('/request', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: '사용자 ID가 필요합니다.' });
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

let debugCallCount = 0;
// 매칭 신청 상태 조회
router.get('/status', async (req, res) => {
  try {
    debugCallCount++;
    const { userId } = req.query;
    const now = new Date();
    console.log(`[DEBUG][matching/status] 호출 #${debugCallCount} at ${now.toISOString()} userId:`, userId);
    console.log('[DEBUG][matching/status] 호출 스택:', new Error().stack.split('\n').slice(1,4).join(' | '));
    if (!userId) {
      console.log('[DEBUG][matching/status] userId 없음');
      return res.status(400).json({ message: '사용자 ID가 필요합니다.' });
    }
    // 1. 최신 matching_log(=period) id 조회
    const { data: periodData, error: periodError } = await supabase
      .from('matching_log')
      .select('id, matching_run, matching_announce, executed, email_sent, finish, application_start')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (periodError) {
      console.log('[DEBUG][matching/status] periodError:', periodError);
      throw periodError;
    }
    if (!periodData || !periodData.id) {
      console.log('[DEBUG][matching/status] periodData 없음:', periodData);
      return res.json({ status: null });
    }
    const periodId = periodData.id;
    console.log(`[DEBUG][matching/status] 조회 periodId: ${periodId}, now: ${now.toISOString()}, periodData:`, periodData);
    // 2. 해당 회차 + user_id로 matching_applications에서 가장 최근 row 1개만 조회 (신청/취소 포함)
    const { data, error } = await supabase
      .from('matching_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    console.log('[DEBUG][matching/status] 쿼리 조건:', { userId, periodId });
    if (error && error.code !== 'PGRST116') {
      console.log('[DEBUG][matching/status] 쿼리 error:', error);
      throw error;
    }
    if (!data) {
      console.log('[DEBUG][matching/status] 쿼리 결과 없음(data=null)');
      return res.json({ status: null });
    }
    console.log('[DEBUG][matching/status] 쿼리 결과 data:', data);
    res.json({ status: data });
  } catch (error) {
    console.error('[DEBUG][matching/status] 매칭 상태 조회 오류:', error);
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