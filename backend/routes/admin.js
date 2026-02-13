const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { sendMatchingResultEmail, sendAdminBroadcastEmail, sendNewCompanyNotificationEmail } = require('../utils/emailService');
const { computeMatchesForPeriod, computeMatchesForAllUsers } = require('../matching-algorithm');
const authenticate = require('../middleware/authenticate');
const notificationRoutes = require('./notifications');
const { getMessaging } = require('../firebaseAdmin');
const { sendPushToAllUsers } = require('../pushService');
const { decrypt } = require('../utils/encryption');

// 임시 데이터 (다른 라우트와 공유)
const users = [];
const matches = [];
// matching_log 날짜/시간 유효성 검사 헬퍼
function validateMatchingLogDates(log) {
  const { application_start, application_end, matching_run, matching_announce, finish } = log || {};

  if (!application_start || !application_end || !matching_run || !matching_announce || !finish) {
    return { ok: false, message: '신청 시작/마감, 매칭 실행, 결과 발표, 회차 종료 시간을 모두 입력해주세요.' };
  }

  const start = new Date(application_start);
  const end = new Date(application_end);
  const run = new Date(matching_run);
  const announce = new Date(matching_announce);
  const fin = new Date(finish);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    Number.isNaN(run.getTime()) ||
    Number.isNaN(announce.getTime()) ||
    Number.isNaN(fin.getTime())
  ) {
    return { ok: false, message: '유효하지 않은 날짜/시간 형식이 포함되어 있습니다.' };
  }

  // 단계별 시간 역전 방지: 신청 시작 < 신청 마감 ≤ 매칭 실행 ≤ 결과 발표 ≤ 회차 종료
  if (!(start.getTime() < end.getTime())) {
    return { ok: false, message: '신청 마감 시간은 신청 시작 시간보다 늦어야 합니다.' };
  }
  if (run.getTime() < end.getTime()) {
    return { ok: false, message: '매칭 실행 시간은 신청 마감 시간 이후여야 합니다.' };
  }
  if (announce.getTime() < run.getTime()) {
    return { ok: false, message: '결과 발표 시간은 매칭 실행 시간 이후여야 합니다.' };
  }
  if (fin.getTime() < announce.getTime()) {
    return { ok: false, message: '회차 종료 시간은 결과 발표 시간 이후여야 합니다.' };
  }

  return { ok: true };
}


// 공통: 관리자 권한 체크 유틸
function ensureAdmin(req, res) {
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    return false;
  }
  return true;
}

// 별 지급 공통 함수 (출석체크 로직과 동일한 방식: users.star_balance 업데이트 + star_transactions 기록)
async function awardStarsToUser(userId, amount, reason, meta) {
  if (!userId || typeof amount !== 'number' || amount <= 0) {
    throw new Error('awardStarsToUser: 잘못된 인자');
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

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// 모든 사용자 조회 (계정 정보 + 프로필 정보)
router.get('/users', authenticate, async (req, res) => {
  try {
    const [usersResult, profilesResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, is_verified, is_active, is_admin, created_at, updated_at, last_login_at'),
      supabase
        .from('user_profiles')
        .select('*'),
    ]);

    const { data: users, error: usersError } = usersResult;
    const { data: profiles } = profilesResult;

    if (usersError) {
      console.error('사용자 조회 오류', usersError);
      return res.status(500).json({ message: '사용자 조회에 실패했습니다.' });
    }

    const profileByUserId = {};
    if (profiles && Array.isArray(profiles)) {
      profiles.forEach((p) => {
        if (p.user_id) profileByUserId[p.user_id] = p;
      });
    }

    const usersWithProfiles = (users || []).map((user) => {
      const safeProfile = profileByUserId[user.id] || null;
      return {
        ...(safeProfile || {}),
        ...user,
        profile: safeProfile,
      };
    });

    res.json(usersWithProfiles);
  } catch (error) {
    console.error('사용자 목록 조회 오류', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 시스템 설정 조회 (현재는 유지보수 모드 + Dev Mode + 추가 매칭 도전)
router.get('/system-settings', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    // 유지보수 모드 설정 조회
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle();

    if (error) {
      console.error('[admin][system-settings] 조회 오류');
      return res.status(500).json({ success: false, message: '시스템 설정 조회에 실패했습니다.' });
    }

    const enabled = !!(data && data.value && data.value.enabled === true);
    const message = (data && data.value && typeof data.value.message === 'string')
      ? data.value.message
      : '';

    // Dev Mode 설정 조회 (없으면 false로 간주, value.enabled 사용)
    let devModeEnabled = false;
    try {
      const { data: devRow, error: devError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'dev_mode')
        .maybeSingle();

      if (!devError && devRow && devRow.value && devRow.value.enabled === true) {
        devModeEnabled = true;
      }
    } catch (devErr) {
      console.error('[admin][system-settings] dev_mode 조회 오류');
    }

    // 추가 매칭 도전 설정 조회 (기본값: true)
    let extraMatchingEnabled = true;
    try {
      const { data: extraRow, error: extraError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'extra_matching_enabled')
        .maybeSingle();

      if (!extraError && extraRow && extraRow.value) {
        extraMatchingEnabled = extraRow.value.enabled !== false;
      }
    } catch (extraErr) {
      console.error('[admin][system-settings] extra_matching_enabled 조회 오류');
    }

    let communityEnabled = true;
    try {
      const { data: communityRow, error: communityError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'community_enabled')
        .maybeSingle();

      if (!communityError && communityRow && communityRow.value) {
        communityEnabled = communityRow.value.enabled !== false;
      }
    } catch (communityErr) {
      console.error('[admin][system-settings] community_enabled 조회 오류');
    }

    // 버전 정책 조회
    let versionPolicy = null;
    try {
      const { data: versionRow, error: versionError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'version_policy')
        .maybeSingle();

      if (!versionError && versionRow && versionRow.value) {
        versionPolicy = versionRow.value;
      }
    } catch (versionErr) {
      console.error('[admin][system-settings] version_policy 조회 오류');
    }

    // 가위바위보 통계 제외 닉네임 목록 (닉네임 기준)
    let rpsStatsExcludedNicknames = [];
    try {
      const { data: rpsExcludedRow, error: rpsExcludedError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'rps_stats_excluded_nicknames')
        .maybeSingle();

      if (!rpsExcludedError && rpsExcludedRow && rpsExcludedRow.value && Array.isArray(rpsExcludedRow.value.nicknames)) {
        rpsStatsExcludedNicknames = rpsExcludedRow.value.nicknames;
      }
    } catch (rpsExcludedErr) {
      console.error('[admin][system-settings] rps_stats_excluded_nicknames 조회 오류');
    }

    res.json({
      success: true,
      maintenance: {
        enabled,
        message,
      },
      devMode: {
        enabled: devModeEnabled,
      },
      extraMatching: {
        enabled: extraMatchingEnabled,
      },
      community: {
        enabled: communityEnabled,
      },
      versionPolicy: versionPolicy || {
        ios: { minimumVersion: '0.1.0', latestVersion: '0.1.0', storeUrl: '' },
        android: { minimumVersion: '0.1.0', latestVersion: '0.1.0', storeUrl: '' },
        messages: { forceUpdate: '', optionalUpdate: '' }
      },
      rpsStatsExcluded: {
        nicknames: rpsStatsExcludedNicknames,
      },
    });
  } catch (error) {
    console.error('[admin][system-settings] 조회 오류');
    res.status(500).json({ success: false, message: '시스템 설정 조회에 실패했습니다.' });
  }
});

// 유지보수 모드 토글
router.put('/system-settings/maintenance', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { enabled, message } = req.body || {};

    const value = {
      enabled: !!enabled,
      message: typeof message === 'string' ? message : '',
    };

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'maintenance',
          value,
          updated_by: req.user.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('value')
      .maybeSingle();

    if (error) {
      console.error('[admin][system-settings] 유지보수 모드 업데이트 오류:', error);
      return res.status(500).json({ success: false, message: '유지보수 모드 변경에 실패했습니다.' });
    }

    res.json({
      success: true,
      maintenance: {
        enabled: !!(data && data.value && data.value.enabled === true),
      },
    });
  } catch (error) {
    console.error('[admin][system-settings] 유지보수 모드 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '유지보수 모드 변경에 실패했습니다.' });
  }
});

// Dev Mode 토글 (관리자 모드 on/off)
router.put('/system-settings/dev-mode', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { enabled } = req.body || {};

    const devEnabled = !!enabled;
    const value = { enabled: devEnabled };

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'dev_mode',
          value,
          updated_by: req.user.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('value')
      .maybeSingle();

    if (error) {
      console.error('[admin][system-settings] Dev Mode 업데이트 오류:', error);
      return res.status(500).json({ success: false, message: 'Dev Mode 변경에 실패했습니다.' });
    }

    res.json({
      success: true,
      devMode: {
        enabled: !!(data && data.value && data.value.enabled === true),
      },
    });
  } catch (error) {
    console.error('[admin][system-settings] Dev Mode 업데이트 오류');
    res.status(500).json({ success: false, message: 'Dev Mode 변경에 실패했습니다.' });
  }
});

// 추가 매칭 도전 기능 토글
router.put('/system-settings/extra-matching', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { enabled } = req.body || {};

    const extraMatchingEnabled = !!enabled;
    const value = { enabled: extraMatchingEnabled };

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'extra_matching_enabled',
          value,
          updated_by: req.user.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('value')
      .maybeSingle();

    if (error) {
      console.error('[admin][system-settings] 추가 매칭 도전 업데이트 오류:', error);
      return res.status(500).json({ success: false, message: '추가 매칭 도전 설정 변경에 실패했습니다.' });
    }

    res.json({
      success: true,
      extraMatching: {
        enabled: !!(data && data.value && data.value.enabled === true),
      },
    });
  } catch (error) {
    console.error('[admin][system-settings] 추가 매칭 도전 업데이트 오류');
    res.status(500).json({ success: false, message: '추가 매칭 도전 설정 변경에 실패했습니다.' });
  }
});

// 커뮤니티 기능 토글
router.put('/system-settings/community', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { enabled } = req.body || {};

    const communityEnabled = !!enabled;
    const value = { enabled: communityEnabled };

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'community_enabled',
          value,
          updated_by: req.user.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('value')
      .maybeSingle();

    if (error) {
      console.error('[admin][system-settings] 커뮤니티 업데이트 오류:', error);
      return res.status(500).json({ success: false, message: '커뮤니티 설정 변경에 실패했습니다.' });
    }

    res.json({
      success: true,
      community: {
        enabled: !!(data && data.value && data.value.enabled === true),
      },
    });
  } catch (error) {
    console.error('[admin][system-settings] 커뮤니티 업데이트 오류');
    res.status(500).json({ success: false, message: '커뮤니티 설정 변경에 실패했습니다.' });
  }
});

// 버전 정책 업데이트 (관리자 전용)
router.put('/system-settings/version-policy', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { ios, android, messages } = req.body || {};

    // 버전 형식 유효성 검사 (간단)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(ios?.minimumVersion) || !versionRegex.test(ios?.latestVersion) ||
        !versionRegex.test(android?.minimumVersion) || !versionRegex.test(android?.latestVersion)) {
      return res.status(400).json({ 
        success: false, 
        message: '버전 형식이 올바르지 않습니다. (예: 1.0.0)' 
      });
    }

    const value = {
      ios,
      android,
      messages
    };

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'version_policy',
          value,
          updated_by: req.user.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('value')
      .maybeSingle();

    if (error) {
      console.error('[admin][system-settings] 버전 정책 업데이트 오류:', error);
      return res.status(500).json({ success: false, message: '버전 정책 변경에 실패했습니다.' });
    }

    res.json({
      success: true,
      versionPolicy: data?.value || value,
      message: '버전 정책이 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('[admin][system-settings] 버전 정책 업데이트 오류');
    res.status(500).json({ success: false, message: '버전 정책 변경에 실패했습니다.' });
  }
});

// 가위바위보 통계 제외 닉네임 목록 업데이트 (관리자 전용, 닉네임 기준)
router.put('/system-settings/rps-stats-excluded', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const nicknames = Array.isArray(req.body?.nicknames) ? req.body.nicknames : [];
    const trimmed = nicknames.map((n) => (typeof n === 'string' ? n.trim() : '')).filter((n) => n !== '');

    const value = { nicknames: trimmed };

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'rps_stats_excluded_nicknames',
          value,
          updated_by: req.user.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[admin][system-settings] rps-stats-excluded 업데이트 오류:', error);
      return res.status(500).json({ success: false, message: '가위바위보 통계 제외 목록 저장에 실패했습니다.' });
    }

    return res.json({ success: true, nicknames: trimmed, message: '저장되었습니다.' });
  } catch (err) {
    console.error('[admin][system-settings] rps-stats-excluded 오류', err);
    return res.status(500).json({ success: false, message: '저장 중 오류가 발생했습니다.' });
  }
});

// 모든 매칭 조회 (임시)
router.get('/matches', authenticate, (req, res) => {
  try {
    // TODO: 매칭 테이블 구현 후 실제 데이터 조회
    res.json([]);
  } catch (error) {
    console.error('매칭 목록 조회 오류');
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 특정 사용자 조회 (관리자용)
router.get('/users/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 계정 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_verified, is_active, is_admin, is_banned, banned_until, report_count, created_at, updated_at')
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

    if (profileError) {
      console.error('프로필 조회 오류:', profileError);
      return res.status(404).json({ message: '프로필을 찾을 수 없습니다.' });
    }

    // 계정 정보와 프로필 정보를 합쳐서 반환
    const userData = {
      ...profile,
      ...user,
      user_id: user.id // user_id 필드 명시적으로 추가
    };

    res.json(userData);
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 상태 업데이트
router.put('/users/:userId/status', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('사용자 상태 업데이트 오류');
      return res.status(500).json({ message: '사용자 상태 업데이트에 실패했습니다.' });
    }

    // 계정 비활성화 시 모든 Refresh Token 무효화
    if (!isActive) {
      try {
        const { error: tokenError } = await supabase
          .from('refresh_tokens')
          .update({ revoked_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('revoked_at', null);
        if (tokenError) {
          console.error('[관리자] 계정 비활성화 - Refresh Token 무효화 오류:', tokenError);
        } else {
          console.log(`[관리자] 계정 비활성화 - 사용자 ${userId}의 모든 Refresh Token 무효화 완료`);
        }
      } catch (tokenErr) {
        console.error('[관리자] 계정 비활성화 - 토큰 무효화 처리 중 오류:', tokenErr);
      }
    }
    
    res.json({
      success: true,
      message: '사용자 상태가 업데이트되었습니다.',
      user: data
    });
  } catch (error) {
    console.error('사용자 상태 업데이트 오류');
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 시스템 통계
router.get('/stats', authenticate, async (req, res) => {
  try {
    // 전체 사용자 수
    const { count: totalUsers, error: totalError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('전체 사용자 수 조회 오류');
      return res.status(500).json({ message: '통계 조회에 실패했습니다.' });
    }

    // 활성 사용자 수
    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeError) {
      console.error('활성 사용자 수 조회 오류');
      return res.status(500).json({ message: '통계 조회에 실패했습니다.' });
    }

    // 인증된 사용자 수
    const { count: verifiedUsers, error: verifiedError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);

    if (verifiedError) {
      console.error('인증된 사용자 수 조회 오류');
      return res.status(500).json({ message: '통계 조회에 실패했습니다.' });
    }

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      verifiedUsers: verifiedUsers || 0,
      totalMatches: 0, // TODO: 매칭 테이블 구현 후 실제 데이터 조회
      confirmedMatches: 0,
      pendingMatches: 0,
      cancelledMatches: 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('통계 조회 오류');
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// KST 기준 오늘 00:00 ~ 23:59:59.999 (UTC Date)
function getKSTTodayRange() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  const start = new Date(`${y}-${m}-${d}T00:00:00.000+09:00`);
  const end = new Date(`${y}-${m}-${d}T23:59:59.999+09:00`);
  return { start: start.toISOString(), end: end.toISOString() };
}

// KST 기준 최근 7일 전 00:00:00 (주간 누적 시작 시점)
function getKSTWeekAgoStart() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - 7);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T00:00:00.000+09:00`).toISOString();
}

// 가위바위보 통계: 인증 사용자 모두 조회. 관리자만 누적 포함, 일반 회원은 오늘·주간만
router.get('/rps/stats', authenticate, async (req, res) => {
  try {
    const isAdmin = Boolean(req.user?.isAdmin);

    const { data: allTx, error: allErr } = await supabase
      .from('star_transactions')
      .select('user_id, amount, reason, created_at')
      .in('reason', ['rps_bet', 'rps_win', 'rps_ad_reward']);

    if (allErr) {
      console.error('[admin] rps/stats star_transactions 조회 오류', allErr);
      return res.status(500).json({ message: 'RPS 통계 조회에 실패했습니다.' });
    }

    const { start: todayStart, end: todayEnd } = getKSTTodayRange();

    function aggregate(rows) {
      const byUser = {};
      (rows || []).forEach((row) => {
        const uid = row.user_id;
        if (!byUser[uid]) byUser[uid] = { playCount: 0, netStars: 0, adRewardStars: 0 };
        if (row.reason === 'rps_bet') byUser[uid].playCount += 1;
        if (row.reason === 'rps_bet' || row.reason === 'rps_win') {
          byUser[uid].netStars += Number(row.amount) || 0;
        }
        if (row.reason === 'rps_ad_reward') {
          byUser[uid].adRewardStars += Number(row.amount) || 0;
        }
      });
      return Object.entries(byUser)
        .map(([userId, v]) => ({
          userId,
          playCount: v.playCount,
          netStars: v.netStars,
          adRewardStars: v.adRewardStars,
          totalNetStars: v.netStars + v.adRewardStars,
        }))
        .sort((a, b) => b.totalNetStars - a.totalNetStars)
        .map((row, i) => ({ rank: i + 1, ...row }));
    }

    const cumulative = aggregate(allTx || []);
    const todayRows = (allTx || []).filter(
      (r) => r.created_at >= todayStart && r.created_at <= todayEnd
    );
    const today = aggregate(todayRows);

    const weekStart = getKSTWeekAgoStart();
    const weeklyRows = (allTx || []).filter((r) => r.created_at >= weekStart);
    const weekly = aggregate(weeklyRows);

    const userIds = [...new Set([...cumulative.map((r) => r.userId), ...today.map((r) => r.userId), ...weekly.map((r) => r.userId)])];
    const profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, nickname')
        .in('user_id', userIds);
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = p.nickname != null && String(p.nickname).trim() !== '' ? String(p.nickname).trim() : '-';
      });
    }

    const withName = (list) =>
      list.map((r) => ({ ...r, displayName: profileMap[r.userId] || '-' }));

    // 관리자 계정: 누가 보든 무조건 통계에서 제외
    let adminUserIdsSet = new Set();
    try {
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .eq('is_admin', true);
      if (adminUsers && adminUsers.length) {
        adminUsers.forEach((u) => adminUserIdsSet.add(u.id));
      }
    } catch (e) {
      console.error('[admin] rps/stats 관리자 목록 조회 오류', e);
    }

    // 통계 제외 닉네임 (설정에서 관리). 본인은 자기 순위만 보이게 하려고 viewerId 사용
    let excludedNicknamesSet = new Set();
    try {
      const { data: excludedRow } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'rps_stats_excluded_nicknames')
        .maybeSingle();
      if (excludedRow?.value?.nicknames && Array.isArray(excludedRow.value.nicknames)) {
        excludedRow.value.nicknames.forEach((n) => {
          const t = typeof n === 'string' ? n.trim() : '';
          if (t) excludedNicknamesSet.add(t);
        });
      }
    } catch (e) {
      console.error('[admin] rps/stats 제외 목록 조회 오류', e);
    }

    const viewerId = req.user?.userId || req.user?.id || null;

    // 일반 회원이 볼 때: 관리자 행은 항상 제외, 제외 닉네임 목록에 있는 사람은 다른 사람에게만 안 보이고 본인에게는 전체 순위(본인 행 포함)로 보임
    // 관리자가 볼 때: 제외 없이 모든 사람(관리자 포함) 표시
    const filterExcluded = (list) => {
      const filtered = list.filter((r) => {
        if (adminUserIdsSet.has(r.userId)) return false;
        const inExcludedList = excludedNicknamesSet.has((r.displayName || '').trim());
        if (inExcludedList && r.userId !== viewerId) return false;
        return true;
      });
      return filtered.map((row, i) => ({ ...row, rank: i + 1 }));
    };

    const cumNamed = withName(cumulative);
    const todayNamed = withName(today);
    const weeklyNamed = withName(weekly);

    if (isAdmin) {
      return res.json({
        cumulative: cumNamed,
        today: todayNamed,
        weekly: weeklyNamed,
      });
    }
    return res.json({
      today: filterExcluded(todayNamed),
      weekly: filterExcluded(weeklyNamed),
    });
  } catch (error) {
    console.error('[admin] rps/stats 오류', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// matching_log 전체 조회
router.get('/matching-log', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matching_log')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('matching_log 조회 오류');
    res.status(500).json({ message: 'matching_log 조회 실패' });
  }
});

// matching_log 생성
router.post('/matching-log', authenticate, async (req, res) => {
  try {
    const insertData = req.body || {};

    // 0. 단일 회차 내부 날짜/시간 유효성 검사
    const validation = validateMatchingLogDates(insertData);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    // 1. 마지막 회차와의 시간 겹침 방지:
    //    새 회차의 신청 시작 시간은 마지막 생성된 회차의 종료 시간보다 늦어야 한다.
    const { data: lastLog, error: lastError } = await supabase
      .from('matching_log')
      .select('id, finish')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) {
      console.error('[admin][matching-log] 마지막 회차 조회 오류');
      return res.status(500).json({ message: '기존 회차 정보를 조회하는 중 오류가 발생했습니다.' });
    }

    if (lastLog && lastLog.finish) {
      const lastFinish = new Date(lastLog.finish);
      const newStart = new Date(insertData.application_start);
      if (!Number.isNaN(lastFinish.getTime()) && !Number.isNaN(newStart.getTime())) {
        // 새 회차의 신청 시작 시간이 마지막 회차 종료 시간보다 같거나 빠르면 안 됨
        if (newStart.getTime() <= lastFinish.getTime()) {
          return res.status(400).json({
            message: '새 회차의 신청 시작 시간은 이전 회차의 종료 시간보다 늦어야 합니다.',
          });
        }
      }
    }
    
    // 2. 새로운 회차 생성 (email_sent 초기값 설정)
    const insertDataWithDefaults = {
      ...insertData,
      email_sent: false,
      // status 컬럼이 있는 경우 기본값을 명시적으로 '준비중'으로 설정
      status: insertData.status || '준비중',
    };
    
    const { data, error } = await supabase
      .from('matching_log')
      .insert([insertDataWithDefaults])
      .select()
      .single();
    if (error) throw error;

    // 엔티티 자체에는 존재하지 않는 message 필드를 섞지 않고, 순수 row만 반환
    res.json(data);
  } catch (error) {
    console.error('matching_log 생성 오류');
    res.status(500).json({ message: 'matching_log 생성 실패' });
  }
});

// matching_log 수정
router.put('/matching-log/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 프론트에서 내려온 응답 객체 전체를 그대로 넘기면
    // DB에 존재하지 않는 message 등의 필드까지 update에 포함되어
    // PGRST204 (schema cache에 해당 컬럼 없음) 오류가 발생할 수 있음.
    // 따라서 실제 테이블 컬럼으로 사용하는 필드만 골라서 업데이트한다.
    const allowedFields = [
      'application_start',
      'application_end',
      'matching_announce',
      'matching_run',
      'finish',
      'executed',
      'email_sent'
    ];
    const rawBody = req.body || {};
    const updateData = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(rawBody, key)) {
        updateData[key] = rawBody[key];
      }
    }

    // 기존 값 조회 후, 업데이트 적용 값을 합쳐서 유효성 검사
    const { data: existing, error: fetchError } = await supabase
      .from('matching_log')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('matching_log 수정 전 조회 오류');
      return res.status(500).json({ message: '매칭 회차 조회에 실패했습니다.', error: fetchError.message || fetchError });
    }

    if (!existing) {
      return res.status(404).json({ message: `ID ${id} 회차를 찾을 수 없습니다.` });
    }

    const mergedLog = { ...existing, ...updateData };
    const validation = validateMatchingLogDates(mergedLog);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const { data, error } = await supabase
      .from('matching_log')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('matching_log 수정 오류 (supabase):', error);
      return res.status(500).json({ message: 'matching_log 수정 실패', error: error.message || error });
    }

    if (!data) {
      // 해당 ID 회차가 존재하지 않는 경우
      return res.status(404).json({ message: `ID ${id} 회차를 찾을 수 없습니다.` });
    }

    res.json(data);
  } catch (error) {
    console.error('matching_log 수정 오류 (서버):', error);
    res.status(500).json({ message: 'matching_log 수정 실패', error: error.message || error });
  }
});

// matching_log 삭제 (연관 데이터도 함께 삭제)
router.delete('/matching-log/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const periodId = Number(id);
  try {
    // 1. matching_applications 삭제
    const { error: appError } = await supabase
      .from('matching_applications')
      .delete()
      .eq('period_id', periodId);
    if (appError) throw appError;

    // 2. matching_history 삭제
    const { error: histError } = await supabase
      .from('matching_history')
      .delete()
      .eq('period_id', periodId);
    if (histError) throw histError;

    // 3. reports 삭제 (해당 회차의 신고들)
    const { error: reportError } = await supabase
      .from('reports')
      .delete()
      .eq('period_id', periodId);
    if (reportError) throw reportError;

    // 4. chat_messages 삭제 (해당 회차의 채팅 기록)
    const { error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('period_id', periodId);
    if (chatError) {
      console.error(`채팅 기록 삭제 오류:`, chatError);
    }

    // 5. matching_log 삭제
    const { data, error: logError } = await supabase
      .from('matching_log')
      .delete()
      .eq('id', periodId)
      .select()
      .maybeSingle();
    if (logError) throw logError;

    res.json({ 
      success: true, 
      deleted: data,
      message: '회차 및 관련 데이터(매칭 신청, 이력, 신고, 채팅 기록)가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('matching_log 및 연관 데이터 삭제 오류:', error);
    res.status(500).json({ message: 'matching_log 및 연관 데이터 삭제 실패' });
  }
});

// 가상 매칭 시뮬레이션 (DB 변경 없음)
router.post('/matching-simulate', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { periodId } = req.body || {};

    let numericPeriodId = null;
    if (periodId && periodId !== 'all') {
      const n = Number(periodId);
      if (!Number.isNaN(n)) {
        numericPeriodId = n;
      }
    }

    const result = await computeMatchesForPeriod(numericPeriodId);

    return res.json({
      success: true,
      periodId: result.periodId,
      totalApplicants: result.totalApplicants,
      eligibleApplicants: result.eligibleApplicants,
      matchCount: result.matchCount,
      couples: result.couples || [],
    });
  } catch (error) {
    console.error('[admin][matching-simulate] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '가상 매칭 중 오류가 발생했습니다.',
    });
  }
});

// 가상 매칭 시뮬레이션 (전체 회원 기준, 관리자/정지 제외, DB 변경 없음)
router.post('/matching-simulate-live', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const result = await computeMatchesForAllUsers();

    return res.json({
      success: true,
      totalUsers: result.totalUsers,
      eligibleUsers: result.eligibleUsers,
      matchCount: result.matchCount,
      couples: result.couples || [],
    });
  } catch (error) {
    console.error('[admin][matching-simulate-live] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '전체 회원 가상 매칭 중 오류가 발생했습니다.',
    });
  }
});

let adminCompanyIdNameMap = null;

async function loadAdminCompanyMap() {
  if (adminCompanyIdNameMap) return adminCompanyIdNameMap;
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true);

    if (error) {
      console.error('[admin matching] 회사 목록 조회 오류:', error);
      adminCompanyIdNameMap = null;
      return null;
    }
    if (!companies || companies.length === 0) {
      adminCompanyIdNameMap = null;
      return null;
    }
    adminCompanyIdNameMap = new Map();
    companies.forEach(c => {
      if (c && c.id !== undefined && c.name) {
        adminCompanyIdNameMap.set(c.id, c.name);
      }
    });
    
    return adminCompanyIdNameMap;
  } catch (e) {
    console.error('[admin matching] 회사 목록 로드 중 예외:', e);
    adminCompanyIdNameMap = null;
    return null;
  }
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed) return [parsed];
    } catch (e) {
      return [value];
    }
    return [value];
  }
  return [];
}

function extractSido(residence) {
  if (!residence || typeof residence !== 'string') return null;
  const trimmed = residence.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  return parts[0] || null;
}

// owner의 선호 기준 대비 target이 어떤 이유로 탈락하는지 설명 리스트 반환
function getPreferenceMismatchReasons(target, owner) {
  const reasons = [];
  if (!owner) return reasons;

  const targetBirthYear = target.birth_year;
  const ownerBirthYear = owner.birth_year;

  // 나이
  if (ownerBirthYear && (owner.preferred_age_min != null || owner.preferred_age_max != null)) {
    const prefMin = owner.preferred_age_min ?? 0;
    const prefMax = owner.preferred_age_max ?? 0;
    const minBirth = ownerBirthYear - (prefMax ?? 0);
    const maxBirth = ownerBirthYear - (prefMin ?? 0);
    const ownerRangeLabel = `${minBirth}년 ~ ${maxBirth}년`;

    if (!targetBirthYear) {
      reasons.push({
        key: 'age',
        title: '나이 불일치',
        ownerPref: ownerRangeLabel,
        targetValue: '정보 없음',
      });
    } else {
      if (targetBirthYear < minBirth || targetBirthYear > maxBirth) {
        reasons.push({
          key: 'age',
          title: '나이 불일치',
          ownerPref: ownerRangeLabel,
          targetValue: `${targetBirthYear}년`,
        });
      }
    }
  }

  // 키
  const hasHeightPref =
    owner.preferred_height_min != null || owner.preferred_height_max != null;
  if (hasHeightPref) {
    const minH =
      owner.preferred_height_min != null ? owner.preferred_height_min : owner.preferred_height_max;
    const maxH =
      owner.preferred_height_max != null ? owner.preferred_height_max : owner.preferred_height_min;
    const ownerHeightLabel =
      minH != null && maxH != null
        ? `${minH}cm ~ ${maxH}cm`
        : minH != null
        ? `${minH}cm 이상`
        : `${maxH}cm 이하`;

    let mismatch = false;
    if (typeof target.height !== 'number') {
      mismatch = true;
      reasons.push({
        key: 'height',
        title: '키 불일치',
        ownerPref: ownerHeightLabel,
        targetValue: '정보 없음',
      });
    } else {
      if (owner.preferred_height_min != null && target.height < owner.preferred_height_min) {
        mismatch = true;
      }
      if (owner.preferred_height_max != null && target.height > owner.preferred_height_max) {
        mismatch = true;
      }
      if (mismatch) {
        reasons.push({
          key: 'height',
          title: '키 불일치',
          ownerPref: ownerHeightLabel,
          targetValue: `${target.height}cm`,
        });
      }
    }
  }

  // 체형
  const prefBodyTypes = ensureArray(owner.preferred_body_types);
  if (prefBodyTypes.length > 0) {
    const targetBodyTypes = ensureArray(target.body_type);
    if (targetBodyTypes.length === 0 || !prefBodyTypes.some(type => targetBodyTypes.includes(type))) {
      const prefLabel = prefBodyTypes.join(', ');
      const targetLabel = targetBodyTypes.length ? targetBodyTypes.join(', ') : '정보 없음';
      reasons.push({
        key: 'body',
        title: '체형 불일치',
        ownerPref: prefLabel,
        targetValue: targetLabel,
      });
    }
  }

  // 학력
  const prefEducations = ensureArray(owner.preferred_educations);
  if (prefEducations.length > 0) {
    const targetEd = target.education || '정보 없음';
    if (!target.education || !prefEducations.includes(target.education)) {
      reasons.push({
        key: 'education',
        title: '학력 불일치',
        ownerPref: prefEducations.join(', '),
        targetValue: targetEd,
      });
    }
  }

  // 결혼상태
  const prefMarital = ensureArray(owner.preferred_marital_statuses);
  if (prefMarital.length > 0) {
    const targetMarital = target.marital_status || '정보 없음';
    if (!target.marital_status || !prefMarital.includes(target.marital_status)) {
      reasons.push({
        key: 'marital',
        title: '결혼상태 불일치',
        ownerPref: prefMarital.join(', '),
        targetValue: targetMarital,
      });
    }
  }

  // 선호 지역 (시/도 기준)
  const prefRegions = Array.isArray(owner.prefer_region) ? owner.prefer_region : [];
  if (prefRegions.length > 0) {
    const targetSido = extractSido(target.residence);
    if (!targetSido || !prefRegions.includes(targetSido)) {
      const targetLabel = targetSido || '정보 없음';
      reasons.push({
        key: 'region',
        title: '지역 불일치',
        ownerPref: prefRegions.join(', '),
        targetValue: targetLabel,
      });
    }
  }

  // 선호 회사 (회사명 기준)
  if (adminCompanyIdNameMap) {
    const prefCompanyNames = Array.isArray(owner.prefer_company)
      ? owner.prefer_company
          .map(id => adminCompanyIdNameMap.get(id))
          .filter(name => !!name)
      : [];
    if (prefCompanyNames.length > 0) {
      const targetCompany = typeof target.company === 'string' ? target.company.trim() : '';
      if (!targetCompany || !prefCompanyNames.includes(targetCompany)) {
        const targetLabel = targetCompany || '정보 없음';
        reasons.push({
          key: 'company',
          title: '회사 불일치',
          ownerPref: prefCompanyNames.join(', '),
          targetValue: targetLabel,
        });
      }
    }
  }

  return reasons;
}

function extractSnapshotPreferences(profile) {
  if (!profile) return null;
  const result = {};
  Object.keys(profile).forEach(key => {
    if (key.startsWith('preferred_')) {
      result[key] = profile[key];
    }
  });
  return Object.keys(result).length ? result : null;
}

function normalizeProfileSnapshots(profileSnapshot, preferenceSnapshot, fallbackProfile = null) {
  const baseProfile = profileSnapshot || (fallbackProfile ? { ...fallbackProfile } : null);
  const prefs = preferenceSnapshot || extractSnapshotPreferences(baseProfile || fallbackProfile);
  // 과거 스냅샷: job_type만 있으면 education 자리에 넣어서 표시용으로 사용
  if (baseProfile && baseProfile.job_type != null && baseProfile.education == null) {
    baseProfile.education = baseProfile.job_type;
  }
  if (prefs && prefs.preferred_job_types != null && prefs.preferred_educations == null) {
    prefs.preferred_educations = prefs.preferred_job_types;
  }
  return {
    profileSnapshot: baseProfile ? { ...baseProfile } : null,
    preferenceSnapshot: prefs ? { ...prefs } : null
  };
}

function composeProfileForMatching(profileSnapshot, preferenceSnapshot) {
  if (!profileSnapshot && !preferenceSnapshot) return null;
  return {
    ...(profileSnapshot || {}),
    ...(preferenceSnapshot || {})
  };
}

function profileMatchesPreference(target, owner) {
  if (!owner) return false;
  const targetBirthYear = target.birth_year;
  const ownerBirthYear = owner.birth_year;

  if (ownerBirthYear && (owner.preferred_age_min != null || owner.preferred_age_max != null)) {
    if (!targetBirthYear) return false;
    const minBirth = ownerBirthYear - (owner.preferred_age_max ?? 0);
    const maxBirth = ownerBirthYear - (owner.preferred_age_min ?? 0);
    if (targetBirthYear < minBirth || targetBirthYear > maxBirth) return false;
  }

  if (owner.preferred_height_min != null) {
    if (typeof target.height !== 'number' || target.height < owner.preferred_height_min) return false;
  }
  if (owner.preferred_height_max != null) {
    if (typeof target.height !== 'number' || target.height > owner.preferred_height_max) return false;
  }

  const prefBodyTypes = ensureArray(owner.preferred_body_types);
  if (prefBodyTypes.length > 0) {
    const targetBodyTypes = ensureArray(target.body_type);
    if (targetBodyTypes.length === 0 || !prefBodyTypes.some(type => targetBodyTypes.includes(type))) {
      return false;
    }
  }

  const prefEducations = ensureArray(owner.preferred_educations);
  if (prefEducations.length > 0) {
    if (!target.education || !prefEducations.includes(target.education)) {
      return false;
    }
  }

  const prefMarital = ensureArray(owner.preferred_marital_statuses);
  if (prefMarital.length > 0) {
    if (!target.marital_status || !prefMarital.includes(target.marital_status)) {
      return false;
    }
  }

  // 선호 지역 (시/도 기준)
  const prefRegions = Array.isArray(owner.prefer_region) ? owner.prefer_region : [];
  if (prefRegions.length > 0) {
    const targetSido = extractSido(target.residence);
    if (!targetSido || !prefRegions.includes(targetSido)) {
      return false;
    }
  }

  // 선호 회사 (회사명 기준)
  if (adminCompanyIdNameMap) {
    const prefCompanyNames = Array.isArray(owner.prefer_company)
      ? owner.prefer_company
          .map(id => adminCompanyIdNameMap.get(id))
          .filter(name => !!name)
      : [];
    if (prefCompanyNames.length > 0) {
      const targetCompany = typeof target.company === 'string' ? target.company.trim() : '';
      if (!targetCompany || !prefCompanyNames.includes(targetCompany)) {
        return false;
      }
    }
  }

  return true;
}

// 매칭 호환성 조회
router.get('/matching-compatibility/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  const { periodId } = req.query;

  if (!periodId) {
    return res.status(400).json({ message: 'periodId 파라미터가 필요합니다.' });
  }

  try {
    await loadAdminCompanyMap();
    const { data: subjectRow, error: subjectError } = await supabase
      .from('matching_applications')
      .select(`
        user_id,
        profile_snapshot,
        preference_snapshot,
        profile:user_profiles(*)
      `)
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .eq('type', 'main')
      .eq('applied', true)
      .eq('cancelled', false)
      .maybeSingle();

    if (subjectError) {
      console.error('[admin][matching-compatibility] 기준 사용자 조회 오류:', subjectError);
      return res.status(500).json({ message: '호환성 정보를 불러오지 못했습니다.' });
    }

    // 해당 회차에 신청 내역이 없으면 "데이터 없음"으로 간주하고 빈 결과 반환
    if (!subjectRow) {
      return res.json({ iPrefer: [], preferMe: [] });
    }

    const { profileSnapshot: subjectProfileSnapshot, preferenceSnapshot: subjectPreferenceSnapshot } =
      normalizeProfileSnapshots(subjectRow.profile_snapshot, subjectRow.preference_snapshot, subjectRow.profile);
    const subjectProfile = composeProfileForMatching(subjectProfileSnapshot, subjectPreferenceSnapshot);

    // 프로필 스냅샷이 없으면 역시 빈 결과로 처리 (에러 대신 데이터 없음)
    if (!subjectProfile) {
      return res.json({ iPrefer: [], preferMe: [] });
    }

    const { data: applicantRows, error: applicantError } = await supabase
      .from('matching_applications')
      .select(`
        user_id,
        profile_snapshot,
        preference_snapshot,
        profile:user_profiles(*),
        user:users(email)
      `)
      .eq('period_id', periodId)
      .eq('type', 'main')
      .eq('applied', true)
      .eq('cancelled', false);

    if (applicantError) {
      throw applicantError;
    }

    const applicants = (applicantRows || []).map(row => {
      const { profileSnapshot, preferenceSnapshot } = normalizeProfileSnapshots(
        row.profile_snapshot,
        row.preference_snapshot,
        row.profile
      );
      return {
        user_id: row.user_id,
        profile: composeProfileForMatching(profileSnapshot, preferenceSnapshot),
        email: row.user?.email || ''
      };
    }).filter(row => row.profile);

    const appliedSet = new Set(applicants.map(row => row.user_id));

    const { data: historyRows, error: historyError } = await supabase
      .from('matching_history')
      .select('male_user_id, female_user_id, period_id')
      .lt('period_id', periodId)
      .or(`male_user_id.eq.${userId},female_user_id.eq.${userId}`);

    if (historyError) {
      throw historyError;
    }
    const historySet = new Set();
    (historyRows || []).forEach(row => {
      const otherId = String(row.male_user_id) === String(userId) ? row.female_user_id : row.male_user_id;
      if (otherId != null) historySet.add(String(otherId));
    });

    const subjectIdStr = String(userId);
    const others = applicants.filter(applicant => String(applicant.user_id) !== subjectIdStr);
    const subjectGender = subjectProfile?.gender || null;

    const makeEntry = (applicant, mutual = false, reasonsFromSubject = [], reasonsFromOther = []) => ({
      user_id: applicant.user_id,
      nickname: applicant.profile.nickname || '(닉네임 없음)',
      email: applicant.email,
      applied: appliedSet.has(applicant.user_id),
      hasHistory: historySet.has(String(applicant.user_id)),
      mutual,
      reasonsFromSubject,
      reasonsFromOther,
    });

    const iPrefer = [];
    const preferMe = [];

    for (const applicant of others) {
      // 성별 필터: 기본적으로 이성만 대상으로 계산 (스냅샷 기반 호환성도 동일 정책 적용)
      const otherGender = applicant.profile?.gender || null;
      if (subjectGender && otherGender && subjectGender === otherGender) {
        continue;
      }

      const fitsMyPreference = profileMatchesPreference(applicant.profile, subjectProfile);
      const iFitTheirPreference = profileMatchesPreference(subjectProfile, applicant.profile);
      const mutual = fitsMyPreference && iFitTheirPreference;

      const reasonsFromSubject = getPreferenceMismatchReasons(applicant.profile, subjectProfile);
      const reasonsFromOther = getPreferenceMismatchReasons(subjectProfile, applicant.profile);

      if (fitsMyPreference) {
        iPrefer.push(makeEntry(applicant, mutual, reasonsFromSubject, reasonsFromOther));
      }
      if (iFitTheirPreference) {
        preferMe.push(makeEntry(applicant, mutual, reasonsFromSubject, reasonsFromOther));
      }
    }

    res.json({
      iPrefer,
      preferMe
    });
  } catch (error) {
    console.error('[matching-compatibility] 오류:', error);
    res.status(500).json({ message: '호환성 정보를 불러오지 못했습니다.' });
  }
});

// 현재 프로필/선호 기준 매칭 호환성 조회 (회차/신청과 무관하게 전체 회원 대상)
router.get('/matching-compatibility-live/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;

  try {
    await loadAdminCompanyMap();
    // 1) 기준 사용자 현재 프로필 조회
    const { data: subjectProfile, error: subjectError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subjectError) {
      console.error('[matching-compatibility-live] 기준 사용자 프로필 조회 오류:', subjectError);
      return res.status(500).json({ message: '기준 사용자 프로필 조회 실패' });
    }

    if (!subjectProfile) {
      return res.status(404).json({ message: '기준 사용자 프로필이 없습니다.' });
    }

    // 2) 다른 모든 사용자 현재 프로필 + 이메일 조회 (탈퇴/비활성/정지 여부에 따라 필터링 가능)
    const { data: otherProfiles, error: othersError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user:users(id, email, is_active, is_banned)
      `)
      .neq('user_id', userId);

    if (othersError) {
      console.error('[matching-compatibility-live] 대상 사용자 프로필 조회 오류:', othersError);
      return res.status(500).json({ message: '대상 사용자 프로필 조회 실패' });
    }

    // 비활성/정지 사용자는 기본적으로 제외 (원하면 조건 조정 가능)
    const applicants = (otherProfiles || [])
      .filter(row => row.user && row.user.is_active !== false && row.user.is_banned !== true)
      .map(row => ({
        user_id: row.user_id,
        profile: row,
        email: row.user?.email || ''
      }));

    // 3) 최신 회차 기준 "신청 여부" 표시 (배지용)
    let appliedSet = new Set();
    const { data: latestLog, error: latestLogError } = await supabase
      .from('matching_log')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestLogError) {
      console.error('[matching-compatibility-live] 최신 회차 조회 오류:', latestLogError);
    } else if (latestLog) {
      const { data: latestApps, error: appsError } = await supabase
        .from('matching_applications')
        .select('user_id')
        .eq('period_id', latestLog.id)
        .eq('type', 'main')
        .eq('applied', true)
        .eq('cancelled', false);

      if (appsError) {
        console.error('[matching-compatibility-live] 신청자 조회 오류:', appsError);
      } else if (latestApps) {
        appliedSet = new Set(latestApps.map(row => row.user_id));
      }
    }

    // 4) 과거 매칭 이력 조회 (해당 사용자와 한 번이라도 매칭된 적 있는지)
    const { data: historyRows, error: historyError } = await supabase
      .from('matching_history')
      .select('male_user_id, female_user_id')
      .or(`male_user_id.eq.${userId},female_user_id.eq.${userId}`);

    if (historyError) {
      console.error('[matching-compatibility-live] 매칭 이력 조회 오류:', historyError);
    }

    const historySet = new Set();
    (historyRows || []).forEach(row => {
      const otherId = String(row.male_user_id) === String(userId) ? row.female_user_id : row.male_user_id;
      if (otherId != null) historySet.add(String(otherId));
    });

    // 5) 기준 사용자와의 호환성 계산 (현재 프로필/선호 기준)
    const subject = subjectProfile;
    const subjectGender = subject?.gender || null;
    const makeEntry = (applicant, mutual = false, reasonsFromSubject = [], reasonsFromOther = []) => ({
      user_id: applicant.user_id,
      nickname: applicant.profile.nickname || '(닉네임 없음)',
      email: applicant.email,
      applied: appliedSet.has(applicant.user_id),
      hasHistory: historySet.has(String(applicant.user_id)),
      mutual,
      reasonsFromSubject,
      reasonsFromOther,
    });

    const iPrefer = [];
    const preferMe = [];

    for (const applicant of applicants) {
      // 성별 필터: 기본적으로 이성만 대상으로 계산
      const otherGender = applicant.profile?.gender || null;
      if (subjectGender && otherGender && subjectGender === otherGender) {
        continue;
      }

      const fitsMyPreference = profileMatchesPreference(applicant.profile, subject);
      const iFitTheirPreference = profileMatchesPreference(subject, applicant.profile);
      const mutual = fitsMyPreference && iFitTheirPreference;

      const reasonsFromSubject = getPreferenceMismatchReasons(applicant.profile, subject);
      const reasonsFromOther = getPreferenceMismatchReasons(subject, applicant.profile);

      if (fitsMyPreference) {
        iPrefer.push(makeEntry(applicant, mutual, reasonsFromSubject, reasonsFromOther));
      }
      if (iFitTheirPreference) {
        preferMe.push(makeEntry(applicant, mutual, reasonsFromSubject, reasonsFromOther));
      }
    }

    res.json({ iPrefer, preferMe });
  } catch (error) {
    console.error('[matching-compatibility-live] 오류:', error);
    res.status(500).json({ message: '호환성 정보를 불러오지 못했습니다.' });
  }
});

// [카테고리 전체 조회]
router.get('/profile-categories', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('profile_categories 조회 오류:', error);
    res.status(500).json({ message: '카테고리 조회 실패' });
  }
});

// [옵션 전체 조회]
router.get('/profile-options', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_options')
      .select('*')
      .order('category_id', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('profile_options 조회 오류:', error);
    res.status(500).json({ message: '옵션 조회 실패' });
  }
});

// [카테고리 일괄 저장]
router.post('/profile-categories/bulk-save', authenticate, async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ message: 'categories 배열 필요' });
    // 삭제: id가 있는 경우만
    const deleteIds = categories.filter(c => c._delete && c.id != null).map(c => c.id);
    if (deleteIds.length > 0) {
      await supabase.from('profile_categories').delete().in('id', deleteIds);
    }
    // upsert: id가 있는 경우만(신규 생성은 id 없이)
    const upsertCats = categories.filter(c => !c._delete && c.id != null).map(c => {
      const { _new, _delete, __typename, ...rest } = c;
      return rest;
    });
    if (upsertCats.length > 0) {
      const { error } = await supabase.from('profile_categories').upsert(upsertCats, { onConflict: 'id' });
      if (error) throw error;
    }
    // id가 없는 신규 카테고리 insert
    const newCats = categories.filter(c => !c._delete && (c.id == null || c._new)).map(c => {
      const { _new, _delete, __typename, id, ...rest } = c;
      return rest;
    });
    if (newCats.length > 0) {
      const { error } = await supabase.from('profile_categories').insert(newCats);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('카테고리 일괄 저장 오류:', error);
    res.status(500).json({ message: '카테고리 저장 실패', error: error?.message || error });
  }
});

// [옵션 일괄 저장]
router.post('/profile-options/bulk-save', authenticate, async (req, res) => {
  try {
    const { options } = req.body;
    if (!Array.isArray(options)) return res.status(400).json({ message: 'options 배열 필요' });

    // 필수 필드 유효성 검사
    for (const o of options) {
      if (!o.category_id || !o.option_text || o.option_text.trim() === '') {
        return res.status(400).json({ message: '옵션에 category_id와 option_text가 모두 필요합니다.', option: o });
      }
    }
    // 삭제: id가 있는 경우만
    const deleteIds = options.filter(o => o._delete && o.id != null).map(o => o.id);
    if (deleteIds.length > 0) {
      await supabase.from('profile_options').delete().in('id', deleteIds);
    }
    // upsert: id가 있는 경우만(신규 생성은 id 없이)
    const upsertOpts = options.filter(o => !o._delete && o.id != null).map(o => {
      const { _new, _delete, __typename, ...rest } = o;
      return rest;
    });
    if (upsertOpts.length > 0) {
      const { error } = await supabase.from('profile_options').upsert(upsertOpts, { onConflict: 'id' });
      if (error) throw error;
    }
    // id가 없는 신규 옵션 insert
    const newOpts = options.filter(o => !o._delete && (o.id == null || o._new)).map(o => {
      const { _new, _delete, __typename, id, ...rest } = o;
      return rest;
    });
    if (newOpts.length > 0) {
      const { error } = await supabase.from('profile_options').insert(newOpts);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('옵션 일괄 저장 오류:', error);
    res.status(500).json({ message: '옵션 저장 실패', error: error?.message || error });
  }
});

// [매칭 신청 현황 조회]
router.get('/matching-applications', authenticate, async (req, res) => {
  try {
    const { periodId } = req.query;
    let query = supabase
      .from('matching_applications')
      .select(`
        *,
        user:users(id,email),
        profile:user_profiles(*)
      `)
      .eq('type', 'main') // 🔹 관리자 신청 현황은 정규 매칭 신청만 대상
      .order('applied_at', { ascending: false });
    if (periodId && periodId !== 'all') {
      query = query.eq('period_id', periodId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[matching_applications] Supabase 쿼리 에러:', error);
      throw error;
    }
    if (!data) return res.json([]); // 데이터 없으면 빈 배열 반환

    const userMap = {};
    data.forEach(row => {
      if (row.user && row.user.id) userMap[row.user.id] = row.user;
    });

    const missingPartnerIds = [...new Set(
      data
        .filter(row => row.partner_user_id && !userMap[row.partner_user_id])
        .map(row => row.partner_user_id)
    )];
    if (missingPartnerIds.length > 0) {
      const { data: partnerUsers } = await supabase
        .from('users')
        .select('id,email')
        .in('id', missingPartnerIds);
      if (partnerUsers && Array.isArray(partnerUsers)) {
        partnerUsers.forEach((u) => { if (u.id) userMap[u.id] = u; });
      }
    }
    data.forEach(row => {
      row.partner = row.partner_user_id ? (userMap[row.partner_user_id] || null) : null;
    });
    const normalizedData = data.map(row => {
      const { profileSnapshot, preferenceSnapshot } = normalizeProfileSnapshots(
        row.profile_snapshot,
        row.preference_snapshot,
        row.profile
      );
      return {
        ...row,
        profile_snapshot: profileSnapshot,
        preference_snapshot: preferenceSnapshot,
        profile: profileSnapshot
      };
    });
    res.json(normalizedData);
  } catch (error) {
    console.error('matching_applications 현황 조회 오류:', error);
    res.status(500).json({ message: '매칭 신청 현황 조회 실패', error: error?.message || error });
  }
});



// [매칭 결과(커플) 리스트 조회]
router.get('/matching-history', authenticate, async (req, res) => {
  try {
    const { periodId, nickname } = req.query;
    // 1. matching_history에서 회차별로 조회 (탈퇴한 사용자도 처리 가능하도록 수정)
    //    기존 "정규 매칭" 관리 페이지이므로 type = 'main' 인 데이터만 조회
    let query = supabase
      .from('matching_history')
      .select(`
        *
      `)
      .eq('type', 'main')
      .order('period_id', { ascending: false });
    if (periodId && periodId !== 'all') {
      query = query.eq('period_id', periodId);
    }
    const { data, error } = await query;
    if (error) throw error;
    // 2. 각 매칭에 대해 사용자 정보 조회 및 처리
    const processedResult = await Promise.all((data || []).map(async (row) => {
      // 남성 사용자 정보 조회
      let maleInfo = null;
      if (row.male_user_id) {
        const { data: maleUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', row.male_user_id)
          .single();
        
        if (maleUser) {
          const { data: maleProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', row.male_user_id)
            .single();
          
          maleInfo = {
            ...maleProfile,
            user: maleUser
          };
        }
      }

      // 여성 사용자 정보 조회
      let femaleInfo = null;
      if (row.female_user_id) {
        const { data: femaleUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', row.female_user_id)
          .single();
        
        if (femaleUser) {
          const { data: femaleProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', row.female_user_id)
            .single();
          
          femaleInfo = {
            ...femaleProfile,
            user: femaleUser
          };
        }
      }

      // 메시지 개수 조회
      let maleMessageCount = 0;
      let femaleMessageCount = 0;
      
      if (row.male_user_id && row.female_user_id) {
        // 남성이 보낸 메시지 개수
        const { count: maleCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', row.male_user_id)
          .eq('receiver_id', row.female_user_id);
        
        // 여성이 보낸 메시지 개수
        const { count: femaleCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', row.female_user_id)
          .eq('receiver_id', row.male_user_id);
        
        maleMessageCount = maleCount || 0;
        femaleMessageCount = femaleCount || 0;
      }

      return {
        ...row,
        male: maleInfo ? {
          ...maleInfo,
          message_count: maleMessageCount
        } : {
          nickname: row.male_nickname || '탈퇴한 사용자',
          user: { id: null, email: row.male_user_email || '탈퇴한 사용자' },
          message_count: 0
        },
        female: femaleInfo ? {
          ...femaleInfo,
          message_count: femaleMessageCount
        } : {
          nickname: row.female_nickname || '탈퇴한 사용자',
          user: { id: null, email: row.female_user_email || '탈퇴한 사용자' },
          message_count: 0
        }
      };
    }));

    // 3. 닉네임 필터링(남/여 중 하나라도 해당 닉네임 포함)
    let result = processedResult;
    if (nickname && nickname.trim() !== '') {
      result = processedResult.filter(row =>
        (row.male && row.male.nickname && row.male.nickname.includes(nickname)) ||
        (row.female && row.female.nickname && row.female.nickname.includes(nickname))
      );
    }
    
    res.json(result);
  } catch (error) {
    console.error('matching_history 조회 오류:', error);
    res.status(500).json({ message: '매칭 결과 조회 실패', error: error?.message || error });
  }
});

// [매칭 결과 발표 이메일 발송]
router.post('/send-matching-result-emails', authenticate, async (req, res) => {
  try {
    const { periodId } = req.body;
    
    if (!periodId) {
      return res.status(400).json({ message: 'periodId가 필요합니다.' });
    }

    console.log(`📧 매칭 결과 이메일 발송 시작 - 회차: ${periodId}`);

    // 해당 회차의 매칭 신청자들 조회
    const { data: applications, error: appError } = await supabase
      .from('matching_applications')
      .select(`
        user_id,
        matched,
        partner_user_id,
        user:users!inner(email)
      `)
      .eq('period_id', periodId)
      .eq('applied', true)
      .eq('cancelled', false);

    if (appError) {
      console.error('매칭 신청자 조회 오류:', appError);
      return res.status(500).json({ message: '매칭 신청자 조회에 실패했습니다.' });
    }

    if (!applications || applications.length === 0) {
      return res.status(404).json({ message: '해당 회차의 매칭 신청자가 없습니다.' });
    }

    let emailSuccessCount = 0;
    let emailFailCount = 0;
    const emailResults = [];

    // 각 신청자에게 이메일 발송
    for (const app of applications) {
      try {
        const isMatched = app.matched === true;
        const partnerInfo = isMatched && app.partner_user_id ? { partnerId: app.partner_user_id } : null;
        
        const result = await sendMatchingResultEmail(app.user.email, isMatched, partnerInfo);
        const ok = (result === true) || (result && result.ok === true);
        
        if (ok) {
          emailSuccessCount++;
          emailResults.push({
            userId: app.user_id,
            email: app.user.email,
            matched: isMatched,
            status: 'success'
          });
        } else {
          const errMsg =
            (result && result.error && result.error.message) ? String(result.error.message) : 'unknown error';
          emailFailCount++;
          emailResults.push({
            userId: app.user_id,
            email: app.user.email,
            matched: isMatched,
            status: 'failed',
            error: errMsg,
          });
        }
      } catch (error) {
        console.error(`이메일 발송 오류 - 사용자: ${app.user_id}`, error);
        emailFailCount++;
        emailResults.push({
          userId: app.user_id,
          email: app.user.email,
          matched: app.matched === true,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`📧 매칭 결과 이메일 발송 완료 - 성공: ${emailSuccessCount}건, 실패: ${emailFailCount}건`);

    res.json({
      success: true,
      message: `매칭 결과 이메일 발송 완료 (성공: ${emailSuccessCount}건, 실패: ${emailFailCount}건)`,
      totalSent: applications.length,
      successCount: emailSuccessCount,
      failCount: emailFailCount,
      results: emailResults
    });

  } catch (error) {
    console.error('매칭 결과 이메일 발송 오류:', error);
    res.status(500).json({ message: '매칭 결과 이메일 발송에 실패했습니다.', error: error.message });
  }
});

// [관리자] 전체 회원 공지 메일 발송
router.post('/broadcast-email', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { subject, content, targets } = req.body || {};

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: '제목과 내용을 모두 입력해주세요.',
      });
    }

    let users = [];

    if (Array.isArray(targets) && targets.length > 0) {
      // 선택된 회원만 대상으로 발송
      const { data, error } = await supabase
        .from('users')
        .select('id, email, is_active, is_verified')
        .in('id', targets);

      if (error) {
        console.error('[admin][broadcast-email] 선택 대상 조회 오류:', error);
        return res.status(500).json({
          success: false,
          message: '발송 대상 조회에 실패했습니다.',
        });
      }
      users = data || [];
    } else {
      // 활성 + 이메일 인증 완료된 회원 전체 대상으로 발송
      const { data, error } = await supabase
        .from('users')
        .select('id, email, is_active, is_verified')
        .eq('is_active', true)
        .eq('is_verified', true);

      if (error) {
        console.error('[admin][broadcast-email] 사용자 목록 조회 오류:', error);
        return res.status(500).json({
          success: false,
          message: '회원 목록 조회에 실패했습니다.',
        });
      }
      users = data || [];
    }

    const targetUsers = users.filter(u => !!u.email && u.is_active && u.is_verified);

    if (!targetUsers.length) {
      return res.status(404).json({
        success: false,
        message: '발송 가능한 회원이 없습니다. (활성 + 이메일 인증 완료된 회원 없음)',
      });
    }

    let successCount = 0;
    let failCount = 0;

    for (const user of targetUsers) {
      const ok = await sendAdminBroadcastEmail(user.email, subject, content);
      if (ok) successCount++;
      else failCount++;
    }

    console.log(`[admin][broadcast-email] 발송 완료 - 전체: ${targetUsers.length}, 성공: ${successCount}, 실패: ${failCount}`);

    return res.json({
      success: true,
      total: targetUsers.length,
      successCount,
      failCount,
      message: `전체 ${targetUsers.length}명 중 ${successCount}명에게 메일을 발송했습니다.`,
    });
  } catch (error) {
    console.error('[admin][broadcast-email] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '전체 메일 발송 중 오류가 발생했습니다.',
    });
  }
});

// [관리자] 전체 메일 발송 대상 조회
router.get('/broadcast-recipients', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        is_active,
        is_verified,
        email_notification_enabled,
        created_at,
        profile:user_profiles(nickname, company)
      `)
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[admin][broadcast-recipients] 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '발송 대상 조회에 실패했습니다.',
      });
    }

    return res.json(data || []);
  } catch (error) {
    console.error('[admin][broadcast-recipients] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '발송 대상 조회 중 오류가 발생했습니다.',
    });
  }
});

// [관리자] 특정 대상에게 알림 보내기 (쪽지형 알림)
router.post('/notifications/send', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { target, notification } = req.body || {};
    const { title, body, linkUrl, meta } = notification || {};

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: '알림 제목과 내용을 모두 입력해주세요.',
      });
    }

    const targetType = target?.type || 'all';
    let userIds = new Set();

    // 1) 대상 사용자 집합 계산
    if (targetType === 'user_ids' && Array.isArray(target.userIds) && target.userIds.length > 0) {
      target.userIds.forEach((id) => {
        if (id) userIds.add(String(id));
      });
    } else if (targetType === 'emails' && Array.isArray(target.emails) && target.emails.length > 0) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, is_active, is_banned')
        .in('email', target.emails);

      if (error) {
        console.error('[admin][notifications/send] 이메일 기반 대상 조회 오류:', error);
        return res.status(500).json({
          success: false,
          message: '알림 발송 대상을 조회하는 중 오류가 발생했습니다.',
        });
      }

      (data || []).forEach((u) => {
        if (u.is_active !== false && u.is_banned !== true && u.id) {
          userIds.add(String(u.id));
        }
      });
    } else if (targetType === 'period_extra_participants' && target.periodId) {
      const periodId = Number(target.periodId);
      if (!Number.isFinite(periodId) || periodId <= 0) {
        return res.status(400).json({
          success: false,
          message: '유효한 회차 ID(periodId)가 필요합니다.',
        });
      }

      // 해당 회차에서 추가 매칭 도전에 참여한 사용자들 (엔트리 등록자 + 호감 보낸 사람)
      const { data: entries, error: entriesError } = await supabase
        .from('extra_matching_entries')
        .select('id, user_id')
        .eq('period_id', periodId);

      if (entriesError) {
        console.error('[admin][notifications/send] extra_matching_entries 조회 오류:', entriesError);
        return res.status(500).json({
          success: false,
          message: '추가 매칭 도전 정보를 조회하는 중 오류가 발생했습니다.',
        });
      }

      const entryIds = (entries || []).map((e) => e.id);
      (entries || []).forEach((e) => {
        if (e.user_id) userIds.add(String(e.user_id));
      });

      if (entryIds.length > 0) {
        const { data: applies, error: appliesError } = await supabase
          .from('extra_matching_applies')
          .select('sender_user_id')
          .in('entry_id', entryIds);

        if (appliesError) {
          console.error('[admin][notifications/send] extra_matching_applies 조회 오류:', appliesError);
          return res.status(500).json({
            success: false,
            message: '추가 매칭 호감 정보를 조회하는 중 오류가 발생했습니다.',
          });
        }

        (applies || []).forEach((a) => {
          if (a.sender_user_id) userIds.add(String(a.sender_user_id));
        });
      }
    } else {
      // 기본: 전체 활성 + 비정지 사용자
      const { data, error } = await supabase
        .from('users')
        .select('id, is_active, is_banned');

      if (error) {
        console.error('[admin][notifications/send] 전체 사용자 조회 오류:', error);
        return res.status(500).json({
          success: false,
          message: '알림 대상 사용자 목록을 조회하는 중 오류가 발생했습니다.',
        });
      }

      (data || []).forEach((u) => {
        if (u.is_active !== false && u.is_banned !== true && u.id) {
          userIds.add(String(u.id));
        }
      });
    }

    const finalIds = Array.from(userIds);

    if (!finalIds.length) {
      return res.status(400).json({
        success: false,
        message: '알림을 보낼 대상 사용자가 없습니다.',
      });
    }

    const payload = {
      type: 'admin',
      title,
      body,
      linkUrl: linkUrl || null,
      meta: meta || null,
    };

    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      finalIds.map(async (uid) => {
        try {
          await notificationRoutes.createNotification(String(uid), payload);
          successCount++;
        } catch (e) {
          console.error('[admin][notifications/send] 알림 생성 오류:', e);
          failCount++;
        }
      }),
    );

    return res.json({
      success: true,
      total: finalIds.length,
      successCount,
      failCount,
      message: `총 ${finalIds.length}명에게 알림을 전송했습니다.`,
    });
  } catch (error) {
    console.error('[admin][notifications/send] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '알림 발송 중 서버 오류가 발생했습니다.',
    });
  }
});

/**
 * [관리자] 이벤트 별 지급 + (선택) 인앱 알림/푸시 발송
 * POST /api/admin/stars/grant
 * body: {
 *   userIds: string[],
 *   amount: number,
 *   notification?: { title: string, body: string, linkUrl?: string | null },
 *   sendPush?: boolean
 * }
 */
router.post('/stars/grant', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userIds, amount, notification, sendPush } = req.body || {};

    const cleanUserIds = Array.from(
      new Set(
        (Array.isArray(userIds) ? userIds : [])
          .map((id) => String(id || '').trim())
          .filter(Boolean),
      ),
    );

    // UUID 형식이 아닌 값이 들어오면 Postgres에서 22P02로 500이 나므로,
    // 여기서 명확히 400으로 차단한다. (프론트/데이터 이상 조기 탐지 목적)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = cleanUserIds.filter((id) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: '대상 회원 ID 형식이 올바르지 않습니다. (UUID 필요)',
        invalidIds: invalidIds.slice(0, 20),
      });
    }

    const numericAmount = Number(amount);
    const intAmount = Number.isFinite(numericAmount) ? Math.floor(numericAmount) : NaN;

    if (!cleanUserIds.length) {
      return res.status(400).json({ success: false, message: '대상 회원(userIds)을 1명 이상 선택해주세요.' });
    }
    if (!Number.isFinite(intAmount) || intAmount <= 0) {
      return res.status(400).json({ success: false, message: '지급할 별 수량(amount)은 1 이상의 정수여야 합니다.' });
    }

    const shouldCreateNotification =
      notification &&
      typeof notification === 'object' &&
      typeof notification.title === 'string' &&
      notification.title.trim().length > 0 &&
      typeof notification.body === 'string' &&
      notification.body.trim().length > 0;

    const notifTitle = shouldCreateNotification ? notification.title.trim() : null;
    const notifBody = shouldCreateNotification ? notification.body.trim() : null;
    const notifLinkUrl = shouldCreateNotification
      ? (typeof notification.linkUrl === 'string' && notification.linkUrl.trim().length > 0 ? notification.linkUrl.trim() : null)
      : null;

    // 대상 사용자 유효성/상태 확인 (비활성/정지/관리자 계정은 기본 제외)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, is_active, is_banned, is_admin')
      .in('id', cleanUserIds);

    if (usersError) {
      console.error('[admin][stars/grant] 대상 사용자 조회 오류:', usersError);
      return res.status(500).json({ success: false, message: '대상 사용자 정보를 조회하는 중 오류가 발생했습니다.' });
    }

    const eligibleIds = (users || [])
      .filter((u) => u && u.id && u.is_active !== false && u.is_banned !== true)
      .map((u) => String(u.id));

    const skippedIds = cleanUserIds.filter((id) => !eligibleIds.includes(String(id)));

    if (!eligibleIds.length) {
      return res.status(400).json({
        success: false,
        message: '지급 가능한 대상이 없습니다. (비활성/정지/관리자 계정은 제외됩니다)',
        requested: cleanUserIds.length,
        eligible: 0,
        skipped: skippedIds,
      });
    }

    const batchId = `admin_star_grant_${Date.now()}`;
    const adminUserId = req.user?.userId || null;

    // 1) 별 지급
    let awardSuccessCount = 0;
    let awardFailCount = 0;
    const awardFailures = [];

    // 과도한 동시 요청 방지를 위해 20개씩 나눠 처리
    const awardChunks = chunkArray(eligibleIds, 20);
    for (const chunk of awardChunks) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        chunk.map(async (uid) => {
          try {
            await awardStarsToUser(uid, intAmount, 'admin_event_reward', {
              batchId,
              adminUserId,
              notification: shouldCreateNotification ? { title: notifTitle, body: notifBody, linkUrl: notifLinkUrl } : null,
            });
            awardSuccessCount++;
          } catch (e) {
            awardFailCount++;
            awardFailures.push({ userId: uid, error: e?.message || String(e) });
          }
        }),
      );
    }

    // 2) 인앱 알림 생성 (선택)
    let notifSuccessCount = 0;
    let notifFailCount = 0;
    if (shouldCreateNotification) {
      const notifPayload = {
        type: 'admin',
        title: notifTitle,
        body: notifBody,
        linkUrl: notifLinkUrl,
        meta: { kind: 'star_reward', amount: intAmount, batchId },
      };

      const notifChunks = chunkArray(eligibleIds, 50);
      for (const chunk of notifChunks) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(
          chunk.map(async (uid) => {
            try {
              await notificationRoutes.createNotification(String(uid), notifPayload);
              notifSuccessCount++;
            } catch (e) {
              notifFailCount++;
            }
          }),
        );
      }
    }

    // 3) 푸시 발송 (선택: 알림 메시지가 있을 때만 의미있도록 설계)
    let pushTokenCount = 0;
    let pushSent = 0;
    let pushFailed = 0;

    const shouldSendPush = !!sendPush && shouldCreateNotification;
    if (shouldSendPush) {
      const { data: tokenRows, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('token')
        .in('user_id', eligibleIds);

      if (tokenError) {
        console.error('[admin][stars/grant] 푸시 토큰 조회 오류:', tokenError);
      } else {
        const tokens = (tokenRows || []).map((r) => r.token).filter(Boolean);
        pushTokenCount = tokens.length;

        if (tokens.length > 0) {
          const messaging = getMessaging();
          const tokenChunks = chunkArray(tokens, 500); // FCM multicast max 500

          for (const chunk of tokenChunks) {
            // eslint-disable-next-line no-await-in-loop
            const resp = await messaging.sendEachForMulticast({
              tokens: chunk,
              notification: {
                title: notifTitle,
                body: notifBody,
              },
              data: {
                type: 'admin',
                kind: 'star_reward',
                title: notifTitle,
                body: notifBody,
                amount: String(intAmount),
                batchId,
              },
            });
            pushSent += resp.successCount || 0;
            pushFailed += resp.failureCount || 0;
          }
        }
      }
    }

    return res.json({
      success: true,
      requested: cleanUserIds.length,
      eligible: eligibleIds.length,
      skipped: skippedIds,
      amount: intAmount,
      totalStarsAttempted: eligibleIds.length * intAmount,
      awards: {
        successCount: awardSuccessCount,
        failCount: awardFailCount,
        failures: awardFailures.slice(0, 50), // 과도한 payload 방지
      },
      notifications: shouldCreateNotification
        ? { enabled: true, successCount: notifSuccessCount, failCount: notifFailCount }
        : { enabled: false },
      push: shouldSendPush
        ? { enabled: true, tokenCount: pushTokenCount, sent: pushSent, failed: pushFailed }
        : { enabled: false },
      batchId,
      message: `선택된 ${eligibleIds.length}명에게 ⭐ ${intAmount} 지급 처리했습니다.`,
    });
  } catch (error) {
    console.error('[admin][stars/grant] 오류:', error);
    return res.status(500).json({ success: false, message: '별 지급 처리 중 서버 오류가 발생했습니다.' });
  }
});

// [수동] users 테이블 매칭 상태 초기화 (관리자용)
router.post('/reset-users-matching-status', authenticate, async (req, res) => {
  try {
    console.log('[관리자] users 테이블 매칭 상태 수동 초기화 시작');
    
    const { data, error } = await supabase
      .from('users')
      .update({ is_applied: false, is_matched: null })
      .not('id', 'is', null);
    
    if (error) {
      console.error('[관리자] users 테이블 초기화 오류:', error);
      return res.status(500).json({ message: '초기화에 실패했습니다.', error: error.message });
    }
    
    console.log('[관리자] users 테이블 매칭 상태 수동 초기화 완료');
    res.json({ 
      success: true, 
      message: '모든 사용자의 매칭 상태가 초기화되었습니다.' 
    });
  } catch (error) {
    console.error('[관리자] users 테이블 초기화 오류:', error);
    res.status(500).json({ message: '초기화에 실패했습니다.', error: error.message });
  }
});

// [관리자] 추가 매칭 도전 회차 요약 조회
router.get('/extra-matching/periods', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { data: logs, error } = await supabase
      .from('matching_log')
      .select('id, status, application_start, application_end, matching_announce, finish')
      .order('id', { ascending: true });

    if (error) {
      console.error('[admin][extra-matching/periods] matching_log 조회 오류:', error);
      return res.status(500).json({ success: false, message: '회차 정보를 불러오는데 실패했습니다.' });
    }

    if (!logs || logs.length === 0) {
      return res.json([]);
    }

    const periods = [];

    for (const log of logs) {
      const { data: entryRows, error: entryError } = await supabase
        .from('extra_matching_entries')
        .select('id')
        .eq('period_id', log.id);

      if (entryError) {
        console.error('[admin][extra-matching/periods] entries 조회 오류:', entryError);
        return res.status(500).json({ success: false, message: '추가 매칭 도전 데이터를 불러오는데 실패했습니다.' });
      }

      const entryIds = (entryRows || []).map((e) => e.id);
      let applyRows = [];

      if (entryIds.length > 0) {
        const { data: applies, error: appliesError } = await supabase
          .from('extra_matching_applies')
          .select('id, status, entry_id')
          .in('entry_id', entryIds);

        if (appliesError) {
          console.error('[admin][extra-matching/periods] applies 조회 오류:', appliesError);
          return res.status(500).json({ success: false, message: '추가 매칭 호감 데이터를 불러오는데 실패했습니다.' });
        }
        applyRows = applies || [];
      }

      const totalEntries = entryIds.length;
      const totalApplies = applyRows.length;
      const acceptedCount = applyRows.filter((a) => a.status === 'accepted').length;

      periods.push({
        id: log.id,
        status: log.status,
        application_start: log.application_start,
        application_end: log.application_end,
        matching_announce: log.matching_announce,
        finish: log.finish,
        extraEntryCount: totalEntries,
        extraApplyCount: totalApplies,
        extraMatchedCount: acceptedCount,
      });
    }

    return res.json(periods);
  } catch (error) {
    console.error('[admin][extra-matching/periods] 오류:', error);
    return res.status(500).json({ success: false, message: '추가 매칭 회차 요약 조회 중 오류가 발생했습니다.' });
  }
});

// [관리자] 특정 회차의 추가 매칭 도전 엔트리 목록 + 요약
router.get('/extra-matching/period/:periodId/entries', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const periodId = Number(req.params.periodId);
    if (!Number.isFinite(periodId) || periodId <= 0) {
      return res.status(400).json({ success: false, message: '유효한 회차 ID가 필요합니다.' });
    }

    const { data: entries, error: entriesError } = await supabase
      .from('extra_matching_entries')
      .select('id, user_id, gender, status, created_at, profile_snapshot')
      .eq('period_id', periodId)
      .order('created_at', { ascending: true });

    if (entriesError) {
      console.error('[admin][extra-matching/period/:periodId/entries] entries 조회 오류:', entriesError);
      return res.status(500).json({ success: false, message: '추가 매칭 도전 엔트리를 불러오는데 실패했습니다.' });
    }

    if (!entries || entries.length === 0) {
      return res.json([]);
    }

    const userIds = Array.from(new Set(entries.map((e) => e.user_id).filter(Boolean)));

    let profilesByUserId = {};
    let emailsByUserId = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, nickname, company, education, birth_year')
        .in('user_id', userIds);

      if (profileError) {
        console.error('[admin][extra-matching/period/:periodId/entries] 프로필 조회 오류:', profileError);
      } else {
        profilesByUserId = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }

      // 이메일 조회
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (usersError) {
        console.error('[admin][extra-matching/period/:periodId/entries] 이메일 조회 오류:', usersError);
      } else {
        emailsByUserId = (users || []).reduce((acc, u) => {
          acc[u.id] = u.email;
          return acc;
        }, {});
      }
    }

    const entryIds = entries.map((e) => e.id);
    const { data: applies, error: appliesError } = await supabase
      .from('extra_matching_applies')
      .select('id, entry_id, status')
      .in('entry_id', entryIds);

    if (appliesError) {
      console.error('[admin][extra-matching/period/:periodId/entries] applies 조회 오류:', appliesError);
      return res.status(500).json({ success: false, message: '추가 매칭 호감 데이터를 불러오는데 실패했습니다.' });
    }

    const applyByEntryId = {};
    (applies || []).forEach((a) => {
      if (!applyByEntryId[a.entry_id]) {
        applyByEntryId[a.entry_id] = [];
      }
      applyByEntryId[a.entry_id].push(a);
    });

    const mapped = entries.map((e) => {
      const p = profilesByUserId[e.user_id] || {};
      const list = applyByEntryId[e.id] || [];
      const totalApplies = list.length;
      const pendingApplies = list.filter((a) => a.status === 'pending').length;
      const acceptedApplies = list.filter((a) => a.status === 'accepted').length;
      const rejectedApplies = list.filter((a) => a.status === 'rejected').length;

      return {
        id: e.id,
        user_id: e.user_id,
        email: emailsByUserId[e.user_id] || null,
        gender: e.gender,
        status: e.status,
        created_at: e.created_at,
        profile: {
          nickname: p.nickname || null,
          company: p.company || null,
          education: p.education || null,
          birth_year: p.birth_year || null,
        },
        stats: {
          totalApplies,
          pendingApplies,
          acceptedApplies,
          rejectedApplies,
        },
      };
    });

    return res.json(mapped);
  } catch (error) {
    console.error('[admin][extra-matching/period/:periodId/entries] 오류:', error);
    return res.status(500).json({ success: false, message: '추가 매칭 도전 엔트리 조회 중 오류가 발생했습니다.' });
  }
});

// [관리자] 특정 엔트리에 대한 호감 리스트 조회
router.get('/extra-matching/entry/:entryId/applies', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const entryId = Number(req.params.entryId);
    console.log('[admin][extra-matching] 호감 내역 조회 시작, entryId:', entryId);
    
    if (!Number.isFinite(entryId) || entryId <= 0) {
      console.log('[admin][extra-matching] 유효하지 않은 entryId:', entryId);
      return res.status(400).json({ success: false, message: '유효한 엔트리 ID가 필요합니다.' });
    }

    const { data: applies, error: appliesError } = await supabase
      .from('extra_matching_applies')
      .select('id, sender_user_id, status, created_at, used_star_amount, refunded_star_amount')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true });

    if (appliesError) {
      console.error('[admin][extra-matching/entry/:entryId/applies] applies 조회 오류:', appliesError);
      console.error('[admin][extra-matching/entry/:entryId/applies] appliesError 상세:', JSON.stringify(appliesError));
      return res.status(500).json({ success: false, message: '호감 내역을 불러오는데 실패했습니다.', error: appliesError.message });
    }
    
    console.log('[admin][extra-matching] applies 조회 성공, 개수:', applies?.length || 0);

    if (!applies || applies.length === 0) {
      return res.json([]);
    }

    const senderIds = Array.from(new Set(applies.map((a) => a.sender_user_id).filter(Boolean)));

    let profilesByUserId = {};
    let emailsByUserId = {};
    if (senderIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, nickname, gender, company, education, birth_year')
        .in('user_id', senderIds);

      if (profileError) {
        console.error('[admin][extra-matching/entry/:entryId/applies] 프로필 조회 오류:', profileError);
      } else {
        profilesByUserId = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }

      // 이메일 조회
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', senderIds);

      if (usersError) {
        console.error('[admin][extra-matching/entry/:entryId/applies] 이메일 조회 오류:', usersError);
      } else {
        emailsByUserId = (users || []).reduce((acc, u) => {
          acc[u.id] = u.email;
          return acc;
        }, {});
      }
    }

    const mapped = applies.map((a) => {
      const p = profilesByUserId[a.sender_user_id] || {};
      const refunded =
        typeof a.refunded_star_amount === 'number' && a.refunded_star_amount > 0;

      return {
        id: a.id,
        sender_user_id: a.sender_user_id,
        email: emailsByUserId[a.sender_user_id] || null,
        status: a.status,
        created_at: a.created_at,
        used_star_amount: a.used_star_amount ?? null,
        refunded_star_amount: a.refunded_star_amount ?? null,
        refunded,
        profile: {
          nickname: p.nickname || null,
          gender: p.gender || null,
          company: p.company || null,
          education: p.education || null,
          birth_year: p.birth_year || null,
        },
      };
    });

    return res.json(mapped);
  } catch (error) {
    console.error('[admin][extra-matching/entry/:entryId/applies] 오류:', error);
    return res.status(500).json({ success: false, message: '추가 매칭 호감 내역 조회 중 오류가 발생했습니다.' });
  }
});

// [신고 관리] 모든 신고 목록 조회
router.get('/reports', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reports')
      .select(`
        *,
        period:matching_log(id, application_start, application_end)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('신고 목록 조회 오류:', error);
      return res.status(500).json({ message: '신고 목록 조회에 실패했습니다.' });
    }

    // 탈퇴한 사용자 처리를 위해 이메일 정보 사용
    const reportsWithUserInfo = await Promise.all(
      data.map(async (report) => {
        // 신고자 정보 조회 (탈퇴하지 않은 경우만)
        let reporterInfo = null;
        if (report.reporter_id) {
          const { data: reporterData } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', report.reporter_id)
            .single();
          
          if (reporterData) {
            const { data: reporterProfile } = await supabase
              .from('user_profiles')
              .select('nickname')
              .eq('user_id', report.reporter_id)
              .single();
            
            reporterInfo = {
              id: reporterData.id,
              email: reporterData.email,
              nickname: reporterProfile?.nickname
            };
          }
        }

        // 신고받은 사용자 정보 조회 (탈퇴하지 않은 경우만)
        let reportedUserInfo = null;
        if (report.reported_user_id) {
          const { data: reportedUserData } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', report.reported_user_id)
            .single();
          
          if (reportedUserData) {
            const { data: reportedUserProfile } = await supabase
              .from('user_profiles')
              .select('nickname')
              .eq('user_id', report.reported_user_id)
              .single();
            
            reportedUserInfo = {
              id: reportedUserData.id,
              email: reportedUserData.email,
              nickname: reportedUserProfile?.nickname
            };
          }
        }

        // 처리자 정보 조회 (탈퇴하지 않은 경우만)
        let resolverInfo = null;
        if (report.resolved_by) {
          const { data: resolverData } = await supabase
            .from('users')
            .select('email')
            .eq('id', report.resolved_by)
            .single();
          resolverInfo = resolverData;
        }

        return {
          ...report,
          reporter: reporterInfo || {
            id: null,
            email: report.reporter_email || '탈퇴한 사용자',
            nickname: '탈퇴한 사용자'
          },
          reported_user: reportedUserInfo || {
            id: null,
            email: report.reported_user_email || '탈퇴한 사용자',
            nickname: '탈퇴한 사용자'
          },
          resolver: resolverInfo
        };
      })
    );

    res.json({
      success: true,
      data: reportsWithUserInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0
      }
    });

  } catch (error) {
    console.error('신고 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 신고 상세 조회
router.get('/reports/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:users!reporter_id(id, email),
        reported_user:users!reported_user_id(id, email),
        period:matching_log(id, application_start, application_end, finish),
        resolver:users!resolved_by(email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('신고 상세 조회 오류:', error);
      return res.status(500).json({ message: '신고 상세 조회에 실패했습니다.' });
    }

    if (!data) {
      return res.status(404).json({ message: '신고 내역을 찾을 수 없습니다.' });
    }

    // 닉네임 정보 추가
    let reporterNickname = null;
    let reportedUserNickname = null;
    let reporterGender = null;
    let reportedUserGender = null;

    if (data.reporter) {
      const { data: reporterProfile } = await supabase
        .from('user_profiles')
        .select('nickname, gender')
        .eq('user_id', data.reporter.id)
        .single();
      reporterNickname = reporterProfile?.nickname;
      reporterGender = reporterProfile?.gender;
    }

    if (data.reported_user) {
      const { data: reportedUserProfile } = await supabase
        .from('user_profiles')
        .select('nickname, gender')
        .eq('user_id', data.reported_user.id)
        .single();
      reportedUserNickname = reportedUserProfile?.nickname;
      reportedUserGender = reportedUserProfile?.gender;
    }

    const reportWithNicknames = {
      ...data,
      reporter: data.reporter ? {
        ...data.reporter,
        nickname: reporterNickname,
        gender: reporterGender
      } : null,
      reported_user: data.reported_user ? {
        ...data.reported_user,
        nickname: reportedUserNickname,
        gender: reportedUserGender
      } : null
    };

    res.json({
      success: true,
      data: reportWithNicknames
    });

  } catch (error) {
    console.error('신고 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 신고 처리 (신고 횟수 기반 정지 시스템)
router.put('/reports/:id/process', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, ban_duration_days } = req.body;

    // 정지 처리 시 banned_until 계산
    let bannedUntil = null;
    if (status === 'temporary_ban') {
      const duration = ban_duration_days || 30;
      bannedUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();
    } else if (status === 'permanent_ban') {
      bannedUntil = null; // 영구정지는 null
    }
    
    // 신고 상태 업데이트 (banned_until 정보 포함)
    const updateData = {
      status,
      admin_notes,
      resolved_at: new Date().toISOString(),
      resolved_by: req.user?.userId || req.user?.id || null,
      banned_until: bannedUntil // 정지 종료 시점 저장
    };

    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (reportError) {
      console.error('신고 처리 오류:', reportError);
      return res.status(500).json({ message: '신고 처리에 실패했습니다.' });
    }

    // 사용자 정지 상태 업데이트
    let banUpdateData = {};
    
    if (status === 'temporary_ban' || status === 'permanent_ban') {
      // 정지 처리 - reports 테이블에 저장된 banned_until 값과 동일하게 설정
      banUpdateData = {
        is_banned: true,
        banned_until: bannedUntil // reports 테이블과 동일한 값 사용
      };
    } else if (status === 'rejected' || status === 'dismissed' || status === 'no_action') {
      // 정지 해제 (기각, 기각, 조치없음)
      banUpdateData = {
        is_banned: false,
        banned_until: null
      };
    }

    // 사용자 상태 업데이트가 필요한 경우 (탈퇴한 사용자 제외)
    if (Object.keys(banUpdateData).length > 0 && reportData.reported_user_id) {
      // 해당 사용자의 현재 처리된 신고 개수 계산 (이메일 기준)
      const { data: reportCountData, error: countError } = await supabase
        .from('reports')
        .select('id')
        .eq('reported_user_email', reportData.reported_user_email)
        .in('status', ['temporary_ban', 'permanent_ban']);

      const reportCount = reportCountData ? reportCountData.length : 0;

      // 정지 상태와 신고 횟수를 함께 업데이트
      const finalUpdateData = {
        ...banUpdateData,
        report_count: reportCount
      };

      const { error: banError } = await supabase
        .from('users')
        .update(finalUpdateData)
        .eq('id', reportData.reported_user_id);

      if (banError) {
        console.error('사용자 정지 상태 업데이트 오류:', banError);
        return res.status(500).json({ message: '사용자 상태 업데이트에 실패했습니다.' });
      }

      // 정지 처리 시 모든 Refresh Token 무효화
      if (status === 'temporary_ban' || status === 'permanent_ban') {
        try {
          const { error: tokenError } = await supabase
            .from('refresh_tokens')
            .update({ revoked_at: new Date().toISOString() })
            .eq('user_id', reportData.reported_user_id)
            .is('revoked_at', null);
          if (tokenError) {
            console.error('[신고처리] 정지 처리 - Refresh Token 무효화 오류:', tokenError);
          } else {
            console.log(`[신고처리] 정지 처리 - 사용자 ${reportData.reported_user_id}의 모든 Refresh Token 무효화 완료`);
          }
        } catch (tokenErr) {
          console.error('[신고처리] 정지 처리 - 토큰 무효화 처리 중 오류:', tokenErr);
        }
      }
      
      console.log(`[신고처리] 사용자 상태 업데이트 완료: ${reportData.reported_user_id} (${status}, 신고횟수: ${reportCount})`);
    } else if (!reportData.reported_user_id) {
      console.log(`[신고처리] 탈퇴한 사용자에 대한 신고 처리 완료: ${reportData.reported_user_email} (${status})`);
    }

    // 정지 처리된 경우 해당 이메일의 모든 신고 이력 업데이트
    if (status === 'temporary_ban' || status === 'permanent_ban') {
      const reportedUserEmail = reportData.reported_user_email;
      
      if (reportedUserEmail) {
        // 해당 이메일로 된 모든 신고를 동일한 상태로 업데이트
        const { error: emailReportsError } = await supabase
          .from('reports')
          .update({
            status: status,
            resolved_at: new Date().toISOString(),
            resolved_by: req.user?.userId || req.user?.id || null,
            admin_notes: `이메일 기반 일괄 처리: ${reportData.reported_user_email}`
          })
          .eq('reported_user_email', reportedUserEmail)
          .neq('status', status); // 이미 같은 상태가 아닌 것만

        if (emailReportsError) {
          console.error('이메일 기반 신고 일괄 처리 오류:', emailReportsError);
        } else {
          console.log(`[신고처리] 이메일 기반 일괄 처리 완료: ${reportedUserEmail} (${status})`);
        }
      }
    }

    res.json({
      success: true,
      message: '신고가 성공적으로 처리되었습니다.',
      data: reportData
    });

  } catch (error) {
    console.error('신고 처리 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 사용자별 신고 정보 조회
router.get('/users/:userId/report-info', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, email, report_count, is_banned, banned_until')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('사용자 신고 정보 조회 오류:', error);
      return res.status(500).json({ message: '사용자 신고 정보 조회에 실패했습니다.' });
    }

    if (!data) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('사용자 신고 정보 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 사용자 신고 정보 수동 조정
router.put('/users/:userId/report-info', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { report_count, is_banned, banned_until, reason } = req.body;

    const updateData = {};
    if (report_count !== undefined) updateData.report_count = report_count;
    if (is_banned !== undefined) updateData.is_banned = is_banned;
    if (banned_until !== undefined) updateData.banned_until = banned_until;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('사용자 신고 정보 조정 오류:', error);
      return res.status(500).json({ message: '신고 정보 조정에 실패했습니다.' });
    }

    // 정지 처리 시 모든 Refresh Token 무효화
    if (is_banned === true) {
      try {
        const { error: tokenError } = await supabase
          .from('refresh_tokens')
          .update({ revoked_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('revoked_at', null);
        if (tokenError) {
          console.error('[관리자] 신고 정보 조정 - Refresh Token 무효화 오류:', tokenError);
        } else {
          console.log(`[관리자] 신고 정보 조정 - 사용자 ${userId}의 모든 Refresh Token 무효화 완료`);
        }
      } catch (tokenErr) {
        console.error('[관리자] 신고 정보 조정 - 토큰 무효화 처리 중 오류:', tokenErr);
      }
    }

    res.json({
      success: true,
      message: '신고 정보가 성공적으로 조정되었습니다.',
      data
    });

  } catch (error) {
    console.error('사용자 신고 정보 조정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ==============================
// 회사(Companies) 관리 API
// ==============================

// 회사 목록 조회 (관리자 전용, 활성/비활성 모두)
router.get('/companies', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { data, error } = await supabase
      .from('companies')
      .select('id, name, email_domains, is_active, created_at')
      .order('id', { ascending: true });

    if (error) {
      console.error('[admin][companies] 목록 조회 오류:', error);
      return res.status(500).json({ success: false, message: '회사 목록을 불러오지 못했습니다.' });
    }

    const companies = (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      emailDomains: Array.isArray(c.email_domains) ? c.email_domains : [],
      isActive: !!c.is_active,
      createdAt: c.created_at,
    }));

    return res.json({ success: true, data: companies });
  } catch (error) {
    console.error('[admin][companies] 목록 조회 예외:', error);
    return res.status(500).json({ success: false, message: '회사 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 회사 생성
router.post('/companies', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { name, emailDomains, isActive, createNotice, sendNotification, sendPush, applyPreferCompany, sendEmail, emailRecipient, emailSubject, emailContent } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: '회사명을 입력해주세요.' });
    }

    const trimmedName = String(name).trim();
    const domains = Array.isArray(emailDomains)
      ? emailDomains.map((d) => String(d).trim().toLowerCase()).filter((d) => d.length > 0)
      : [];

    // id를 companies 테이블 전체 개수 + 1 로 설정 (넘버링 정렬용)
    let nextId = null;
    try {
      const { count, error: countError } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true });
      if (countError) {
        console.error('[admin][companies] 회사 개수 조회 오류:', countError);
      } else if (typeof count === 'number') {
        nextId = count + 1;
      }
    } catch (e) {
      console.error('[admin][companies] 회사 개수 조회 예외:', e);
    }

    const payload = {
      ...(nextId != null ? { id: nextId } : {}),
      name: trimmedName,
      email_domains: domains,
      is_active: !!isActive,
    };

    const { data, error } = await supabase
      .from('companies')
      .insert([payload])
      .select('id, name, email_domains, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin][companies] 생성 오류:', error);
      return res.status(500).json({ success: false, message: '회사 생성 중 오류가 발생했습니다.' });
    }

    // 회사 목록 캐시 초기화 (선호 회사 필터링용)
    adminCompanyIdNameMap = null;

    const createdCompanyId = data.id;

    // 옵션: 전체 회원의 선호 회사에 바로 추가
    if (applyPreferCompany && createdCompanyId) {
      try {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, prefer_company');

        if (profileError) {
          console.error('[admin][companies] 선호 회사 자동 추가 - 프로필 조회 오류:', profileError);
        } else {
          const updates = [];
          for (const row of profiles || []) {
            const existing = Array.isArray(row.prefer_company) ? row.prefer_company.filter((n) => Number.isInteger(n)) : [];
            if (!existing.includes(createdCompanyId)) {
              updates.push({
                user_id: row.user_id,
                prefer_company: [...existing, createdCompanyId],
              });
            }
          }

          if (updates.length > 0) {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .upsert(updates, { onConflict: 'user_id' });

            if (updateError) {
              console.error('[admin][companies] 선호 회사 자동 추가 - 업데이트 오류:', updateError);
            } else {
              console.log(`[admin][companies] 선호 회사 자동 추가 완료: ${updates.length}명`);
            }
          }
        }
      } catch (e) {
        console.error('[admin][companies] 선호 회사 자동 추가 예외:', e);
      }
    }

    // 옵션: 회사 추가 안내 공지사항 자동 등록
    let noticeId = null;
    if (createNotice) {
      try {
        const noticeTitle = `회사추가안내 (${trimmedName})`;
        const noticeContentLines = [
          '안녕하세요 직쏠공입니다.',
          '',
          '신규 회사가 추가 확장되어 안내드립니다.',
          '',
          `- 회사명 : ${trimmedName}`,
          '',
          '신규 회사 추가 관계로 각 회원님의 선호스타일 페이지에서',
          '선호 회사리스트에 자동으로 위 회사가 추가 됩니다.',
          '',
          '확인 후 매칭신청 전 개별 조정 바랍니다.',
          '',
          '',
          '감사합니다 :)',
        ];

        // notice 테이블의 다음 ID 조회 (ID 중복 방지)
        let nextNoticeId = null;
        try {
          const { count, error: countError } = await supabase
            .from('notice')
            .select('id', { count: 'exact', head: true });
          if (countError) {
            console.error('[admin][companies] 공지사항 개수 조회 오류:', countError);
          } else if (typeof count === 'number') {
            nextNoticeId = count + 1;
          }
        } catch (e) {
          console.error('[admin][companies] 공지사항 개수 조회 예외:', e);
        }

        const noticePayload = {
          ...(nextNoticeId != null ? { id: nextNoticeId } : {}),
          title: noticeTitle,
          content: noticeContentLines.join('\n'),
          author: '관리자',
          is_important: false,
          view_count: 0,
        };

        const { data: noticeData, error: noticeError } = await supabase
          .from('notice')
          .insert([noticePayload])
          .select('id')
          .single();

        if (noticeError) {
          console.error('[admin][companies] 회사 추가 공지사항 생성 오류:', noticeError);
        } else if (noticeData && noticeData.id != null) {
          noticeId = noticeData.id;
          console.log(`[admin][companies] 회사 추가 공지사항 생성 완료: ID=${noticeId}, 제목="${noticeTitle}"`);

          // 옵션: 알림 메시지 및 푸시 알림 발송
          if (sendNotification || sendPush) {
            try {
              const { data: activeUsers, error: usersError } = await supabase
                .from('users')
                .select('id, is_active, is_banned')
                .order('created_at', { ascending: false });

              if (usersError) {
                console.error('[admin][companies] 공지 알림용 사용자 조회 오류:', usersError);
              } else if (activeUsers && activeUsers.length > 0) {
                const targets = activeUsers.filter(
                  (u) => u.is_active !== false && u.is_banned !== true && u.id,
                );

                // 알림 메시지 생성
                if (sendNotification) {
                  const payload = {
                    type: 'notice',
                    title: '[공지] 새 공지사항이 등록되었습니다',
                    body: `새 공지사항 "${noticeTitle}" 이(가) 등록되었습니다.\n메인 페이지 또는 공지사항 메뉴에서 자세한 내용을 확인해 주세요.`,
                    linkUrl: `/notice/${noticeId}`,
                    meta: { notice_id: noticeId },
                  };
                  
                  await Promise.all(
                    targets.map((u) =>
                      notificationRoutes
                        .createNotification(String(u.id), payload)
                        .catch((e) => console.error('[admin][companies] 공지 알림 생성 오류:', e)),
                    ),
                  );
                  console.log(`[admin][companies] 공지 알림 메시지 발송 완료: ${targets.length}명`);
                }

                // 푸시 알림 발송
                if (sendPush) {
                  try {
                    await sendPushToAllUsers({
                      type: 'notice',
                      title: '[직쏠공]',
                      body: '새 공지사항이 등록되었습니다.',
                    });
                    console.log('[admin][companies] 공지 푸시 알림 발송 완료');
                  } catch (pushErr) {
                    console.error('[admin][companies] 공지 푸시 알림 발송 오류:', pushErr);
                  }
                }
              }
            } catch (e) {
              console.error('[admin][companies] 공지 알림/푸시 처리 중 예외:', e);
            }
          }
        }
      } catch (e) {
        console.error('[admin][companies] 회사 추가 공지사항 생성 예외:', e);
      }
    }

    // 옵션: 신규 회사 추가 알림 메일 발송
    if (sendEmail && emailRecipient && emailSubject && emailContent) {
      try {
        const emailResult = await sendNewCompanyNotificationEmail(
          emailRecipient,
          trimmedName,
          domains,
          emailSubject,
          emailContent
        );
        
        if (emailResult.success) {
          console.log(`[admin][companies] 신규 회사 추가 알림 메일 발송 완료: ${emailRecipient}`);
        } else {
          console.error(`[admin][companies] 신규 회사 추가 알림 메일 발송 실패: ${emailRecipient}`, emailResult.error);
        }
      } catch (e) {
        console.error('[admin][companies] 신규 회사 추가 알림 메일 발송 예외:', e);
      }
    }

    return res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        emailDomains: Array.isArray(data.email_domains) ? data.email_domains : [],
        isActive: !!data.is_active,
        createdAt: data.created_at,
      },
      noticeId,
    });
  } catch (error) {
    console.error('[admin][companies] 생성 예외:', error);
    return res.status(500).json({ success: false, message: '회사 생성 중 오류가 발생했습니다.' });
  }
});

// 회사 수정
router.put('/companies/:id', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const { name, emailDomains, isActive } = req.body || {};

    const update = {};
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: '회사명을 입력해주세요.' });
      }
      update.name = trimmedName;
    }
    if (emailDomains !== undefined) {
      const domains = Array.isArray(emailDomains)
        ? emailDomains.map((d) => String(d).trim().toLowerCase()).filter((d) => d.length > 0)
        : [];
      update.email_domains = domains;
    }
    if (isActive !== undefined) {
      update.is_active = !!isActive;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: '변경할 값이 없습니다.' });
    }

    const { data, error } = await supabase
      .from('companies')
      .update(update)
      .eq('id', id)
      .select('id, name, email_domains, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin][companies] 수정 오류:', error);
      return res.status(500).json({ success: false, message: '회사 수정 중 오류가 발생했습니다.' });
    }

    adminCompanyIdNameMap = null;

    return res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        emailDomains: Array.isArray(data.email_domains) ? data.email_domains : [],
        isActive: !!data.is_active,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error('[admin][companies] 수정 예외:', error);
    return res.status(500).json({ success: false, message: '회사 수정 중 오류가 발생했습니다.' });
  }
});

// 회사 삭제
router.delete('/companies/:id', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[admin][companies] 삭제 오류:', error);
      return res.status(500).json({ success: false, message: '회사 삭제 중 오류가 발생했습니다.' });
    }

    adminCompanyIdNameMap = null;

    return res.json({ success: true, message: '회사가 삭제되었습니다.' });
  } catch (error) {
    console.error('[admin][companies] 삭제 예외:', error);
    return res.status(500).json({ success: false, message: '회사 삭제 중 오류가 발생했습니다.' });
  }
});

// 선택한 회사들을 모든 회원의 선호 회사(prefer_company)에 일괄 추가
router.post('/companies/apply-prefer-company', authenticate, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { companyIds } = req.body || {};

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({ success: false, message: '적용할 회사 ID 목록을 전달해주세요.' });
    }

    const cleanIds = Array.from(
      new Set(
        companyIds
          .map((id) => Number(id))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    );

    if (cleanIds.length === 0) {
      return res.status(400).json({ success: false, message: '유효한 회사 ID가 없습니다.' });
    }

    // 실제 존재하는 회사만 필터링
    const { data: validCompanies, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .in('id', cleanIds);

    if (companyError) {
      console.error('[admin][companies][apply-prefer-company] 회사 검증 오류:', companyError);
      return res.status(500).json({ success: false, message: '회사 정보 확인 중 오류가 발생했습니다.' });
    }

    const validIds = (validCompanies || []).map((c) => c.id);
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: '선택한 회사 ID가 유효하지 않습니다.' });
    }

    // 모든 회원의 user_profiles.prefer_company 읽어오기
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, prefer_company');

    if (profileError) {
      console.error('[admin][companies][apply-prefer-company] 프로필 조회 오류:', profileError);
      return res.status(500).json({ success: false, message: '회원 프로필 조회 중 오류가 발생했습니다.' });
    }

    const updates = [];
    for (const row of profiles || []) {
      const existing = Array.isArray(row.prefer_company) ? row.prefer_company.filter((n) => Number.isInteger(n)) : [];
      const mergedSet = new Set([...existing, ...validIds]);
      const mergedArray = Array.from(mergedSet);

      // 변경이 없는 경우 스킵
      const sameLength = mergedArray.length === existing.length;
      if (sameLength && existing.every((id) => mergedSet.has(id))) {
        continue;
      }

      updates.push({
        user_id: row.user_id,
        prefer_company: mergedArray,
      });
    }

    if (updates.length === 0) {
      return res.json({
        success: true,
        message: '변경된 항목이 없습니다. 이미 모든 회원의 선호 회사에 선택한 회사가 포함되어 있습니다.',
        targetCount: profiles ? profiles.length : 0,
        updatedCount: 0,
      });
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert(updates, { onConflict: 'user_id' });

    if (updateError) {
      console.error('[admin][companies][apply-prefer-company] 일괄 적용 오류:', updateError);
      return res.status(500).json({ success: false, message: '선호 회사 일괄 적용 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: `선택한 회사가 ${updates.length}명의 회원 선호 회사 목록에 추가되었습니다.`,
      targetCount: profiles ? profiles.length : 0,
      updatedCount: updates.length,
    });
  } catch (error) {
    console.error('[admin][companies][apply-prefer-company] 예외:', error);
    return res.status(500).json({ success: false, message: '선호 회사 일괄 적용 중 서버 오류가 발생했습니다.' });
  }
});

// [관리자] 회차 초기화 복구
router.post('/restore-period-users', authenticate, async (req, res) => {
  try {
    const { periodId } = req.body;
    
    if (!periodId || typeof periodId !== 'number') {
      return res.status(400).json({ success: false, message: '유효한 회차 ID를 입력해주세요.' });
    }

    console.log(`[admin] 회차 ${periodId} users 테이블 복구 시작`);

    // 1) is_applied 갱신: 해당 회차에서 신청 완료(취소 아님)한 사용자만 true
    const { error: appliedError } = await supabase.rpc('restore_is_applied', { target_period_id: periodId });
    
    if (appliedError) {
      console.error('[admin] is_applied 복구 오류:', appliedError);
      // RPC 함수가 없으면 직접 SQL 실행
      try {
        // is_applied = true로 설정할 user_id 목록 조회
        const { data: appliedUsers, error: selectError } = await supabase
          .from('matching_applications')
          .select('user_id')
          .eq('period_id', periodId)
          .eq('applied', true)
          .eq('cancelled', false);

        if (selectError) throw selectError;

        const appliedUserIds = appliedUsers ? appliedUsers.map(u => u.user_id) : [];

        // 모든 사용자의 is_applied를 false로 초기화
        await supabase
          .from('users')
          .update({ is_applied: false })
          .not('id', 'is', null);

        // 신청한 사용자만 is_applied를 true로 설정
        if (appliedUserIds.length > 0) {
          await supabase
            .from('users')
            .update({ is_applied: true })
            .in('id', appliedUserIds);
        }

        console.log(`[admin] is_applied 복구 완료: ${appliedUserIds.length}명`);
      } catch (e) {
        console.error('[admin] is_applied 복구 중 오류:', e);
        return res.status(500).json({ success: false, message: 'is_applied 복구 중 오류가 발생했습니다.' });
      }
    } else {
      console.log('[admin] is_applied 복구 완료 (RPC)');
    }

    // 2) is_matched 갱신: 해당 회차 매칭 성공 커플에 포함된 사용자만 true
    const { error: matchedError } = await supabase.rpc('restore_is_matched', { target_period_id: periodId });
    
    if (matchedError) {
      console.error('[admin] is_matched 복구 오류:', matchedError);
      // RPC 함수가 없으면 직접 SQL 실행
      try {
        // is_matched = true로 설정할 user_id 목록 조회
        const { data: matchedHistory, error: selectError } = await supabase
          .from('matching_history')
          .select('male_user_id, female_user_id')
          .eq('period_id', periodId)
          .eq('matched', true);

        if (selectError) throw selectError;

        const matchedUserIds = new Set();
        if (matchedHistory) {
          matchedHistory.forEach(h => {
            if (h.male_user_id) matchedUserIds.add(h.male_user_id);
            if (h.female_user_id) matchedUserIds.add(h.female_user_id);
          });
        }

        // 모든 사용자의 is_matched를 null로 초기화
        await supabase
          .from('users')
          .update({ is_matched: null })
          .not('id', 'is', null);

        // 매칭된 사용자만 is_matched를 true로 설정
        if (matchedUserIds.size > 0) {
          await supabase
            .from('users')
            .update({ is_matched: true })
            .in('id', Array.from(matchedUserIds));
        }

        console.log(`[admin] is_matched 복구 완료: ${matchedUserIds.size}명`);
      } catch (e) {
        console.error('[admin] is_matched 복구 중 오류:', e);
        return res.status(500).json({ success: false, message: 'is_matched 복구 중 오류가 발생했습니다.' });
      }
    } else {
      console.log('[admin] is_matched 복구 완료 (RPC)');
    }

    res.json({ 
      success: true, 
      message: `회차 ${periodId}의 users 테이블이 복구되었습니다.` 
    });
  } catch (error) {
    console.error('[admin] 회차 복구 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 채팅 내역 조회 (두 사용자 간)
router.get('/chat-messages/:user1Id/:user2Id', authenticate, async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    
    // 관리자 권한 확인
    const { data: adminUser } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.userId)
      .single();
    
    if (!adminUser || !adminUser.is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    // dev_mode 확인 (운영 환경에서는 채팅 내용 비공개)
    const { data: devModeSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'dev_mode')
      .maybeSingle();
    
    const isDevMode = devModeSetting?.value?.enabled === true;

    // 두 사용자 간의 모든 채팅 메시지 조회
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${user1Id},receiver_id.eq.${user2Id}),and(sender_id.eq.${user2Id},receiver_id.eq.${user1Id})`)
      .order('timestamp', { ascending: true });

    if (messagesError) {
      console.error('[admin] 채팅 조회 오류:', messagesError);
      return res.status(500).json({ error: '채팅 내역 조회 실패', details: messagesError.message });
    }

    // 사용자 프로필 정보 조회
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, nickname')
      .in('user_id', [user1Id, user2Id]);

    if (profilesError) {
      console.error('[admin] 프로필 조회 오류:', profilesError);
    }

    const profileMap = {};
    if (profiles) {
      profiles.forEach(p => {
        profileMap[p.user_id] = p.nickname;
      });
    }

    // 메시지 복호화 및 닉네임 추가
    const messagesWithNicknames = (messages || []).map(msg => {
      let content = '';
      
      // 운영 모드에서는 채팅 내용 비공개 처리
      if (!isDevMode) {
        content = '[비공개]';
      } else {
        // 개발 모드에서만 복호화
        try {
          content = decrypt(msg.content);
        } catch (e) {
          content = '[복호화 실패]';
          console.warn('[admin] 메시지 복호화 실패:', e);
        }
      }
      
      return {
        ...msg,
        content: content,
        sender_nickname: profileMap[msg.sender_id] || '알 수 없음',
        receiver_nickname: profileMap[msg.receiver_id] || '알 수 없음'
      };
    });

    res.json({
      messages: messagesWithNicknames,
      users: {
        user1: {
          id: user1Id,
          nickname: profileMap[user1Id] || '알 수 없음'
        },
        user2: {
          id: user2Id,
          nickname: profileMap[user2Id] || '알 수 없음'
        }
      },
      isDevMode: isDevMode
    });
  } catch (error) {
    console.error('[admin] 채팅 조회 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;