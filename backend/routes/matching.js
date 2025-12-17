const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { sendAdminNotificationEmail } = require('../utils/emailService');

// 임시 매칭 데이터
const matches = [];

const cancelTime = 1;

// status 기반으로 현재 회차/다음 회차를 계산하는 내부 헬퍼
function computeCurrentAndNextFromLogs(logs) {
  if (!logs || logs.length === 0) {
    return { current: null, next: null };
  }

  let current = null;
  let next = null;

  // logs는 id 내림차순(가장 큰 id가 0번 인덱스)으로 정렬되어 있음
  const readyLogs = logs.filter(log => log.status === '준비중');
  const activeLogs = logs.filter(log => log.status === '진행중' || log.status === '발표완료');
  const finishedLogs = logs.filter(log => log.status === '종료');

  if (activeLogs.length > 0) {
    // 진행중/발표완료 회차가 하나 이상 있으면, 가장 최신 회차를 현재 회차로 사용
    current = activeLogs[0];
  } else if (finishedLogs.length > 0 && readyLogs.length > 0) {
    // 종료된 회차가 있고, 그 이후에 준비중인 회차들이 있다면,
    // "마지막으로 종료된 회차" 이후의 준비중 회차들 중 가장 가까운(가장 오래된) 회차를 현재 회차로 선택
    const latestFinished = finishedLogs[0]; // logs가 id DESC이므로 0번째가 가장 최근 종료
    let candidate = null;
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      if (log.status === '준비중' && log.id > latestFinished.id) {
        candidate = log; // 뒤에서 앞으로 오므로 마지막으로 대입되는 것이 id가 가장 작은 준비중 회차
      }
    }
    current = candidate || latestFinished;
  } else if (readyLogs.length > 0) {
    // 전부 준비중인 경우: 가장 오래된 준비중 회차를 현재 회차로 간주
    current = readyLogs[readyLogs.length - 1];
  } else {
    // 모든 회차가 종료되었거나, 정의되지 않은 status만 있는 경우: 가장 최신 회차를 현재 회차로 사용
    current = logs[0];
  }

  // 현재 회차가 발표완료 상태인 경우에만 NEXT(다음 회차) 후보 탐색
  if (current && current.status === '발표완료') {
    let candidate = null;
    for (const log of logs) {
      if (log.status === '준비중' && log.id > current.id) {
        // current.id보다 큰(미래) 준비중 회차 중에서 가장 id가 작은 회차를 NEXT로 선택
        if (!candidate || log.id < candidate.id) {
          candidate = log;
        }
      }
    }
    next = candidate;
  }

  return { current, next };
}

// 현재 회차만 반환하는 헬퍼
async function getCurrentPeriod() {
  const { data: logs, error } = await supabase
    .from('matching_log')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  const { current } = computeCurrentAndNextFromLogs(logs);
  return current;
}

// 현재 회차와 NEXT 회차를 함께 반환하는 헬퍼
async function getCurrentAndNextPeriod() {
  const { data: logs, error } = await supabase
    .from('matching_log')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return computeCurrentAndNextFromLogs(logs);
}

// 매칭 기간(신청/마감/알고리즘/발표) 정보 조회
router.get('/period', async (req, res) => {
  try {
    const { current, next } = await getCurrentAndNextPeriod();

    // 매칭 로그가 하나도 없을 때도 에러 대신 "빈 상태"를 200으로 반환
    if (!current && !next) {
      return res.json({
        success: true,
        current: null,
        next: null,
        message: '아직 생성된 매칭 회차가 없습니다.',
      });
    }

    // app_settings에 현재 회차/다음 회차 캐시 저장 (선택적, 실패해도 무시)
    try {
      const cacheValue = {
        currentId: current ? current.id : null,
        nextId: next ? next.id : null,
      };
      await supabase
        .from('app_settings')
        .upsert(
          {
            key: 'current_period_cache',
            value: cacheValue,
            current_period_id: current ? current.id : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
    } catch (cacheErr) {
      console.error('[matching][period] current_period_cache 업데이트 오류:', cacheErr);
    }

    res.json({ current, next });
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

    // status 기반 현재 회차 조회
    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod) {
      return res.status(400).json({ message: '현재 진행 중인 매칭 회차가 없습니다.' });
    }
    const periodId = currentPeriod.id;

    // 신청 가능 시간 체크: application_start ~ application_end 사이에서만 허용
    const nowTime = Date.now();
    const start = currentPeriod.application_start ? new Date(currentPeriod.application_start).getTime() : null;
    const end = currentPeriod.application_end ? new Date(currentPeriod.application_end).getTime() : null;
    if (!start || !end || nowTime < start || nowTime > end) {
      return res.status(400).json({ message: '현재는 매칭 신청 기간이 아닙니다.' });
    }

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

    // [로그] 매칭 신청 완료: "닉네임(이메일) N회차 매칭 신청완료"
    try {
      // 전체 매칭 로그에서 현재 periodId의 회차 번호 계산 (application_start 기준 정렬)
      const { data: allLogs } = await supabase
        .from('matching_log')
        .select('id')
        .order('application_start', { ascending: true });

      let roundNumber = null;
      if (allLogs && Array.isArray(allLogs)) {
        const idx = allLogs.findIndex((log) => log.id === periodId);
        if (idx !== -1) {
          roundNumber = idx + 1;
        }
      }

      const nickname = profile.nickname || '알 수 없음';
      const email = user?.email || '알 수 없음';
      const roundLabel = roundNumber ? `${roundNumber}회차` : `period_id=${periodId}`;

      console.log(`[MATCHING] 매칭 신청 완료: ${nickname}(${email}) ${roundLabel} 매칭 신청완료`);
    } catch (e) {
      console.error('[MATCHING] 매칭 신청 로그 처리 중 오류:', e);
    }

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
    
    // 1. users 테이블에서 실시간 상태 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_applied, is_matched')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('users 테이블 조회 실패:', userError);
      return res.status(500).json({ message: '사용자 상태 조회 오류' });
    }
    
    // 2. status 기반 현재 회차 조회
    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod) {
      return res.json({ status: null, message: '아직 생성된 회차가 없습니다.' });
    }
    
    // 3. matching_applications 조회
    const { data: appData, error: appError } = await supabase
      .from('matching_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('period_id', currentPeriod.id)
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
        period_id: currentPeriod.id,
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
    
    // 1. status 기반 현재 회차 조회
    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod) {
      return res.status(400).json({ message: '현재 진행 중인 매칭 회차가 없습니다.' });
    }
    const periodId = currentPeriod.id;
    
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

    // 5. 서버 로그 및 관리자 알림 메일 발송 (비동기)
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

      // [로그] 매칭 신청 취소: "닉네임(이메일) N회차 매칭 신청 취소"
      try {
        const { data: allLogs } = await supabase
          .from('matching_log')
          .select('id, application_start')
          .order('application_start', { ascending: true });

        let roundNumber = null;
        if (allLogs && Array.isArray(allLogs)) {
          const idx = allLogs.findIndex((log) => log.id === periodId);
          if (idx !== -1) {
            roundNumber = idx + 1;
          }
        }

        const nicknameForLog = nickname || '알 수 없음';
        const emailForLog = user?.email || '알 수 없음';
        const roundLabel = roundNumber ? `${roundNumber}회차` : `period_id=${periodId}`;

        console.log(
          `[MATCHING] 매칭 신청 취소: ${nicknameForLog}(${emailForLog}) ${roundLabel} 매칭 신청 취소 (application_id=${application.id})`
        );
      } catch (e) {
        console.error('[MATCHING] 매칭 신청 취소 로그 처리 중 오류:', e);
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