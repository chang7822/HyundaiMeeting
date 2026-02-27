const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');
const notificationRoutes = require('./notifications');
const { sendPushToUsers } = require('../pushService');

// 모든 /api/extra-matching/* 요청은 인증 필요
router.use(authenticate);

// ---- 공통 유틸 함수들 ----

// 추가 매칭 도전 기능 활성화 여부 확인
async function isExtraMatchingFeatureEnabled() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'extra_matching_enabled')
      .maybeSingle();

    if (error) {
      console.error('[extra-matching] extra_matching_enabled 조회 오류:', error);
      return true; // 에러 시 기본값 true (활성화)
    }

    // 데이터가 없으면 기본값 true, 있으면 value.enabled 값 사용
    if (!data || !data.value) {
      return true;
    }

    return data.value.enabled !== false;
  } catch (e) {
    console.error('[extra-matching] extra_matching_enabled 조회 예외:', e);
    return true; // 예외 시 기본값 true
  }
}

// 호감 응답 만료 시간(시간 단위). app_settings.extra_matching_apply_expire_hours 사용, 기본 24
async function getApplyExpireHours() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'extra_matching_apply_expire_hours')
      .maybeSingle();

    if (error || !data || !data.value) return 24;
    const h = data.value.hours;
    if (typeof h !== 'number' || h < 1 || h > 168) return 24; // 1~168시간(1주) 범위
    return Math.floor(h);
  } catch (e) {
    console.error('[extra-matching] apply_expire_hours 조회 예외:', e);
    return 24;
  }
}

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

// 현재 회차의 status/시간으로 "추가 매칭 도전 가능 기간"인지 판단
function isInExtraMatchingWindow(period) {
  if (!period) return false;

  // 1순위: scheduler.js 가 관리하는 status 사용
  // - "발표완료" 상태인 동안에만 추가 매칭 도전 가능
  if (period.status === '발표완료') {
    return true;
  }
  if (period.status === '종료') {
    return false;
  }

  // 2순위: status 정보가 신뢰할 수 없는 경우를 대비한 시간 기반 fallback
  if (!period.matching_announce || !period.finish) return false;
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

  // 2. matching_applications 에서 해당 회차 "정규 매칭" row 조회
  const { data: appData, error: appError } = await supabase
    .from('matching_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .eq('type', 'main')
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

// 추가 매칭 참여 시 matching_applications 에 type='extra' 스냅샷을 upsert
async function upsertExtraApplicationSnapshot(userId, periodId, profileSnapshot) {
  try {
    // 선호 스냅샷은 정규 매칭과 동일하게 preferred_ prefix 기준으로 구성
    const preferenceSnapshot = {};
    if (profileSnapshot && typeof profileSnapshot === 'object') {
      Object.keys(profileSnapshot).forEach((key) => {
        if (key.startsWith('preferred_')) {
          preferenceSnapshot[key] = profileSnapshot[key];
        }
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from('matching_applications')
      .select('id, type')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .eq('type', 'extra')
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[extra-matching] upsertExtraApplicationSnapshot 조회 오류:', existingError);
      return;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('matching_applications')
        .update({
          profile_snapshot: profileSnapshot,
          preference_snapshot: preferenceSnapshot,
          applied: true,
          cancelled: false,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[extra-matching] upsertExtraApplicationSnapshot 업데이트 오류:', updateError);
      }
    } else {
      const { error: insertError } = await supabase
        .from('matching_applications')
        .insert({
          user_id: userId,
          period_id: periodId,
          type: 'extra',
          applied: true,
          cancelled: false,
          applied_at: new Date().toISOString(),
          matched: false,
          profile_snapshot: profileSnapshot,
          preference_snapshot: preferenceSnapshot,
        });

      if (insertError) {
        console.error('[extra-matching] upsertExtraApplicationSnapshot 신규 row 생성 오류:', insertError);
      }
    }
  } catch (e) {
    console.error('[extra-matching] upsertExtraApplicationSnapshot 처리 중 예외:', e);
  }
}

// 이번 회차에서 사용자의 추가 매칭/호감 보내기 사용 상태 조회
async function getUserExtraUsageState(userId, periodId) {
  // 1) 이번 회차에 내가 등록한 "활성" 추가 매칭 도전 엔트리 여부
  // - status가 open 또는 sold_out 인 경우만 유효한 엔트리로 본다.
  // - 사용자가 직접 취소한 엔트리(현재 closed + apply 0개)는 재등록 가능해야 하므로 포함하지 않음.
  const { data: entries, error: entryError } = await supabase
    .from('extra_matching_entries')
    .select('id, status')
    .eq('period_id', periodId)
    .eq('user_id', userId)
    .in('status', ['open', 'sold_out']);

  if (entryError) {
    throw entryError;
  }

  const hasEntryThisPeriod = !!(entries && entries.length > 0);

  // 2) 이번 회차에 내가 보낸 "호감 보내기" 중 아직 진행 중인 것(pending/accepted) 여부
  const { data: myApplies, error: appliesError } = await supabase
    .from('extra_matching_applies')
    .select('id, status, entry_id')
    .eq('sender_user_id', userId)
    .in('status', ['pending', 'accepted']);

  if (appliesError) {
    throw appliesError;
  }

  let hasActiveApplyThisPeriod = false;

  if (myApplies && myApplies.length > 0) {
    const entryIds = myApplies.map((a) => a.entry_id);

    const { data: applyEntries, error: applyEntriesError } = await supabase
      .from('extra_matching_entries')
      .select('id, period_id')
      .in('id', entryIds);

    if (applyEntriesError) {
      throw applyEntriesError;
    }

    const currentPeriodEntryIds = new Set(
      (applyEntries || [])
        .filter((e) => e.period_id === periodId)
        .map((e) => e.id)
    );

    hasActiveApplyThisPeriod = myApplies.some((a) =>
      currentPeriodEntryIds.has(a.entry_id),
    );
  }

  return {
    hasEntryThisPeriod,
    hasActiveApplyThisPeriod,
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

// 특정 회차의 추가 매칭 도전을 정산 (호감이 전혀 없었던 엔트리에 대해 별 5개 환불)
async function settleExtraMatchingForPeriod(periodId) {
  if (!periodId) throw new Error('periodId가 필요합니다.');

  const now = new Date();

  // 해당 회차 조회
  const { data: period, error: periodError } = await supabase
    .from('matching_periods')
    .select('*')
    .eq('id', periodId)
    .single();

  if (periodError || !period) {
    throw periodError || new Error('해당 회차를 찾을 수 없습니다.');
  }

  if (!period.finish || new Date(period.finish) > now) {
    throw new Error('아직 종료되지 않은 회차입니다.');
  }

  // 아직 정산되지 않은 open 상태 엔트리들만 대상
  const { data: openEntries, error: entriesError } = await supabase
    .from('extra_matching_entries')
    .select('*')
    .eq('period_id', periodId)
    .eq('status', 'open');

  if (entriesError) {
    throw entriesError;
  }

  if (!openEntries || openEntries.length === 0) {
    return { processed: 0, refundedCount: 0 };
  }

  let processed = 0;
  let refundedCount = 0;

  for (const entry of openEntries) {
    // 이 엔트리에 들어온 모든 apply 조회
    const { data: applies, error: appliesError } = await supabase
      .from('extra_matching_applies')
      .select('id')
      .eq('entry_id', entry.id);

    if (appliesError) {
      console.error('[extra-matching] settleExtraMatchingForPeriod apply 조회 오류:', appliesError);
      continue;
    }

    if (!applies || applies.length === 0) {
      // 한 번도 호감을 받지 못한 엔트리 → 별 5개 환불 + 상태 변경
      try {
        await awardStars(entry.user_id, 5, 'extra_match_no_likes_refund', {
          period_id: periodId,
          entry_id: entry.id,
        });
        refundedCount++;
      } catch (refundErr) {
        console.error('[extra-matching] settleExtraMatchingForPeriod 환불 오류:', refundErr);
        // 환불 실패 시에도 상태는 닫아두자
      }

      const { error: updateError } = await supabase
        .from('extra_matching_entries')
        .update({
          status: 'closed_no_likes',
          closed_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error('[extra-matching] settleExtraMatchingForPeriod 엔트리 상태 업데이트 오류:', updateError);
        continue;
      }
    } else {
      // 호감이 한 번이라도 온 엔트리 → 환불 없이 상태만 closed
      const { error: updateError } = await supabase
        .from('extra_matching_entries')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error('[extra-matching] settleExtraMatchingForPeriod 엔트리 상태 업데이트 오류:', updateError);
        continue;
      }
    }

    processed++;
  }

  return { processed, refundedCount };
}

// ---- 라우트 구현 ----

// 상태 조회: 현재 회차, 참가 가능 여부, 내 엔트리, 받은 어필 개수, 별 잔액
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.userId;

    // 추가 매칭 도전 기능 활성화 여부 확인
    const featureEnabled = await isExtraMatchingFeatureEnabled();

    const currentPeriod = await getCurrentPeriod();

    if (!currentPeriod) {
      return res.json({
        featureEnabled,
        currentPeriod: null,
        canParticipate: false,
        myExtraEntry: null,
        myReceivedApplyCount: 0,
        starBalance: 0,
      });
    }

    const inWindow = isInExtraMatchingWindow(currentPeriod);

    const { matched } = await getUserMatchingState(userId, currentPeriod.id);

    // 매칭에 "성공하지 않은" 모든 사용자(매칭 실패자 + 신청 안 한 사람)는 참여 가능
    // 단, 기능이 비활성화되어 있으면 참여 불가
    const canParticipate = featureEnabled && inWindow && matched !== true;

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
      .order('id', { ascending: false });

    if (entryError) {
      console.error('[extra-matching] /status entries 조회 오류:', entryError);
    }

    let myExtraEntry = null;
    if (myEntries && myEntries.length > 0) {
      // open / sold_out 상태의 가장 최근 엔트리를 우선으로 사용
      myExtraEntry =
        myEntries.find((e) => e.status === 'open' || e.status === 'sold_out') ||
        myEntries[0];
    }

    // 이번 회차에서 내 추가 매칭/호감보내기 사용 상태 (UI 안내용)
    let usageState = null;
    try {
      usageState = await getUserExtraUsageState(userId, currentPeriod.id);
    } catch (e) {
      console.error('[extra-matching] /status getUserExtraUsageState 오류:', e);
    }

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
      featureEnabled,
      currentPeriod: {
        id: currentPeriod.id,
        application_start: currentPeriod.application_start,
        application_end: currentPeriod.application_end,
        matching_announce: currentPeriod.matching_announce,
        finish: currentPeriod.finish,
      },
      canParticipate,
      isMatchedSuccess: matched === true,
      myExtraEntry,
      myReceivedApplyCount,
      starBalance,
      hasExtraEntryThisPeriod: !!(usageState && usageState.hasEntryThisPeriod),
      hasActiveExtraApply: !!(usageState && usageState.hasActiveApplyThisPeriod),
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
    const { extraAppealText } = req.body || {};

    // 추가 매칭 도전 기능 활성화 여부 확인
    const featureEnabled = await isExtraMatchingFeatureEnabled();
    if (!featureEnabled) {
      return res.status(403).json({ message: '추가 매칭 도전 기능이 현재 비활성화되어 있습니다.' });
    }

    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod) {
      return res.status(400).json({ message: '현재 진행 중인 매칭 회차가 없습니다.' });
    }

    const inWindow = isInExtraMatchingWindow(currentPeriod);
    if (!inWindow) {
      return res.status(400).json({ message: '지금은 추가 매칭 도전을 신청할 수 있는 기간이 아닙니다.' });
    }

    const { matched } = await getUserMatchingState(userId, currentPeriod.id);

    // 매칭에 이미 성공한 사용자는 추가 매칭 도전에 참여할 수 없음
    if (matched === true) {
      return res
        .status(400)
        .json({ message: '이번 회차에서 매칭에 성공한 사용자는 추가 매칭 도전에 참여할 수 없습니다.' });
    }

    // 이번 회차 추가 매칭 / "호감 보내기" 사용 상태 조회
    let usageState;
    try {
      usageState = await getUserExtraUsageState(userId, currentPeriod.id);
    } catch (e) {
      console.error('[extra-matching] /entries getUserExtraUsageState 오류:', e);
      return res.status(500).json({ message: '추가 매칭 도전 상태를 확인하는 중 오류가 발생했습니다.' });
    }

    if (usageState.hasEntryThisPeriod) {
      return res
        .status(400)
        .json({ message: '이미 이번 회차에 추가 매칭 도전 엔트리가 등록되어 있습니다.' });
    }

    if (usageState.hasActiveApplyThisPeriod) {
      return res.status(400).json({
        message:
          '이번 회차에서 이미 호감을 보내셨습니다. 상대가 거절하여 신청이 종료되면 다시 추가 매칭 도전을 등록하실 수 있습니다.',
      });
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

    // 프로필 스냅샷에 자기소개(appeal)를 모달에서 입력한 값으로 반영
    const snapshot = {
      ...profile,
      appeal:
        typeof extraAppealText === 'string' && extraAppealText.trim().length > 0
          ? extraAppealText.trim()
          : profile.appeal,
    };

    // 엔트리 생성
    const { data: inserted, error: insertError } = await supabase
      .from('extra_matching_entries')
      .insert({
        period_id: currentPeriod.id,
        user_id: userId,
        profile_snapshot: snapshot,
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

    // 🔹 추가 매칭 도전 시점의 스냅샷을 matching_applications(type='extra') 에도 기록
    await upsertExtraApplicationSnapshot(userId, currentPeriod.id, snapshot);

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
    const { extraAppealText } = req.body || {};
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

// 내 "추가 매칭 도전" 엔트리 취소 (호감 표현이 오기 전까지만 가능, 별 환불 없음)
router.post('/entries/:entryId/cancel', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { entryId } = req.params;

    // 추가 매칭 도전 기능 활성화 여부 확인
    const featureEnabled = await isExtraMatchingFeatureEnabled();
    if (!featureEnabled) {
      return res.status(403).json({ message: '추가 매칭 도전 기능이 현재 비활성화되어 있습니다.' });
    }

    const currentPeriod = await getCurrentPeriod();
    if (!currentPeriod) {
      return res.status(400).json({ message: '현재 진행 중인 매칭 회차가 없습니다.' });
    }

    const { data: entry, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('id, user_id, period_id, status')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      console.error('[extra-matching] /entries/:entryId/cancel 엔트리 조회 오류:', entryError);
      return res.status(404).json({ message: '엔트리를 찾을 수 없습니다.' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ message: '본인 엔트리만 취소할 수 있습니다.' });
    }

    if (entry.period_id !== currentPeriod.id) {
      return res.status(400).json({ message: '현재 회차의 엔트리만 취소할 수 있습니다.' });
    }

    if (entry.status !== 'open') {
      return res.status(400).json({ message: '이미 마감되었거나 취소된 추가 매칭 도전입니다.' });
    }

    // 이미 이성의 호감 표현(extra_matching_applies)이 있는 경우 취소 불가
    const { data: applies, error: appliesError } = await supabase
      .from('extra_matching_applies')
      .select('id')
      .eq('entry_id', entry.id);

    if (appliesError) {
      console.error('[extra-matching] /entries/:entryId/cancel applies 조회 오류:', appliesError);
      return res.status(500).json({ message: '엔트리 상태를 확인하는 중 오류가 발생했습니다.' });
    }

    if (applies && applies.length > 0) {
      return res.status(400).json({
        message: '이미 이성의 호감 표현이 있어 취소할 수 없습니다.',
      });
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('extra_matching_entries')
      .update({
        // DB check constraint에 맞추기 위해 status는 'closed'로 사용
        status: 'closed',
        closed_at: nowIso,
      })
      .eq('id', entry.id);

    if (updateError) {
      console.error('[extra-matching] /entries/:entryId/cancel 엔트리 상태 업데이트 오류:', updateError);
      return res.status(500).json({ message: '엔트리를 취소하는 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message:
        '추가 매칭 도전 등록을 취소했습니다.',
    });
  } catch (error) {
    console.error('[extra-matching] POST /entries/:entryId/cancel 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 이성의 추가 매칭 도전 엔트리 리스트 조회
router.get('/entries', async (req, res) => {
  try {
    const userId = req.user.userId;

    // 추가 매칭 도전 기능 활성화 여부 확인
    const featureEnabled = await isExtraMatchingFeatureEnabled();
    if (!featureEnabled) {
      return res.json({ entries: [] });
    }

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
      .select('id, period_id, user_id, profile_snapshot, gender, status')
      .eq('period_id', currentPeriod.id)
      // 사용자가 볼 수 있는 것은 open / sold_out 만 (cancelled, closed 등은 제외)
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

    // 과거 매칭된 상대는 목록에서 제외
    const { data: history, error: historyError } = await supabase
      .from('matching_history')
      .select('male_user_id, female_user_id')
      .or(`male_user_id.eq.${userId},female_user_id.eq.${userId}`);

    if (historyError) {
      console.error('[extra-matching] /entries matching_history 조회 오류:', historyError);
    }

    const previouslyMatchedIds = new Set();
    if (history && Array.isArray(history)) {
      for (const row of history) {
        if (row.male_user_id === userId) {
          previouslyMatchedIds.add(row.female_user_id);
        } else if (row.female_user_id === userId) {
          previouslyMatchedIds.add(row.male_user_id);
        }
      }
    }

    const filteredEntries = (entries || []).filter(
      (entry) => !previouslyMatchedIds.has(entry.user_id)
    );

    // 이번 회차에서 내가 각 엔트리에 보낸 호감의 상태 조회 (pending/accepted/rejected)
    let myApplyStatusByEntryId = {};
    if (filteredEntries.length > 0) {
      const entryIds = filteredEntries.map((e) => e.id);

      const { data: myApplies, error: myAppliesError } = await supabase
        .from('extra_matching_applies')
        .select('entry_id, status, created_at, rejected_reason')
        .eq('sender_user_id', userId)
        .in('entry_id', entryIds);

      if (myAppliesError) {
        console.error('[extra-matching] /entries 내 호감 신청 조회 오류:', myAppliesError);
      } else if (myApplies && myApplies.length > 0) {
        myApplyStatusByEntryId = myApplies.reduce((acc, row) => {
          acc[row.entry_id] = row;
          return acc;
        }, {});
      }
    }

    const expireHours = await getApplyExpireHours();
    const expireMs = expireHours * 60 * 60 * 1000;

    // 클라이언트에 필요한 정보만 가공
    const mapped = filteredEntries.map((entry) => {
      const p = entry.profile_snapshot || {};
      const myApply = myApplyStatusByEntryId[entry.id];
      const my_apply_status = myApply ? myApply.status : null;
      let expires_at = null;
      let rejected_reason = null;
      if (myApply) {
        rejected_reason = myApply.rejected_reason || null;
        if (myApply.status === 'pending' && myApply.created_at) {
          expires_at = new Date(new Date(myApply.created_at).getTime() + expireMs).toISOString();
        }
      }
      return {
        id: entry.id,
        period_id: entry.period_id,
        gender: entry.gender,
        status: entry.status,
        my_apply_status,
        expires_at,
        rejected_reason,
        age: p.birth_year || null,
        education: p.education ?? p.job_type ?? null,
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
          education: p.education ?? p.job_type ?? null,
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

// "호감 보내기" 신청 (별 10개)
router.post('/entries/:entryId/apply', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { entryId } = req.params;

    // 추가 매칭 도전 기능 활성화 여부 확인
    const featureEnabled = await isExtraMatchingFeatureEnabled();
    if (!featureEnabled) {
      return res.status(403).json({ message: '추가 매칭 도전 기능이 현재 비활성화되어 있습니다.' });
    }

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
      // 수동 취소된 엔트리인지 확인: status='closed' 이면서 아무 호감도 없었던 경우
      if (entry.status === 'closed') {
        const { data: allApplies, error: allAppliesError } = await supabase
          .from('extra_matching_applies')
          .select('id')
          .eq('entry_id', entry.id)
          .limit(1);

        if (!allAppliesError && (!allApplies || allApplies.length === 0)) {
          return res.status(400).json({
            message: '상대방 프로필을 찾을 수 없습니다. 추가 매칭 도전을 취소한 상대입니다.',
          });
        }
      }
      return res.status(400).json({ message: '이미 마감된 추가 매칭 도전입니다.' });
    }

    if (entry.user_id === userId) {
      return res.status(400).json({ message: '본인 추가 매칭 도전에 신청할 수 없습니다.' });
    }

    // 신청자는 이번 회차에 "매칭 성공"하지 않은 사용자여야 함
    const { matched } = await getUserMatchingState(userId, currentPeriod.id);
    if (matched === true) {
      return res
        .status(400)
        .json({ message: '이번 회차에서 매칭에 성공한 사용자는 추가 매칭 도전에 참여할 수 없습니다.' });
    }

    // 이번 회차 추가 매칭 / "호감 보내기" 사용 상태 조회
    let usageState;
    try {
      usageState = await getUserExtraUsageState(userId, currentPeriod.id);
    } catch (e) {
      console.error('[extra-matching] /entries/:entryId/apply getUserExtraUsageState 오류:', e);
      return res.status(500).json({ message: '추가 매칭 도전 상태를 확인하는 중 오류가 발생했습니다.' });
    }

    if (usageState.hasEntryThisPeriod) {
      return res.status(400).json({
        message:
          '이번 회차에서 이미 추가 매칭 도전에 등록하셔서 호감 보내기를 사용할 수 없습니다.',
      });
    }

    if (usageState.hasActiveApplyThisPeriod) {
      return res.status(400).json({
        message:
          '이번 회차에서 이미 다른 회원에게 호감을 보내셨습니다. 상대가 거절하여 신청이 종료되면 다시 시도하실 수 있습니다.',
      });
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
      entry_owner_id: entry.user_id,
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
        // extraAppealText 는 현재 테이블에 별도 컬럼이 없으므로,
        // 프로필의 appeal 을 갱신하는 방식으로 처리 (프론트에서 /users/me 업데이트 후 스냅샷 사용)
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

    // 🔹 호감 보내기 시점의 프로필 스냅샷을 matching_applications(type='extra') 에도 기록
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profileError && profile) {
        await upsertExtraApplicationSnapshot(userId, currentPeriod.id, profile);
      }
    } catch (e) {
      console.error('[extra-matching] /entries/:entryId/apply 스냅샷 upsert 중 예외:', e);
    }

    // 🔔 알림 + 푸시: 엔트리 주인에게 "호감 도착" 알림
    try {
      await notificationRoutes.createNotification(String(entry.user_id), {
        type: 'extra_match',
        title: '[추가매칭] 새로운 호감이 도착했어요',
        body:
          '추가 매칭 도전에 새로운 호감이 도착했습니다.\n' +
          '추가 매칭 페이지의 "나에게 온 호감"에서 확인하고 수락 또는 거절을 선택해 주세요.',
        linkUrl: '/extra-matching',
        meta: {
          period_id: currentPeriod.id,
          entry_id: entry.id,
          apply_id: apply.id,
          sender_user_id: userId,
        },
      });
      
      // 푸시 알림
      await sendPushToUsers([String(entry.user_id)], {
        type: 'extra_match_apply',
        title: '[직쏠공]',
        body: '누군가 나에게 호감을 보냈어요.',
      });
    } catch (e) {
      console.error('[extra-matching] 호감 도착 알림/푸시 생성 오류:', e);
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

// 내가 받은 "호감 보내기" 목록
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

    // 내 엔트리 찾기 (가장 최근 엔트리 기준, open / sold_out 우선)
    const { data: myEntries, error: entryError } = await supabase
      .from('extra_matching_entries')
      .select('id, period_id, status')
      .eq('period_id', currentPeriod.id)
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (entryError) {
      console.error('[extra-matching] /my-received-applies 엔트리 조회 오류:', entryError);
      return res.status(500).json({ message: '추가 매칭 도전 상태를 불러오는 중 오류가 발생했습니다.' });
    }

    let entry = null;
    if (myEntries && myEntries.length > 0) {
      // open / sold_out 상태의 엔트리를 우선 사용 (없으면 가장 최근 엔트리 사용)
      entry =
        myEntries.find((e) => e.status === 'open' || e.status === 'sold_out') ||
        myEntries[0];
    }

    if (!entry) {
      return res.json({
        entry: null,
        applies: [],
      });
    }

    // 이 엔트리에 들어온 모든 apply 조회
    const { data: applies, error: appliesError } = await supabase
      .from('extra_matching_applies')
      .select('id, sender_user_id, status, created_at, rejected_reason')
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

    const expireHours = await getApplyExpireHours();
    const expireMs = expireHours * 60 * 60 * 1000;

    const mappedApplies = (applies || []).map((a) => {
      const p = profilesByUserId[a.sender_user_id] || {};
      let expires_at = null;
      if (a.status === 'pending' && a.created_at) {
        expires_at = new Date(new Date(a.created_at).getTime() + expireMs).toISOString();
      }
      return {
        id: a.id,
        sender_user_id: a.sender_user_id,
        status: a.status,
        created_at: a.created_at,
        expires_at,
        rejected_reason: a.rejected_reason || null,
        profile: {
          nickname: p.nickname || null,
          birth_year: p.birth_year || null,
          gender: p.gender || null,
          education: p.education ?? p.job_type ?? null,
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

// "호감 보내기" 수락
router.post('/applies/:applyId/accept', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { applyId } = req.params;

    // apply + entry 함께 조회
    const { data: apply, error: applyError } = await supabase
      .from('extra_matching_applies')
      .select('id, entry_id, sender_user_id, status, created_at, used_star_amount, refunded_star_amount')
      .eq('id', applyId)
      .single();

    if (applyError || !apply) {
      console.error('[extra-matching] /applies/:applyId/accept apply 조회 오류:', applyError);
      return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다.' });
    }

    if (apply.status !== 'pending') {
      return res.status(400).json({ message: '이미 처리된 신청입니다.' });
    }

    if (apply.created_at) {
      const hours = await getApplyExpireHours();
      const expiresAt = new Date(apply.created_at).getTime() + hours * 60 * 60 * 1000;
      if (Date.now() >= expiresAt) {
        return res.status(400).json({ message: '이 호감은 이미 만료되었습니다.' });
      }
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

    // 같은 엔트리에 대기 중이던 다른 호감들은 other_accepted로 자동 거절 + 별 5개 환불
    try {
      const { data: otherPending, error: otherError } = await supabase
        .from('extra_matching_applies')
        .select('id, sender_user_id')
        .eq('entry_id', entry.id)
        .eq('status', 'pending');

      if (otherError) {
        console.error('[extra-matching] /applies/:applyId/accept 다른 신청 조회 오류:', otherError);
      } else if (otherPending && otherPending.length > 0) {
        for (const other of otherPending) {
          const { error: updErr } = await supabase
            .from('extra_matching_applies')
            .update({
              status: 'rejected',
              decided_at: nowIso,
              refunded_star_amount: 5,
              rejected_reason: 'other_accepted',
            })
            .eq('id', other.id);
          if (!updErr) {
            try {
              await awardStars(other.sender_user_id, 5, 'extra_match_auto_reject', { entry_id: entry.id, apply_id: other.id });
              // other_accepted: 직접 거절과 동일한 알림/푸시 (호감 보낸 사람에게)
              try {
                await notificationRoutes.createNotification(String(other.sender_user_id), {
                  type: 'extra_match',
                  title: '[추가매칭] 보낸 호감표시가 거절되었습니다',
                  body:
                    '상대가 회원님이 보낸 호감을 거절했습니다.\n' +
                    '사용하신 별 10개 중 5개는 자동으로 환불되었으며, 다른 분께 다시 도전하실 수 있어요.',
                  linkUrl: '/extra-matching',
                  meta: { entry_id: entry.id, apply_id: other.id, result: 'rejected' },
                });
                await sendPushToUsers([String(other.sender_user_id)], {
                  type: 'extra_match_reject',
                  title: '[직쏠공]',
                  body: '보낸 호감이 거절되었어요. 다른 분께 다시 도전해볼까요?',
                });
              } catch (notifErr) {
                console.error('[extra-matching] other_accepted 알림/푸시 오류:', notifErr);
              }
            } catch (refundErr) {
              console.error('[extra-matching] /applies/:applyId/accept 자동 거절 환불 오류:', refundErr);
            }
          }
        }
      }
    } catch (e) {
      console.error('[extra-matching] /applies/:applyId/accept 자동 거절 처리 중 예외:', e);
    }

    // 매칭 이력 기록 (정규 매칭과 동일한 방식으로 matching_history에 추가하되, type='extra'로 구분)
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, nickname, gender')
        .in('user_id', [entry.user_id, apply.sender_user_id]);

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', [entry.user_id, apply.sender_user_id]);

      if (profileError || usersError) {
        console.error('[extra-matching] 매칭 이력용 프로필/유저 조회 오류:', profileError || usersError);
      } else {
        const getProfile = (id) => profiles.find((p) => p.user_id === id) || {};
        const getUser = (id) => users.find((u) => u.id === id) || {};

        const entryProfile = getProfile(entry.user_id);
        const senderProfile = getProfile(apply.sender_user_id);
        const entryUser = getUser(entry.user_id);
        const senderUser = getUser(apply.sender_user_id);

        let maleId = entry.user_id;
        let femaleId = apply.sender_user_id;

        if (entryProfile.gender === 'female' && senderProfile.gender === 'male') {
          maleId = apply.sender_user_id;
          femaleId = entry.user_id;
        } else if (entryProfile.gender === 'male' && senderProfile.gender !== 'female') {
          maleId = entry.user_id;
          femaleId = apply.sender_user_id;
        }

        const maleProfile = getProfile(maleId);
        const femaleProfile = getProfile(femaleId);
        const maleUser = getUser(maleId);
        const femaleUser = getUser(femaleId);

        const matchedAt = new Date().toISOString();

        const { error: insertHistoryError } = await supabase
          .from('matching_history')
          .insert({
            period_id: entry.period_id,
            male_user_id: maleId,
            female_user_id: femaleId,
            male_nickname: maleProfile.nickname || null,
            female_nickname: femaleProfile.nickname || null,
            male_gender: maleProfile.gender || null,
            female_gender: femaleProfile.gender || null,
            male_user_email: maleUser.email || null,
            female_user_email: femaleUser.email || null,
            created_at: matchedAt,
            matched: true,
            matched_at: matchedAt,
            type: 'extra',
          });

        if (insertHistoryError) {
          console.error('[extra-matching] matching_history 기록 오류:', insertHistoryError);
        }

        // 정규 매칭과 동일한 권한/상태 처리 유지를 위해,
        // matching_applications 에도 matched=true, partner_user_id 를 반영해 둔다.
        const ensureMatchedApplication = async (userId, partnerId) => {
          try {
            const { data: appRow, error: appError } = await supabase
              .from('matching_applications')
              .select('id, matched, partner_user_id')
              .eq('user_id', userId)
              .eq('period_id', entry.period_id)
              .eq('type', 'main')
              .maybeSingle();

            if (appError && appError.code !== 'PGRST116') {
              console.error('[extra-matching] ensureMatchedApplication 조회 오류:', appError);
              return;
            }

            if (appRow) {
              // 기존 "정규 매칭 신청" row가 있는 경우에만 matched / partner_user_id 갱신
              if (!appRow.matched || appRow.partner_user_id !== partnerId) {
                const { error: updError } = await supabase
                  .from('matching_applications')
                  .update({ matched: true, partner_user_id: partnerId })
                  .eq('id', appRow.id);

                if (updError) {
                  console.error('[extra-matching] ensureMatchedApplication 업데이트 오류:', updError);
                }
              }
            }
          } catch (e) {
            console.error('[extra-matching] ensureMatchedApplication 처리 중 예외:', e);
          }
        };

        await ensureMatchedApplication(entry.user_id, apply.sender_user_id);
        await ensureMatchedApplication(apply.sender_user_id, entry.user_id);

        // 정규 매칭과 동일하게 /matching/status, MainPage 에서도
        // "매칭 신청 + 매칭 성공" 상태로 인식되도록 users 테이블 플래그도 갱신
        try {
          const { error: userMatchUpdateError } = await supabase
            .from('users')
            .update({ is_applied: true, is_matched: true })
            .in('id', [entry.user_id, apply.sender_user_id]);

          if (userMatchUpdateError) {
            console.error('[extra-matching] users is_applied/is_matched 업데이트 오류:', userMatchUpdateError);
          }
        } catch (e) {
          console.error('[extra-matching] users is_applied/is_matched 업데이트 중 예외:', e);
        }

        // 🔔 알림 + 푸시: 내가 보낸 호감에 대한 "승낙" 안내 (보낸 사람 기준)
        try {
          await notificationRoutes.createNotification(String(apply.sender_user_id), {
            type: 'extra_match',
            title: '[추가매칭] 보낸 호감표시를 상대가 승낙했어요',
            body:
              '상대가 회원님이 보낸 호감을 승낙했습니다.\n' +
              '이번 회차 추가 매칭을 통해 매칭이 성사되었으며, 메인 페이지에서 채팅방을 확인하실 수 있어요.',
            linkUrl: '/extra-matching',
            meta: {
              period_id: entry.period_id,
              entry_id: entry.id,
              apply_id: apply.id,
              result: 'accepted',
            },
          });
          
          // 푸시 알림
          await sendPushToUsers([String(apply.sender_user_id)], {
            type: 'extra_match_accept',
            title: '[직쏠공]',
            body: '보낸 호감표시가 승낙되었어요. 매칭이 성사되었습니다!',
          });
        } catch (e) {
          console.error('[extra-matching] 호감 승낙 알림/푸시 생성 오류:', e);
        }
      }
    } catch (e) {
      console.error('[extra-matching] matching_history 기록 중 예외:', e);
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

// "호감 보내기" 거절 (별 5개 환불)
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

    if (apply.created_at) {
      const hours = await getApplyExpireHours();
      const expiresAt = new Date(apply.created_at).getTime() + hours * 60 * 60 * 1000;
      if (Date.now() >= expiresAt) {
        return res.status(400).json({ message: '이 호감은 이미 만료되었습니다.' });
      }
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
        rejected_reason: 'manual',
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

    // 🔔 알림 + 푸시: 내가 보낸 호감에 대한 "거절" 안내 (보낸 사람 기준)
    try {
      await notificationRoutes.createNotification(String(apply.sender_user_id), {
        type: 'extra_match',
        title: '[추가매칭] 보낸 호감표시가 거절되었습니다',
        body:
          '상대가 회원님이 보낸 호감을 거절했습니다.\n' +
          '사용하신 별 10개 중 5개는 자동으로 환불되었으며, 다른 분께 다시 도전하실 수 있어요.',
        linkUrl: '/extra-matching',
        meta: {
          entry_id: entry.id,
          apply_id: apply.id,
          result: 'rejected',
        },
      });
      
      // 푸시 알림
      await sendPushToUsers([String(apply.sender_user_id)], {
        type: 'extra_match_reject',
        title: '[직쏠공]',
        body: '보낸 호감이 거절되었어요. 다른 분께 다시 도전해볼까요?',
      });
    } catch (e) {
      console.error('[extra-matching] 호감 거절 알림/푸시 생성 오류:', e);
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

// ---- 24시간 만료 자동 거절 (스케줄러용) ----
async function processExpiredApplies() {
  try {
    // 기간 종료 여부와 무관하게 만료된 pending apply는 자동 거절 (기간이 먼저 끝나도 처리)
    const hours = await getApplyExpireHours();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data: expiredApplies, error: fetchError } = await supabase
      .from('extra_matching_applies')
      .select('id, entry_id, sender_user_id')
      .eq('status', 'pending')
      .lt('created_at', cutoff);
    if (fetchError || !expiredApplies || expiredApplies.length === 0) return;
    const nowIso = new Date().toISOString();
    for (const apply of expiredApplies) {
      try {
        const { error: updateError } = await supabase
          .from('extra_matching_applies')
          .update({
            status: 'rejected',
            decided_at: nowIso,
            refunded_star_amount: 5,
            rejected_reason: 'timeout',
          })
          .eq('id', apply.id);
        if (!updateError) {
          await awardStars(apply.sender_user_id, 5, 'extra_match_refund_timeout', {
            entry_id: apply.entry_id,
            apply_id: apply.id,
          });
          // 대답 지연 자동 거절 알림 + 푸시
          try {
            await notificationRoutes.createNotification(String(apply.sender_user_id), {
              type: 'extra_match',
              title: '[추가매칭] 대답지연으로 인한 호감 자동거절',
              body:
                '상대방의 수락/거절 지연으로 자동으로 거절 처리되었습니다.\n' +
                '별 5개가 환불되었으며, 다른 분께 다시 도전하실 수 있어요.',
              linkUrl: '/extra-matching',
              meta: { entry_id: apply.entry_id, apply_id: apply.id, result: 'rejected_timeout' },
            });
            await sendPushToUsers([String(apply.sender_user_id)], {
              type: 'extra_match_reject_timeout',
              title: '[직쏠공]',
              body: '보낸 호감이 답변 없이 자동 거절되었어요. 별 5개 환불돼요.',
            });
          } catch (notifErr) {
            console.error('[extra-matching] processExpiredApplies 알림/푸시 오류:', apply.id, notifErr);
          }
        }
      } catch (e) {
        console.error('[extra-matching] processExpiredApplies:', apply.id, e);
      }
    }
  } catch (e) {
    console.error('[extra-matching] processExpiredApplies:', e);
  }
}

// 회차 종료 시 해당 회차의 모든 pending apply 자동 거절 + 별 5개 환불 (스케줄러용)
// - 24시간과 무관하게 매칭 기간(finish)이 지나면 남은 pending은 전부 거절 처리
async function processPeriodEndedPendingApplies(periodId) {
  if (!periodId) return;
  try {
    const { data: entries, error: entriesError } = await supabase
      .from('extra_matching_entries')
      .select('id')
      .eq('period_id', periodId);
    if (entriesError || !entries || entries.length === 0) return;
    const entryIds = entries.map((e) => e.id);
    const { data: pendingApplies, error: fetchError } = await supabase
      .from('extra_matching_applies')
      .select('id, entry_id, sender_user_id')
      .eq('status', 'pending')
      .in('entry_id', entryIds);
    if (fetchError || !pendingApplies || pendingApplies.length === 0) return;
    const nowIso = new Date().toISOString();
    for (const apply of pendingApplies) {
      try {
        const { error: updateError } = await supabase
          .from('extra_matching_applies')
          .update({
            status: 'rejected',
            decided_at: nowIso,
            refunded_star_amount: 5,
            rejected_reason: 'period_ended',
          })
          .eq('id', apply.id);
        if (!updateError) {
          await awardStars(apply.sender_user_id, 5, 'extra_match_refund_period_ended', {
            entry_id: apply.entry_id,
            apply_id: apply.id,
            period_id: periodId,
          });
          // 매칭 종료 자동 거절 알림 + 푸시
          try {
            await notificationRoutes.createNotification(String(apply.sender_user_id), {
              type: 'extra_match',
              title: '[추가매칭] 추가매칭도전 기간종료로 인한 호감 자동거절',
              body:
                '추가 매칭 기간이 종료되어 대답받지 않은 호감표시가 자동으로 거절 처리되었습니다.\n' +
                '별 5개가 환불되었으며, 다음 회차에서 다시 도전하실 수 있어요.',
              linkUrl: '/extra-matching',
              meta: { entry_id: apply.entry_id, apply_id: apply.id, period_id: periodId, result: 'rejected_period_ended' },
            });
            await sendPushToUsers([String(apply.sender_user_id)], {
              type: 'extra_match_reject_period_ended',
              title: '[직쏠공]',
              body: '매칭 기간 종료로 보낸 호감이 자동 거절되었어요. 별 5개 환불돼요.',
            });
          } catch (notifErr) {
            console.error('[extra-matching] processPeriodEndedPendingApplies 알림/푸시 오류:', apply.id, notifErr);
          }
        }
      } catch (e) {
        console.error('[extra-matching] processPeriodEndedPendingApplies:', apply.id, e);
      }
    }
  } catch (e) {
    console.error('[extra-matching] processPeriodEndedPendingApplies:', e);
  }
}

// (관리용) 특정 회차의 추가 매칭 도전 정산 API
// - 아직 open 상태인 엔트리만 대상으로, 호감이 한 번도 오지 않은 경우 별 5개 환불
router.post('/settle/:periodId', async (req, res) => {
  try {
    const { periodId } = req.params;
    const numericId = Number(periodId);
    if (!numericId || Number.isNaN(numericId)) {
      return res.status(400).json({ message: '유효한 periodId가 필요합니다.' });
    }

    // 먼저 기간 종료로 남은 pending 호감 자동 거절 + 별 5개 환불
    await processPeriodEndedPendingApplies(numericId);
    const result = await settleExtraMatchingForPeriod(numericId);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[extra-matching] POST /settle/:periodId 처리 오류:', error);
    return res.status(500).json({ message: '정산 처리 중 서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
module.exports.processExpiredApplies = processExpiredApplies;
module.exports.processPeriodEndedPendingApplies = processPeriodEndedPendingApplies;



