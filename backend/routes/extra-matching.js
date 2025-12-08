const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

// 모든 /api/extra-matching/* 요청은 인증 필요
router.use(authenticate);

// ---- 공통 유틸 함수들 ----

// matching_log에서 현재 회차(및 필요 시 다음 회차)를 계산하는 헬퍼
function computeCurrentAndNextFromLogs(logs) {
  if (!logs || logs.length === 0) {
    return { current: null, next: null };
  }

  let current = null;
  let next = null;

  const readyLogs = logs.filter((log) => log.status === '준비중');
  const activeLogs = logs.filter((log) => log.status === '진행중' || log.status === '발표완료');
  const finishedLogs = logs.filter((log) => log.status === '종료');

  if (activeLogs.length > 0) {
    current = activeLogs[0];
  } else if (finishedLogs.length > 0 && readyLogs.length > 0) {
    const latestFinished = finishedLogs[0];
    let candidate = null;
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      if (log.status === '준비중' && log.id > latestFinished.id) {
        candidate = log;
      }
    }
    current = candidate || latestFinished;
  } else if (readyLogs.length > 0) {
    current = readyLogs[readyLogs.length - 1];
  } else {
    current = logs[0];
  }

  if (current && current.status === '발표완료') {
    let candidate = null;
    for (const log of logs) {
      if (log.status === '준비중' && log.id > current.id) {
        if (!candidate || log.id < candidate.id) {
          candidate = log;
        }
      }
    }
    next = candidate;
  }

  return { current, next };
}

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

// 현재 시각과 회차의 공지/종료 시간으로 "추가 매칭 도전 가능 기간"인지 판단
function isInExtraMatchingWindow(period) {
  if (!period || !period.matching_announce || !period.finish) return false;
  const now = Date.now();
  const announce = new Date(period.matching_announce).getTime();
  const finish = new Date(period.finish).getTime();
  if (Number.isNaN(announce) || Number.isNaN(finish)) return false;
  return now >= announce && now <= finish;
}

// 사용자의 현재 회차 매칭 상태 조회 (기존 /matching/status 와 동일한 로직을 간략화)
async function getUserMatchingState(userId, periodId) {
  // 1. users 테이블에서 is_applied, is_matched 조회
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('is_applied, is_matched')
    .eq('id', userId)
    .single();

  if (userError) {
    throw userError;
  }

  // 2. matching_applications 에서 해당 회차 row 조회
  const { data: appData, error: appError } = await supabase
    .from('matching_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (appError && appError.code !== 'PGRST116') {
    throw appError;
  }

  const resolvedMatchState =
    typeof userData.is_matched === 'boolean'
      ? userData.is_matched
      : typeof appData?.matched === 'boolean'
      ? appData.matched
      : null;

  const resolvedAppliedState =
    typeof userData.is_applied === 'boolean'
      ? userData.is_applied
      : typeof appData?.applied === 'boolean'
      ? appData.applied
      : false;

  return {
    applied: resolvedAppliedState,
    matched: resolvedMatchState,
    applicationRow: appData || null,
  };
}

// 별 차감 공통 함수
async function spendStars(userId, amount, reason, meta) {
  if (!userId || typeof amount !== 'number' || amount <= 0) {
    throw new Error('spendStars: 잘못된 인자');
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('star_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw userError || new Error('사용자를 찾을 수 없습니다.');
  }

  const currentBalance = typeof user.star_balance === 'number' ? user.star_balance : 0;

  if (currentBalance < amount) {
    return {
      ok: false,
      code: 'INSUFFICIENT_STARS',
      balance: currentBalance,
    };
  }

  const newBalance = currentBalance - amount;

  const { error: updateError } = await supabase
    .from('users')
    .update({ star_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  const { error: txError } = await supabase
    .from('star_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      reason,
      meta: meta || null,
    });

  if (txError) {
    throw txError;
  }

  return {
    ok: true,
    balance: newBalance,
  };
}

// 별 지급 공통 함수 (환불 등)
async function awardStars(userId, amount, reason, meta) {
  if (!userId || typeof amount !== 'number' || amount <= 0) {
    throw new Error('awardStars: 잘못된 인자');
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('star_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw userError || new Error('사용자를 찾을 수 없습니다.');
  }

  const currentBalance = typeof user.star_balance === 'number' ? user.star_balance : 0;
  const newBalance = currentBalance + amount;

  const { error: updateError } = await supabase
    .from('users')
    .update({ star_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  const { error: txError } = await supabase
    .from('star_transactions')
    .insert({
      user_id: userId,
      amount,
      reason,
      meta: meta || null,
    });

  if (txError) {
    throw txError;
  }

  return newBalance;
}

// ---- 라우트 구현 ----

// 상태 조회: 현재 회차, 참가 가능 여부, 내 엔트리, 받은 어필 개수, 별 잔액
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.userId;

    const currentPeriod = await getCurrentPeriod();

    if (!currentPeriod) {
      return res.json({
        currentPeriod: null,
        canParticipate: false,
        myExtraEntry: null,
        myReceivedApplyCount: 0,
        starBalance: 0,
      });
    }

    const inWindow = isInExtraMatchingWindow(currentPeriod);

    const { applied, matched } = await getUserMatchingState(userId, currentPeriod.id);

    const canParticipate = inWindow && applied && matched === false;

    // 내 별 잔액
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('star_balance')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[extra-matching] /status users 조회 오류:', userError);
    }

    const starBalance = user && typeof user.star_balance === 'number' ? user.star_balance : 0;

    // 내 엔트리
    const { data: myEntries, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('id, status')
      .eq('period_id', currentPeriod.id)
      .eq('user_id', userId)
      .limit(1);

    if (entryError) {
      console.error('[extra-matching] /status entries 조회 오류:', entryError);
    }

    const myExtraEntry = myEntries && myEntries.length > 0 ? myEntries[0] : null;

    // 내가 받은 어필 개수 (pending + 처리된 것 모두 count)
    let myReceivedApplyCount = 0;
    if (myExtraEntry) {
      const { data: applies, error: appliesError } = await supabase
        .from('extra_matching_applies')
        .select('id')
        .eq('entry_id', myExtraEntry.id);

      if (appliesError) {
        console.error('[extra-matching] /status applies 조회 오류:', appliesError);
      } else {
        myReceivedApplyCount = applies ? applies.length : 0;
      }
    }

    return res.json({
      currentPeriod: {
        id: currentPeriod.id,
        application_start: currentPeriod.application_start,
        application_end: currentPeriod.application_end,
        matching_announce: currentPeriod.matching_announce,
        finish: currentPeriod.finish,
      },
      canParticipate,
      myExtraEntry,
      myReceivedApplyCount,
      starBalance,
    });
  } catch (error) {
    console.error('[extra-matching] /status 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// "추가 매칭 도전" 등록 (저를 추천합니다) - 별 10개 사용
router.post('/entries', async (req, res) => {
  try {
    const userId = req.user.userId;

    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod) {
      return res.status(400).json({ message: '현재 진행 중인 매칭 회차가 없습니다.' });
    }

    const inWindow = isInExtraMatchingWindow(currentPeriod);
    if (!inWindow) {
      return res.status(400).json({ message: '지금은 추가 매칭 도전을 신청할 수 있는 기간이 아닙니다.' });
    }

    const { applied, matched } = await getUserMatchingState(userId, currentPeriod.id);

    if (!applied || matched !== false) {
      return res
        .status(400)
        .json({ message: '이번 회차에서 매칭에 실패한 사용자만 추가 매칭 도전에 참여할 수 있습니다.' });
    }

    // 이미 이 회차에 엔트리가 있는지 확인
    const { data: existingEntries, error: existingError } = await supabase
      .from('extra_matching_entries')
      .select('id, status')
      .eq('period_id', currentPeriod.id)
      .eq('user_id', userId)
      .limit(1);

    if (existingError) {
      console.error('[extra-matching] /entries 기존 엔트리 조회 오류:', existingError);
      return res.status(500).json({ message: '추가 매칭 도전 상태를 확인하는 중 오류가 발생했습니다.' });
    }

    if (existingEntries && existingEntries.length > 0) {
      return res.status(400).json({ message: '이미 이번 회차에 추가 매칭 도전 엔트리가 등록되어 있습니다.' });
    }

    // 프로필 스냅샷
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[extra-matching] /entries 프로필 조회 오류:', profileError);
      return res.status(400).json({ message: '프로필 정보를 찾을 수 없습니다.' });
    }

    // 별 10개 차감
    const spendResult = await spendStars(userId, 10, 'extra_match_entry', {
      period_id: currentPeriod.id,
    });

    if (!spendResult.ok && spendResult.code === 'INSUFFICIENT_STARS') {
      return res.status(400).json({ message: '별이 부족합니다. 출석체크나 광고 보상을 통해 별을 모아주세요.' });
    }

    if (!spendResult.ok) {
      return res.status(500).json({ message: '별을 차감하는 중 오류가 발생했습니다.' });
    }

    // 엔트리 생성
    const { data: inserted, error: insertError } = await supabase
      .from('extra_matching_entries')
      .insert({
        period_id: currentPeriod.id,
        user_id: userId,
        profile_snapshot: profile,
        gender: profile.gender || null,
        status: 'open',
      })
      .select('id, status')
      .single();

    if (insertError) {
      console.error('[extra-matching] /entries 엔트리 생성 오류:', insertError);
      // 가능하면 별 환불 처리
      try {
        await awardStars(userId, 10, 'extra_match_entry_rollback', {
          period_id: currentPeriod.id,
        });
      } catch (e) {
        console.error('[extra-matching] /entries 롤백 별 지급 오류:', e);
      }
      return res.status(500).json({ message: '추가 매칭 도전 엔트리를 생성하는 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      entry: inserted,
      newBalance: spendResult.balance,
    });
  } catch (error) {
    console.error('[extra-matching] /entries 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 엔트리 추가 어필 텍스트 저장
router.post('/entries/:entryId/extra-appeal', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { entryId } = req.params;
    const { text } = req.body || {};

    const { data: entry, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('id, user_id, profile_snapshot')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      console.error('[extra-matching] /entries/:entryId/extra-appeal 엔트리 조회 오류:', entryError);
      return res.status(404).json({ message: '엔트리를 찾을 수 없습니다.' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ message: '본인 엔트리에만 어필 문구를 등록할 수 있습니다.' });
    }

    const snapshot = entry.profile_snapshot || {};
    const updatedSnapshot = {
      ...snapshot,
      extra_appeal_text: typeof text === 'string' ? text : null,
    };

    const { error: updateError } = await supabase
      .from('extra_matching_entries')
      .update({ profile_snapshot: updatedSnapshot })
      .eq('id', entry.id);

    if (updateError) {
      console.error('[extra-matching] /entries/:entryId/extra-appeal 업데이트 오류:', updateError);
      return res.status(500).json({ message: '어필 문구를 저장하는 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: '어필 문구가 저장되었습니다.',
      extraAppealText: updatedSnapshot.extra_appeal_text || null,
    });
  } catch (error) {
    console.error('[extra-matching] POST /entries/:entryId/extra-appeal 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 이성의 추가 매칭 도전 엔트리 리스트 조회
router.get('/entries', async (req, res) => {
  try {
    const userId = req.user.userId;

    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod || !isInExtraMatchingWindow(currentPeriod)) {
      return res.json({ entries: [] });
    }

    // 내 성별 조회
    const { data: myProfile, error: myProfileError } = await supabase
      .from('user_profiles')
      .select('gender')
      .eq('user_id', userId)
      .single();

    if (myProfileError) {
      console.error('[extra-matching] /entries 내 프로필 조회 오류:', myProfileError);
    }

    const myGender = myProfile ? myProfile.gender : null;
    let oppositeGender = null;
    if (myGender === 'male') oppositeGender = 'female';
    else if (myGender === 'female') oppositeGender = 'male';

    let query = supabase
      .from('extra_matching_entries')
      .select('id, period_id, profile_snapshot, gender, status')
      .eq('period_id', currentPeriod.id)
      .in('status', ['open', 'sold_out'])
      .neq('user_id', userId);

    if (oppositeGender) {
      query = query.eq('gender', oppositeGender);
    }

    const { data: entries, error: entriesError } = await query;

    if (entriesError) {
      console.error('[extra-matching] /entries 엔트리 조회 오류:', entriesError);
      return res.status(500).json({ message: '추가 매칭 도전 엔트리를 불러오는 중 오류가 발생했습니다.' });
    }

    // 클라이언트에 필요한 정보만 가공
    const mapped = (entries || []).map((entry) => {
      const p = entry.profile_snapshot || {};
      return {
        id: entry.id,
        period_id: entry.period_id,
        gender: entry.gender,
        status: entry.status,
        age: p.birth_year || null,
        job_type: p.job_type || null,
        company: p.company || null,
        height: p.height || null,
        residence: p.residence || null,
        mbti: p.mbti || null,
        interests: p.interests || null,
        appearance: p.appearance || null,
        personality: p.personality || null,
        profile: {
          nickname: p.nickname || null,
          birth_year: p.birth_year || null,
          gender: p.gender || null,
          job_type: p.job_type || null,
          company: p.company || null,
          height: p.height || null,
          residence: p.residence || null,
          mbti: p.mbti || null,
          marital_status: p.marital_status || null,
          appeal: p.appeal || null,
          interests: p.interests || null,
          appearance: p.appearance || null,
          personality: p.personality || null,
          body_type: p.body_type || null,
          drinking: p.drinking || null,
          smoking: p.smoking || null,
          religion: p.religion || null,
          extra_appeal_text: p.extra_appeal_text || null,
        },
      };
    });

    return res.json({ entries: mapped });
  } catch (error) {
    console.error('[extra-matching] GET /entries 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// "저는 어때요" 신청 (별 10개)
router.post('/entries/:entryId/apply', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { entryId } = req.params;

    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod || !isInExtraMatchingWindow(currentPeriod)) {
      return res.status(400).json({ message: '지금은 추가 매칭 도전을 신청할 수 있는 기간이 아닙니다.' });
    }

    // 대상 엔트리 조회
    const { data: entry, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      console.error('[extra-matching] /entries/:entryId/apply 엔트리 조회 오류:', entryError);
      return res.status(404).json({ message: '대상 추가 매칭 도전 엔트리를 찾을 수 없습니다.' });
    }

    if (entry.period_id !== currentPeriod.id) {
      return res.status(400).json({ message: '현재 회차의 엔트리에만 신청할 수 있습니다.' });
    }

    if (entry.status !== 'open') {
      return res.status(400).json({ message: '이미 마감된 추가 매칭 도전입니다.' });
    }

    if (entry.user_id === userId) {
      return res.status(400).json({ message: '본인 추가 매칭 도전에 신청할 수 없습니다.' });
    }

    // 신청자도 이번 회차 실패자여야 함
    const { applied, matched } = await getUserMatchingState(userId, currentPeriod.id);
    if (!applied || matched !== false) {
      return res
        .status(400)
        .json({ message: '이번 회차에서 매칭에 실패한 사용자만 추가 매칭 도전에 참여할 수 있습니다.' });
    }

    // 기존에 같은 엔트리에 신청한 적이 있는지 확인
    const { data: existingApply, error: existingError } = await supabase
      .from('extra_matching_applies')
      .select('id')
      .eq('entry_id', entry.id)
      .eq('sender_user_id', userId)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[extra-matching] /entries/:entryId/apply 기존 신청 조회 오류:', existingError);
      return res.status(500).json({ message: '신청 이력을 확인하는 중 오류가 발생했습니다.' });
    }

    if (existingApply) {
      return res.status(400).json({ message: '이미 이 추가 매칭 도전에 신청하셨습니다.' });
    }

    // 별 10개 차감
    const spendResult = await spendStars(userId, 10, 'extra_match_apply', {
      period_id: currentPeriod.id,
      entry_id: entry.id,
    });

    if (!spendResult.ok && spendResult.code === 'INSUFFICIENT_STARS') {
      return res.status(400).json({ message: '별이 부족합니다. 출석체크나 광고 보상을 통해 별을 모아주세요.' });
    }
    if (!spendResult.ok) {
      return res.status(500).json({ message: '별을 차감하는 중 오류가 발생했습니다.' });
    }

    // apply row 생성
    const { data: apply, error: applyError } = await supabase
      .from('extra_matching_applies')
      .insert({
        entry_id: entry.id,
        sender_user_id: userId,
        status: 'pending',
        used_star_amount: 10,
        refunded_star_amount: 0,
      })
      .select('id, status')
      .single();

    if (applyError) {
      console.error('[extra-matching] /entries/:entryId/apply 생성 오류:', applyError);
      // 가능하면 환불 처리
      try {
        await awardStars(userId, 10, 'extra_match_apply_rollback', {
          period_id: currentPeriod.id,
          entry_id: entry.id,
        });
      } catch (e) {
        console.error('[extra-matching] /entries/:entryId/apply 롤백 별 지급 오류:', e);
      }
      return res.status(500).json({ message: '신청을 생성하는 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      apply,
      newBalance: spendResult.balance,
    });
  } catch (error) {
    console.error('[extra-matching] POST /entries/:entryId/apply 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내가 받은 "저는 어때요" 목록
router.get('/my-received-applies', async (req, res) => {
  try {
    const userId = req.user.userId;

    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod) {
      return res.json({
        entry: null,
        applies: [],
      });
    }

    // 내 엔트리 찾기
    const { data: myEntries, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('id, period_id, status')
      .eq('period_id', currentPeriod.id)
      .eq('user_id', userId)
      .limit(1);

    if (entryError) {
      console.error('[extra-matching] /my-received-applies 엔트리 조회 오류:', entryError);
      return res.status(500).json({ message: '추가 매칭 도전 상태를 불러오는 중 오류가 발생했습니다.' });
    }

    const entry = myEntries && myEntries.length > 0 ? myEntries[0] : null;

    if (!entry) {
      return res.json({
        entry: null,
        applies: [],
      });
    }

    // 이 엔트리에 들어온 모든 apply 조회
    const { data: applies, error: appliesError } = await supabase
      .from('extra_matching_applies')
      .select('id, sender_user_id, status, created_at')
      .eq('entry_id', entry.id)
      .order('created_at', { ascending: false });

    if (appliesError) {
      console.error('[extra-matching] /my-received-applies apply 조회 오류:', appliesError);
      return res.status(500).json({ message: '신청 내역을 불러오는 중 오류가 발생했습니다.' });
    }

    const senderIds = Array.from(new Set((applies || []).map((a) => a.sender_user_id)));

    let profilesByUserId = {};
    if (senderIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', senderIds);

      if (profileError) {
        console.error('[extra-matching] /my-received-applies 프로필 조회 오류:', profileError);
      } else {
        profilesByUserId = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }
    }

    const mappedApplies = (applies || []).map((a) => {
      const p = profilesByUserId[a.sender_user_id] || {};
      return {
        id: a.id,
        sender_user_id: a.sender_user_id,
        status: a.status,
        created_at: a.created_at,
        profile: {
          nickname: p.nickname || null,
          birth_year: p.birth_year || null,
          gender: p.gender || null,
          job_type: p.job_type || null,
          company: p.company || null,
          height: p.height || null,
          residence: p.residence || null,
          mbti: p.mbti || null,
          marital_status: p.marital_status || null,
          appeal: p.appeal || null,
          interests: p.interests || null,
          appearance: p.appearance || null,
          personality: p.personality || null,
          body_type: p.body_type || null,
          drinking: p.drinking || null,
          smoking: p.smoking || null,
          religion: p.religion || null,
        },
      };
    });

    return res.json({
      entry,
      applies: mappedApplies,
    });
  } catch (error) {
    console.error('[extra-matching] GET /my-received-applies 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// "저는 어때요" 수락
router.post('/applies/:applyId/accept', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { applyId } = req.params;

    // apply + entry 함께 조회
    const { data: apply, error: applyError } = await supabase
      .from('extra_matching_applies')
      .select('id, entry_id, sender_user_id, status, used_star_amount, refunded_star_amount')
      .eq('id', applyId)
      .single();

    if (applyError || !apply) {
      console.error('[extra-matching] /applies/:applyId/accept apply 조회 오류:', applyError);
      return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다.' });
    }

    if (apply.status !== 'pending') {
      return res.status(400).json({ message: '이미 처리된 신청입니다.' });
    }

    const { data: entry, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('*')
      .eq('id', apply.entry_id)
      .single();

    if (entryError || !entry) {
      console.error('[extra-matching] /applies/:applyId/accept 엔트리 조회 오류:', entryError);
      return res.status(404).json({ message: '엔트리를 찾을 수 없습니다.' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ message: '본인 엔트리에 대한 신청만 처리할 수 있습니다.' });
    }

    if (entry.status !== 'open') {
      return res.status(400).json({ message: '이미 마감된 추가 매칭 도전입니다.' });
    }

    // apply 수락 처리
    const nowIso = new Date().toISOString();

    const { error: updateApplyError } = await supabase
      .from('extra_matching_applies')
      .update({
        status: 'accepted',
        decided_at: nowIso,
      })
      .eq('id', apply.id);

    if (updateApplyError) {
      console.error('[extra-matching] /applies/:applyId/accept apply 업데이트 오류:', updateApplyError);
      return res.status(500).json({ message: '신청을 처리하는 중 오류가 발생했습니다.' });
    }

    const { error: updateEntryError } = await supabase
      .from('extra_matching_entries')
      .update({
        status: 'sold_out',
        closed_at: nowIso,
      })
      .eq('id', entry.id);

    if (updateEntryError) {
      console.error('[extra-matching] /applies/:applyId/accept entry 업데이트 오류:', updateEntryError);
      return res.status(500).json({ message: '엔트리 상태를 갱신하는 중 오류가 발생했습니다.' });
    }

    // 채팅방 생성은 기존 채팅 시스템이 period_id + 두 user_id 로 방을 구분하므로
    // 별도 room 테이블 필요 없음. 클라이언트에서 period_id=entry.period_id, 상대 userId=apply.sender_user_id 로 접속하면 됨.

    return res.json({
      success: true,
      message: '신청을 수락했습니다. 상대방과의 채팅을 시작해보세요.',
      partnerUserId: apply.sender_user_id,
      periodId: entry.period_id,
    });
  } catch (error) {
    console.error('[extra-matching] POST /applies/:applyId/accept 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// "저는 어때요" 거절 (별 5개 환불)
router.post('/applies/:applyId/reject', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { applyId } = req.params;

    const { data: apply, error: applyError } = await supabase
      .from('extra_matching_applies')
      .select('*')
      .eq('id', applyId)
      .single();

    if (applyError || !apply) {
      console.error('[extra-matching] /applies/:applyId/reject apply 조회 오류:', applyError);
      return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다.' });
    }

    if (apply.status !== 'pending') {
      return res.status(400).json({ message: '이미 처리된 신청입니다.' });
    }

    const { data: entry, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('*')
      .eq('id', apply.entry_id)
      .single();

    if (entryError || !entry) {
      console.error('[extra-matching] /applies/:applyId/reject 엔트리 조회 오류:', entryError);
      return res.status(404).json({ message: '엔트리를 찾을 수 없습니다.' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ message: '본인 엔트리에 대한 신청만 처리할 수 있습니다.' });
    }

    // 거절 처리 + 환불
    const nowIso = new Date().toISOString();

    const { error: updateApplyError } = await supabase
      .from('extra_matching_applies')
      .update({
        status: 'rejected',
        decided_at: nowIso,
        refunded_star_amount: 5,
      })
      .eq('id', apply.id);

    if (updateApplyError) {
      console.error('[extra-matching] /applies/:applyId/reject apply 업데이트 오류:', updateApplyError);
      return res.status(500).json({ message: '신청을 처리하는 중 오류가 발생했습니다.' });
    }

    let newBalance;
    try {
      newBalance = await awardStars(apply.sender_user_id, 5, 'extra_match_refund_reject', {
        entry_id: entry.id,
        apply_id: apply.id,
      });
    } catch (e) {
      console.error('[extra-matching] /applies/:applyId/reject 별 환불 오류:', e);
      return res.status(500).json({ message: '별 환불 처리 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: '신청을 거절하고 상대방에게 일부 별을 환불했습니다.',
      refundedToUserId: apply.sender_user_id,
      newPartnerBalance: newBalance,
    });
  } catch (error) {
    console.error('[extra-matching] POST /applies/:applyId/reject 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;


