const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/config.env' });
const fs = require('fs');
const { sendMatchingResultEmail } = require('./utils/emailService');

// Supabase 연결
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// KST 기준 시각 반환
function getKSTISOString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace('T', ' ').substring(0, 19); // 'YYYY-MM-DD HH:mm:ss'
}

// KST 기준 나이 계산
function getAge(birthYear) {
  const now = new Date();
  return now.getFullYear() - birthYear + 1;
}

// 거주지 문자열에서 시/도 부분만 추출 (예: "서울특별시 강남구" -> "서울특별시", "경기도 수원시" -> "경기도")
function extractSido(residence) {
  if (!residence || typeof residence !== 'string') return null;
  const trimmed = residence.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  return parts[0] || null;
}

// 매칭 알고리즘 전체에서 공유할 회사 id->name 매핑
let companyIdNameMap = null;

// 과거 매칭 이력 조회 함수 (이메일 기반)
async function getPreviousMatchHistory(userIds) {
  try {
    // 1. 사용자 ID들의 이메일 조회
    const { data: userEmails, error: emailError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', userIds);
    
    if (emailError) {
      console.error('사용자 이메일 조회 실패:', emailError);
      return new Set();
    }
    
    // 이메일 목록 생성 및 매핑
    const emails = userEmails.map(user => user.email);
    const emailToIdMap = {};
    userEmails.forEach(user => {
      emailToIdMap[user.email] = user.id;
    });
    
    // 2. 이메일 기반으로 매칭 이력 조회
    const { data: matchHistory, error } = await supabase
      .from('matching_history')
      .select('male_user_email, female_user_email')
      .or(`male_user_email.in.("${emails.join('","')}"),female_user_email.in.("${emails.join('","')}")`);
    
    if (error) {
      console.error('과거 매칭 이력 조회 실패:', error);
      return new Set();
    }
    
    // 3. 이메일 기반 매칭 이력을 현재 user_id로 변환하여 Set에 저장
    const previousMatches = new Set();
    if (matchHistory && matchHistory.length > 0) {
      matchHistory.forEach(match => {
        if (match.male_user_email && match.female_user_email) {
          const maleCurrentId = emailToIdMap[match.male_user_email];
          const femaleCurrentId = emailToIdMap[match.female_user_email];
          
          if (maleCurrentId && femaleCurrentId) {
            previousMatches.add(`${maleCurrentId}-${femaleCurrentId}`);
            previousMatches.add(`${femaleCurrentId}-${maleCurrentId}`);
          }
        }
      });
      console.log(`과거 매칭 이력 조회 완료: ${matchHistory.length}건의 이메일 기반 매칭 이력 발견`);
    } else {
      console.log('과거 매칭 이력이 없습니다.');
    }
    
    return previousMatches;
  } catch (error) {
    console.error('과거 매칭 이력 조회 중 오류:', error);
    return new Set();
  }
}

// 매칭 조건 체크 함수
function isMutualMatch(a, b, previousMatches = null) {
  // 과거 매칭 이력 확인 (추가된 부분)
  if (previousMatches && previousMatches.has(`${a.user_id}-${b.user_id}`)) {
    return false; // 과거에 매칭된 적이 있으면 제외
  }
  // 나이: 최소/최대 출생연도 = 내 출생연도 - preferred_age_max/min (min: 연상, max: 연하)
  const a_min_birth = a.birth_year - (a.preferred_age_max ?? 0); // 연상(나이 많은 쪽)
  const a_max_birth = a.birth_year - (a.preferred_age_min ?? 0); // 연하(나이 어린 쪽)
  const b_min_birth = b.birth_year - (b.preferred_age_max ?? 0);
  const b_max_birth = b.birth_year - (b.preferred_age_min ?? 0);
  if (b.birth_year < a_min_birth || b.birth_year > a_max_birth) return false;
  if (a.birth_year < b_min_birth || a.birth_year > b_max_birth) return false;
  // 키
  if (b.height < a.preferred_height_min || b.height > a.preferred_height_max) return false;
  if (a.height < b.preferred_height_min || a.height > b.preferred_height_max) return false;
  // 체형
  const aBody = a.preferred_body_types ? (Array.isArray(a.preferred_body_types) ? a.preferred_body_types : (typeof a.preferred_body_types === 'string' ? JSON.parse(a.preferred_body_types) : [])) : [];
  const bBody = b.body_type ? (Array.isArray(b.body_type) ? b.body_type : (typeof b.body_type === 'string' ? JSON.parse(b.body_type) : [])) : [];
  if (aBody.length > 0 && bBody.length > 0 && !aBody.some(type => bBody.includes(type))) return false;
  const bPrefBody = b.preferred_body_types ? (Array.isArray(b.preferred_body_types) ? b.preferred_body_types : (typeof b.preferred_body_types === 'string' ? JSON.parse(b.preferred_body_types) : [])) : [];
  const aRealBody = a.body_type ? (Array.isArray(a.body_type) ? a.body_type : (typeof a.body_type === 'string' ? JSON.parse(a.body_type) : [])) : [];
  if (bPrefBody.length > 0 && aRealBody.length > 0 && !bPrefBody.some(type => aRealBody.includes(type))) return false;
  // 직군
  if (a.preferred_job_types && a.preferred_job_types.length > 0) {
    if (!a.preferred_job_types.includes(b.job_type)) return false;
  }
  if (b.preferred_job_types && b.preferred_job_types.length > 0) {
    if (!b.preferred_job_types.includes(a.job_type)) return false;
  }
  // 결혼상태
  const aMarital = a.preferred_marital_statuses ? (typeof a.preferred_marital_statuses === 'string' ? JSON.parse(a.preferred_marital_statuses) : a.preferred_marital_statuses) : [];
  const bMarital = b.preferred_marital_statuses ? (typeof b.preferred_marital_statuses === 'string' ? JSON.parse(b.preferred_marital_statuses) : b.preferred_marital_statuses) : [];
  if (aMarital.length > 0 && (!b.marital_status || !aMarital.includes(b.marital_status))) return false;
  if (bMarital.length > 0 && (!a.marital_status || !bMarital.includes(a.marital_status))) return false;

  // 선호 지역 (시/도 기준) - 상호 만족해야 매칭
  const aRegions = Array.isArray(a.prefer_region) ? a.prefer_region : [];
  const bRegions = Array.isArray(b.prefer_region) ? b.prefer_region : [];
  const aSido = extractSido(a.residence);
  const bSido = extractSido(b.residence);

  if (aRegions.length > 0) {
    if (!bSido || !aRegions.includes(bSido)) return false;
  }
  if (bRegions.length > 0) {
    if (!aSido || !bRegions.includes(aSido)) return false;
  }

  // 선호 회사 - 내 선호 회사 리스트 안에 상대 회사명이 포함되어야 함 (상호 만족)
  if (companyIdNameMap) {
    const aPreferCompanyNames = Array.isArray(a.prefer_company)
      ? a.prefer_company
          .map(id => companyIdNameMap.get(id))
          .filter(name => !!name)
      : [];
    const bPreferCompanyNames = Array.isArray(b.prefer_company)
      ? b.prefer_company
          .map(id => companyIdNameMap.get(id))
          .filter(name => !!name)
      : [];

    const aCompanyName = typeof a.company === 'string' ? a.company.trim() : '';
    const bCompanyName = typeof b.company === 'string' ? b.company.trim() : '';

    if (aPreferCompanyNames.length > 0) {
      if (!bCompanyName || !aPreferCompanyNames.includes(bCompanyName)) return false;
    }
    if (bPreferCompanyNames.length > 0) {
      if (!aCompanyName || !bPreferCompanyNames.includes(aCompanyName)) return false;
    }
  }

  return true;
}



// 매칭 결과 이메일 발송 함수 (스케줄러에서 호출)
// periodIdOverride가 주어지면 해당 회차 기준, 없으면 최신 회차 기준
async function sendMatchingResultEmails(periodIdOverride) {
  try {
    let periodId = periodIdOverride;

    // 특정 회차가 지정되지 않은 경우 → 최신 회차 사용 (기존 동작 유지)
    if (!periodId) {
      const { data: logRows, error: logError } = await supabase
        .from('matching_log')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      if (logError || !logRows || logRows.length === 0) {
        console.error('매칭 회차 조회 실패:', logError);
        return;
      }
      periodId = logRows[0].id;
    }

    // 2. 해당 회차의 매칭 신청자들 조회
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
      return;
    }

    if (!applications || applications.length === 0) {
      console.log('해당 회차의 매칭 신청자가 없습니다.');
      return;
    }

    console.log('\n📧 매칭 결과 이메일 발송 시작...');
    let emailSuccessCount = 0;
    let emailFailCount = 0;

    // 각 신청자에게 이메일 발송
    for (const app of applications) {
      try {
        const isMatched = app.matched === true;
        const partnerInfo = isMatched && app.partner_user_id ? { partnerId: app.partner_user_id } : null;
        
        const emailSent = await sendMatchingResultEmail(app.user.email, isMatched, partnerInfo);
        
        if (emailSent) {
          emailSuccessCount++;
        } else {
          emailFailCount++;
        }
      } catch (error) {
        console.error(`이메일 발송 오류 - 사용자: ${app.user_id}`, error);
        emailFailCount++;
      }
    }

    console.log(`📧 매칭 결과 이메일 발송 완료: 성공 ${emailSuccessCount}건, 실패 ${emailFailCount}건`);
  } catch (error) {
    console.error('매칭 결과 이메일 발송 오류:', error);
  }
}

// 가상 매칭용: DB를 변경하지 않고, 현재 알고리즘 기준 예상 매칭 결과만 계산
async function computeMatchesForPeriod(periodIdOverride) {
  try {
    let periodId = periodIdOverride;

    // 1. 회차 결정 (지정 없으면 최신 회차)
    if (!periodId) {
      const { data: logRows, error: logError } = await supabase
        .from('matching_log')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      if (logError || !logRows || logRows.length === 0) {
        console.error('매칭 회차 조회 실패(가상 매칭):', logError);
        return { periodId: null, totalApplicants: 0, eligibleApplicants: 0, matchCount: 0, couples: [] };
      }
      periodId = logRows[0].id;
    }

    // 2. 해당 회차 신청자 조회 (신청 & 취소 X)
    const { data: applicants, error: appError } = await supabase
      .from('matching_applications')
      .select('user_id')
      .eq('applied', true)
      .eq('cancelled', false)
      .eq('period_id', periodId);

    if (appError) {
      console.error('신청자 조회 실패(가상 매칭):', appError);
      return { periodId, totalApplicants: 0, eligibleApplicants: 0, matchCount: 0, couples: [] };
    }

    const userIds = (applicants || []).map(a => a.user_id);

    if (!userIds.length) {
      return { periodId, totalApplicants: 0, eligibleApplicants: 0, matchCount: 0, couples: [] };
    }

    // 3. 정지 사용자 필터링
    const { data: userStatuses, error: statusError } = await supabase
      .from('users')
      .select('id, is_banned')
      .in('id', userIds);

    if (statusError) {
      console.error('사용자 상태 조회 실패(가상 매칭):', statusError);
      return { periodId, totalApplicants: userIds.length, eligibleApplicants: 0, matchCount: 0, couples: [] };
    }

    const eligibleUserIds = (userStatuses || [])
      .filter(user => !user.is_banned)
      .map(user => user.id);

    if (eligibleUserIds.length < 2) {
      return {
        periodId,
        totalApplicants: userIds.length,
        eligibleApplicants: eligibleUserIds.length,
        matchCount: 0,
        couples: [],
      };
    }

    // 4. 과거 매칭 이력 조회
    // 가상 매칭 실행 시 콘솔 노이즈를 줄이기 위해 상세 로그는 제거
    const previousMatches = await getPreviousMatchHistory(eligibleUserIds);

    // 5. 회사 id -> name 매핑 로드 (선호 회사 매칭용)
    try {
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true);

      if (companiesError) {
        console.error('회사 목록 조회 실패(가상 매칭):', companiesError);
        companyIdNameMap = null;
      } else if (companies && companies.length > 0) {
        companyIdNameMap = new Map();
        companies.forEach(c => {
          if (c && c.id !== undefined && c.name) {
            companyIdNameMap.set(c.id, c.name);
          }
        });
      } else {
        companyIdNameMap = null;
      }
    } catch (e) {
      console.error('회사 목록 로드 중 오류(가상 매칭):', e);
      companyIdNameMap = null;
    }

    // 6. 매칭 가중치(weight) 조회
    let weightMap = new Map();
    try {
      const { data: userWeights, error: weightError } = await supabase
        .from('users')
        .select('id, weight')
        .in('id', eligibleUserIds);

      if (weightError) {
        console.error('사용자 weight 조회 실패(가상 매칭):', weightError);
      } else if (userWeights && userWeights.length > 0) {
        userWeights.forEach(u => {
          const w = typeof u.weight === 'number' ? u.weight : 0;
          weightMap.set(u.id, w);
        });
      }
    } catch (e) {
      console.error('weight 정보 로드 중 오류(가상 매칭):', e);
      weightMap = new Map();
    }

    // 7. 신청자 프로필/선호 스냅샷 조회
    let profiles = [];
    for (let i = 0; i < eligibleUserIds.length; i += 50) {
      const batchIds = eligibleUserIds.slice(i, i + 50);
      const { data, error } = await supabase
        .from('matching_applications')
        .select('user_id, profile_snapshot, preference_snapshot')
        .in('user_id', batchIds)
        .eq('period_id', periodId)
        .eq('applied', true)
        .eq('cancelled', false);
      if (error) {
        console.error('신청 스냅샷 조회 실패(가상 매칭):', error);
        return {
          periodId,
          totalApplicants: userIds.length,
          eligibleApplicants: eligibleUserIds.length,
          matchCount: 0,
          couples: [],
        };
      }
      profiles = profiles.concat(
        (data || []).map(row => ({
          user_id: row.user_id,
          weight: weightMap.has(row.user_id) ? weightMap.get(row.user_id) : 0,
          ...row.profile_snapshot,
          ...row.preference_snapshot,
        })),
      );
    }

    if (!profiles.length) {
      return {
        periodId,
        totalApplicants: userIds.length,
        eligibleApplicants: eligibleUserIds.length,
        matchCount: 0,
        couples: [],
      };
    }

    // 8. 남/여 분리 및 weight 기반 정렬
    function sortByWeightWithRandom(arr) {
      arr.sort((a, b) => {
        const wa = typeof a.weight === 'number' ? a.weight : 0;
        const wb = typeof b.weight === 'number' ? b.weight : 0;
        if (wa !== wb) return wb - wa;
        return Math.random() - 0.5;
      });
    }

    const males = profiles.filter(p => p.gender === 'male');
    const females = profiles.filter(p => p.gender === 'female');

    sortByWeightWithRandom(males);
    sortByWeightWithRandom(females);

    // 9. 가능한 남-여 쌍(edge) 생성
    const edges = Array(males.length)
      .fill(0)
      .map(() => []);
    for (let i = 0; i < males.length; i++) {
      for (let j = 0; j < females.length; j++) {
        // 과거 매칭 이력 필터
        if (previousMatches.has(`${males[i].user_id}-${females[j].user_id}`)) {
          continue;
        }
        if (isMutualMatch(males[i], females[j], previousMatches)) {
          edges[i].push(j);
        }
      }
    }

    // 10. 최대 매칭(헝가리안 DFS)
    const matchTo = Array(females.length).fill(-1);
    function dfs(u, visited) {
      for (const v of edges[u]) {
        if (visited[v]) continue;
        visited[v] = true;
        if (matchTo[v] === -1 || dfs(matchTo[v], visited)) {
          matchTo[v] = u;
          return true;
        }
      }
      return false;
    }

    for (let u = 0; u < males.length; u++) {
      const visited = Array(females.length).fill(false);
      dfs(u, visited);
    }

    const matches = [];
    for (let j = 0; j < females.length; j++) {
      if (matchTo[j] !== -1) {
        matches.push([males[matchTo[j]].user_id, females[j].user_id]);
      }
    }

    if (!matches.length) {
      return {
        periodId,
        totalApplicants: userIds.length,
        eligibleApplicants: eligibleUserIds.length,
        matchCount: 0,
        couples: [],
      };
    }

    // 11. 매칭된 사용자들의 이메일 조회 (한 번에)
    const matchedUserIds = Array.from(new Set(matches.flat()));
    const { data: userRows, error: userRowsError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', matchedUserIds);

    const emailMap = new Map();
    if (!userRowsError && userRows) {
      userRows.forEach(u => {
        emailMap.set(u.id, u.email);
      });
    }

    // 12. 프론트에서 바로 보여줄 수 있는 커플 정보로 변환
    const couples = matches.map(([maleId, femaleId]) => {
      const maleProfile = profiles.find(p => p.user_id === maleId) || {};
      const femaleProfile = profiles.find(p => p.user_id === femaleId) || {};
      return {
        male: {
          user_id: maleId,
          email: emailMap.get(maleId) || null,
          nickname: maleProfile.nickname || null,
          gender: maleProfile.gender || null,
          company: maleProfile.company || null,
          birth_year: maleProfile.birth_year || null,
        },
        female: {
          user_id: femaleId,
          email: emailMap.get(femaleId) || null,
          nickname: femaleProfile.nickname || null,
          gender: femaleProfile.gender || null,
          company: femaleProfile.company || null,
          birth_year: femaleProfile.birth_year || null,
        },
      };
    });

    return {
      periodId,
      totalApplicants: userIds.length,
      eligibleApplicants: eligibleUserIds.length,
      matchCount: couples.length,
      couples,
    };
  } catch (error) {
    console.error('computeMatchesForPeriod(가상 매칭) 오류:', error);
    return {
      periodId: periodIdOverride || null,
      totalApplicants: 0,
      eligibleApplicants: 0,
      matchCount: 0,
      couples: [],
    };
  }
}

// 전체 회원(관리자 제외)을 대상으로 하는 가상 매칭 (현재 프로필/선호 기준)
async function computeMatchesForAllUsers() {
  try {
    // 1. 전체 회원 로드 (관리자/정지/비활성 제외)
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        nickname,
        gender,
        birth_year,
        height,
        residence,
        company,
        job_type,
        marital_status,
        body_type,
        preferred_age_min,
        preferred_age_max,
        preferred_height_min,
        preferred_height_max,
        preferred_body_types,
        preferred_job_types,
        preferred_marital_statuses,
        prefer_company,
        prefer_region,
        user:users!inner(id, email, is_admin, is_active, is_banned, weight)
      `);

    if (usersError) {
      console.error('[computeMatchesForAllUsers] 사용자 로드 실패:', usersError);
      return { totalUsers: 0, eligibleUsers: 0, matchCount: 0, couples: [] };
    }

    const allUsers = (users || []).filter(row => {
      const u = row.user;
      if (!u) return false;
      if (u.is_admin) return false;
      if (u.is_banned) return false;
      if (u.is_active === false) return false;
      return true;
    });

    const totalUsers = allUsers.length;
    if (totalUsers < 2) {
      return { totalUsers, eligibleUsers: totalUsers, matchCount: 0, couples: [] };
    }

    const eligibleUserIds = allUsers.map(row => row.user_id);

    // 2. 과거 매칭 이력 조회 (이메일 기반) - 전체 회원 기준에서도 과거에 매칭된 쌍은 제외
    console.log('[가상 매칭(전체)] 과거 매칭 이력 조회 시작...');
    const previousMatches = await getPreviousMatchHistory(eligibleUserIds);
    console.log(`[가상 매칭(전체)] 과거 매칭 이력 조회 완료: ${previousMatches.size}개의 매칭 쌍이 필터링 대상`);

    // 3. 회사 id -> name 매핑 로드 (선호 회사 매칭용)
    try {
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true);

      if (companiesError) {
        console.error('[computeMatchesForAllUsers] 회사 목록 조회 실패:', companiesError);
        companyIdNameMap = null;
      } else if (companies && companies.length > 0) {
        companyIdNameMap = new Map();
        companies.forEach(c => {
          if (c && c.id !== undefined && c.name) {
            companyIdNameMap.set(c.id, c.name);
          }
        });
        console.log(`[가상 매칭(전체)] 활성 회사 ${companies.length}개 로드 (선호 회사 필터에 사용)`);
      } else {
        companyIdNameMap = null;
        console.log('[가상 매칭(전체)] 활성 회사가 없습니다. 선호 회사 필터는 건너뜁니다.');
      }
    } catch (e) {
      console.error('[computeMatchesForAllUsers] 회사 목록 로드 중 오류:', e);
      companyIdNameMap = null;
    }

    // 4. weight 맵 구성
    let weightMap = new Map();
    (allUsers || []).forEach(row => {
      const u = row.user;
      const w = u && typeof u.weight === 'number' ? u.weight : 0;
      weightMap.set(row.user_id, w);
    });

    // 5. 프로필 배열 생성 (matching-algorithm의 isMutualMatch와 동일한 필드 구조)
    const profiles = allUsers.map(row => ({
      user_id: row.user_id,
      nickname: row.nickname,
      gender: row.gender,
      birth_year: row.birth_year,
      height: row.height,
      residence: row.residence,
      company: row.company,
      job_type: row.job_type,
      marital_status: row.marital_status,
      body_type: row.body_type,
      preferred_age_min: row.preferred_age_min,
      preferred_age_max: row.preferred_age_max,
      preferred_height_min: row.preferred_height_min,
      preferred_height_max: row.preferred_height_max,
      preferred_body_types: row.preferred_body_types,
      preferred_job_types: row.preferred_job_types,
      preferred_marital_statuses: row.preferred_marital_statuses,
      prefer_company: row.prefer_company,
      prefer_region: row.prefer_region,
      weight: weightMap.get(row.user_id) || 0,
      email: row.user?.email || null,
    }));

    if (!profiles.length) {
      return { totalUsers, eligibleUsers: 0, matchCount: 0, couples: [] };
    }

    // 6. 남/여 분리 및 weight 기반 정렬
    function sortByWeightWithRandom(arr) {
      arr.sort((a, b) => {
        const wa = typeof a.weight === 'number' ? a.weight : 0;
        const wb = typeof b.weight === 'number' ? b.weight : 0;
        if (wa !== wb) return wb - wa;
        return Math.random() - 0.5;
      });
    }

    const males = profiles.filter(p => p.gender === 'male');
    const females = profiles.filter(p => p.gender === 'female');

    sortByWeightWithRandom(males);
    sortByWeightWithRandom(females);

    if (!males.length || !females.length) {
      return { totalUsers, eligibleUsers: profiles.length, matchCount: 0, couples: [] };
    }

    // 7. 가능한 남-여 쌍(edge) 생성
    const edges = Array(males.length)
      .fill(0)
      .map(() => []);

    for (let i = 0; i < males.length; i++) {
      for (let j = 0; j < females.length; j++) {
        // 과거에 매칭된 적 있는 쌍은 제외
        if (previousMatches.has(`${males[i].user_id}-${females[j].user_id}`)) {
          continue;
        }
        // 현재 프로필/선호 조건 + 과거 이력(중복 방지)을 함께 고려
        if (isMutualMatch(males[i], females[j], previousMatches)) {
          edges[i].push(j);
        }
      }
    }

    // 7. 최대 매칭(헝가리안 DFS)
    const matchTo = Array(females.length).fill(-1);
    function dfs(u, visited) {
      for (const v of edges[u]) {
        if (visited[v]) continue;
        visited[v] = true;
        if (matchTo[v] === -1 || dfs(matchTo[v], visited)) {
          matchTo[v] = u;
          return true;
        }
      }
      return false;
    }

    for (let u = 0; u < males.length; u++) {
      const visited = Array(females.length).fill(false);
      dfs(u, visited);
    }

    const matches = [];
    for (let j = 0; j < females.length; j++) {
      if (matchTo[j] !== -1) {
        matches.push([males[matchTo[j]].user_id, females[j].user_id]);
      }
    }

    if (!matches.length) {
      return { totalUsers, eligibleUsers: profiles.length, matchCount: 0, couples: [] };
    }

    // 8. 커플 정보 구성
    const idToProfile = new Map();
    profiles.forEach(p => idToProfile.set(p.user_id, p));

    const couples = matches.map(([maleId, femaleId]) => {
      const maleProfile = idToProfile.get(maleId) || {};
      const femaleProfile = idToProfile.get(femaleId) || {};
      return {
        male: {
          user_id: maleId,
          email: maleProfile.email || null,
          nickname: maleProfile.nickname || null,
          gender: maleProfile.gender || null,
          company: maleProfile.company || null,
          birth_year: maleProfile.birth_year || null,
        },
        female: {
          user_id: femaleId,
          email: femaleProfile.email || null,
          nickname: femaleProfile.nickname || null,
          gender: femaleProfile.gender || null,
          company: femaleProfile.company || null,
          birth_year: femaleProfile.birth_year || null,
        },
      };
    });

    return {
      totalUsers,
      eligibleUsers: profiles.length,
      matchCount: couples.length,
      couples,
    };
  } catch (error) {
    console.error('computeMatchesForAllUsers(가상 매칭 전체) 오류:', error);
    return {
      totalUsers: 0,
      eligibleUsers: 0,
      matchCount: 0,
      couples: [],
    };
  }
}

async function main() {
  // 1. CLI 인자로 periodId가 넘어온 경우 우선 사용
  let periodId = null;
  const argPeriod = process.argv[2];
  if (argPeriod && !Number.isNaN(Number(argPeriod))) {
    periodId = Number(argPeriod);
  }

  // 1-b. 인자가 없으면 기존처럼 최신 회차 id 조회
  if (!periodId) {
    const { data: logRows, error: logError } = await supabase
      .from('matching_log')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    if (logError || !logRows || logRows.length === 0) {
      console.error('매칭 회차 조회 실패:', logError);
      return;
    }
    periodId = logRows[0].id;
  }

  // 2. 해당 회차에 신청 && 취소 안한 유저만 추출
  const { data: applicants, error: appError } = await supabase
    .from('matching_applications')
    .select('user_id')
    .eq('applied', true)
    .eq('cancelled', false)
    .eq('period_id', periodId);
  if (appError) {
    console.error('신청자 조회 실패:', appError);
    return;
  }
  const userIds = applicants.map(a => a.user_id);
  
  // 2-1. 정지 사용자 필터링
  const { data: userStatuses, error: statusError } = await supabase
    .from('users')
    .select('id, is_banned')
    .in('id', userIds);
  
  if (statusError) {
    console.error('사용자 상태 조회 실패:', statusError);
    return;
  }
  
  // 정지되지 않은 사용자만 필터링
  const eligibleUserIds = userStatuses
    .filter(user => !user.is_banned)
    .map(user => user.id);
  
  console.log(`매칭 대상자 필터링 결과:`);
  console.log(`- 전체 신청자: ${userIds.length}명`);
  console.log(`- 정지 제외: ${userIds.length - eligibleUserIds.length}명`);
  console.log(`- 최종 매칭 대상자: ${eligibleUserIds.length}명`);
  
  if (eligibleUserIds.length < 2) {
    console.log('매칭할 신청자가 2명 미만입니다.');
    // [추가] 모든 신청자에 대해 is_matched false 처리
    for (const userId of userIds) {
      await supabase.from('users').update({ is_matched: false }).eq('id', userId);
      await supabase.from('matching_applications').update({ matched: false }).eq('user_id', userId).eq('period_id', periodId);
    }
    return;
  }
  
  // 필터링된 사용자 ID로 교체
  const filteredUserIds = eligibleUserIds;

  // 2-2. 과거 매칭 이력 조회 (추가된 부분)
  console.log('과거 매칭 이력 조회 시작...');
  const previousMatches = await getPreviousMatchHistory(filteredUserIds);
  console.log(`과거 매칭 이력 조회 완료: ${previousMatches.size}개의 매칭 쌍이 필터링 대상`);

  // 2-3. 회사 id -> name 매핑 로드 (선호 회사 매칭용)
  try {
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true);

    if (companiesError) {
      console.error('회사 목록 조회 실패:', companiesError);
      companyIdNameMap = null;
    } else if (companies && companies.length > 0) {
      companyIdNameMap = new Map();
      companies.forEach(c => {
        if (c && c.id !== undefined && c.name) {
          companyIdNameMap.set(c.id, c.name);
        }
      });
      console.log(`[매칭 알고리즘] 활성 회사 ${companies.length}개 로드 (선호 회사 필터에 사용)`);
    } else {
      companyIdNameMap = null;
      console.log('[매칭 알고리즘] 활성 회사가 없습니다. 선호 회사 필터는 건너뜁니다.');
    }
  } catch (e) {
    console.error('회사 목록 로드 중 오류:', e);
    companyIdNameMap = null;
  }

  // 2-4. 매칭 가중치(weight) 조회 (users 테이블)
  let weightMap = new Map();
  try {
    const { data: userWeights, error: weightError } = await supabase
      .from('users')
      .select('id, weight')
      .in('id', filteredUserIds);

    if (weightError) {
      console.error('사용자 weight 조회 실패:', weightError);
    } else if (userWeights && userWeights.length > 0) {
      userWeights.forEach(u => {
        // weight는 음수/양수/0 모두 허용, null/undefined면 0으로 처리
        const w = typeof u.weight === 'number' ? u.weight : 0;
        weightMap.set(u.id, w);
      });
      console.log(`[매칭 알고리즘] weight 정보 로드 완료: ${userWeights.length}명`);
    }
  } catch (e) {
    console.error('weight 정보 로드 중 오류:', e);
    weightMap = new Map();
  }

  // 3. 신청자 프로필/선호도 정보 조회 (batch)
  let profiles = [];
  for (let i = 0; i < filteredUserIds.length; i += 50) {
    const batchIds = filteredUserIds.slice(i, i+50);
    const { data, error } = await supabase
      .from('matching_applications')
      .select('user_id, profile_snapshot, preference_snapshot')
      .in('user_id', batchIds)
      .eq('period_id', periodId)
      .eq('applied', true)
      .eq('cancelled', false);
    if (error) {
      console.error('신청 스냅샷 조회 실패:', error);
      return;
    }
    // profile_snapshot/preference_snapshot을 합쳐서 한 객체로 만듦
    profiles = profiles.concat(data.map(row => ({
      user_id: row.user_id,
      // users.weight 값 주입 (없으면 0)
      weight: weightMap.has(row.user_id) ? weightMap.get(row.user_id) : 0,
      ...row.profile_snapshot,
      ...row.preference_snapshot
    })));
  }

  // 4. 남/여 분리 + weight 기반 정렬 (높은 가중치 우선, 동점자는 랜덤 순서)
  function sortByWeightWithRandom(arr) {
    arr.sort((a, b) => {
      const wa = typeof a.weight === 'number' ? a.weight : 0;
      const wb = typeof b.weight === 'number' ? b.weight : 0;
      if (wa !== wb) return wb - wa; // weight 큰 순
      // weight 같으면 랜덤 순서
      return Math.random() - 0.5;
    });
  }

  const males = profiles.filter(p => p.gender === 'male');
  const females = profiles.filter(p => p.gender === 'female');

  sortByWeightWithRandom(males);
  sortByWeightWithRandom(females);
  // 5. 그래프(edge) 생성: 남-여 쌍 중 양방향 만족하는 경우만 (과거 이력 필터링 포함)
  const edges = Array(males.length).fill(0).map(() => []); // edges[i] = [여자 인덱스...]
  let totalPairs = 0;
  let filteredByHistory = 0;
  let validPairs = 0;
  
  for (let i = 0; i < males.length; i++) {
    for (let j = 0; j < females.length; j++) {
      totalPairs++;
      
      // 과거 매칭 이력 확인
      if (previousMatches.has(`${males[i].user_id}-${females[j].user_id}`)) {
        filteredByHistory++;
        continue; // 과거에 매칭된 적이 있으면 건너뛰기
      }
      
      // 기존 매칭 조건 체크
      if (isMutualMatch(males[i], females[j], previousMatches)) {
        edges[i].push(j);
        validPairs++;
      }
    }
  }

  // 5-1. 각 남자별 edge 리스트를, 여자 weight 기준으로 정렬
  //      - weight 높은 상대 먼저 시도
  //      - 같은 weight 내에서는 랜덤 순서
  for (let i = 0; i < edges.length; i++) {
    edges[i].sort((aj, bj) => {
      const wa = typeof females[aj].weight === 'number' ? females[aj].weight : 0;
      const wb = typeof females[bj].weight === 'number' ? females[bj].weight : 0;
      if (wa !== wb) return wb - wa;
      return Math.random() - 0.5;
    });
  }
  
  console.log(`매칭 가능 쌍 분석 완료:`);
  console.log(`- 전체 가능한 쌍: ${totalPairs}개`);
  console.log(`- 과거 이력으로 필터링된 쌍: ${filteredByHistory}개`);
  console.log(`- 최종 유효한 쌍: ${validPairs}개`);
  // 6. 최대 매칭(DFS Hungarian)
  const matchTo = Array(females.length).fill(-1); // 여자 j -> 남자 i
  function dfs(u, visited) {
    for (const v of edges[u]) {
      if (visited[v]) continue;
      visited[v] = true;
      if (matchTo[v] === -1 || dfs(matchTo[v], visited)) {
        matchTo[v] = u;
        return true;
      }
    }
    return false;
  }
  let matchCount = 0;
  for (let u = 0; u < males.length; u++) {
    const visited = Array(females.length).fill(false);
    if (dfs(u, visited)) matchCount++;
  }
  // 7. 매칭 결과 추출 (남자 i <-> 여자 matchTo[j]=i)
  const matches = [];
  for (let j = 0; j < females.length; j++) {
    if (matchTo[j] !== -1) {
      matches.push([males[matchTo[j]].user_id, females[j].user_id]);
    }
  }
  // 8. 매칭 결과를 matching_history에 저장
  let success = 0;
  const matchedAt = new Date().toISOString();
  for (const [userA, userB] of matches) {
    // 매칭된 사용자들의 닉네임과 이메일 조회
    const maleProfile = profiles.find(p => p.user_id === userA);
    const femaleProfile = profiles.find(p => p.user_id === userB);
    
    // 사용자들의 이메일 조회
    const { data: maleUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', userA)
      .single();
    
    const { data: femaleUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', userB)
      .single();
    
    // matching_history에 기록 (이메일 정보 포함)
    const { error: insertError } = await supabase
      .from('matching_history')
      .insert({
        period_id: periodId,
        male_user_id: userA,
        female_user_id: userB,
        male_nickname: maleProfile?.nickname || null,
        female_nickname: femaleProfile?.nickname || null,
        male_gender: maleProfile?.gender || null,        // 성별 스냅샷 추가
        female_gender: femaleProfile?.gender || null,    // 성별 스냅샷 추가
        male_user_email: maleUser?.email || null,
        female_user_email: femaleUser?.email || null,
        created_at: getKSTISOString(),
        matched: true,
        matched_at: matchedAt,
      });
    if (insertError) {
      console.error(`매칭 저장 실패: ${userA} <-> ${userB}`, insertError);
    } else {
      success++;
      // matching_applications에도 매칭 여부/시각/상대방 user_id 갱신 (남/여 모두)
      const { error: updateA } = await supabase
        .from('matching_applications')
        .update({ matched: true, matched_at: matchedAt, partner_user_id: userB })
        .eq('user_id', userA)
        .eq('period_id', periodId);
      if (updateA) {
        console.error(`matching_applications 갱신 실패: ${userA}`, updateA);
      }
      const { error: updateB } = await supabase
        .from('matching_applications')
        .update({ matched: true, matched_at: matchedAt, partner_user_id: userA })
        .eq('user_id', userB)
        .eq('period_id', periodId);
      if (updateB) {
        console.error(`matching_applications 갱신 실패: ${userB}`, updateB);
      }
      // [추가] users 테이블 is_matched true로 업데이트 (성공)
      await supabase.from('users').update({ is_matched: true }).eq('id', userA);
      await supabase.from('users').update({ is_matched: true }).eq('id', userB);
    }
  }

  // 8-2. 매칭 실패자 처리 (남/여 모두)
  const matchedUserIds = new Set(matches.flat());
  const allUserIds = profiles.map(p => p.user_id);
  for (const userId of allUserIds) {
    if (!matchedUserIds.has(userId)) {
      // 매칭 실패자: matched=false, matched_at 기록
      const { error: updateFail } = await supabase
        .from('matching_applications')
        .update({ matched: false, matched_at: matchedAt })
        .eq('user_id', userId)
        .eq('period_id', periodId);
      if (updateFail) {
        console.error(`matching_applications(실패) 갱신 실패: ${userId}`, updateFail);
      }
      // [추가] users 테이블 is_matched false로 업데이트 (실패)
      await supabase.from('users').update({ is_matched: false }).eq('id', userId);
    }
  }

  // [추가] 회차 종료 시 모든 채팅 메시지를 읽음 처리
  try {
    console.log(`[매칭 완료] 회차 ${periodId} 종료 - 모든 채팅 메시지를 읽음 처리합니다.`);
    
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('period_id', periodId)
      .eq('is_read', false);
    
    if (chatError) {
      console.error(`[매칭 완료] 채팅 메시지 조회 실패:`, chatError);
    } else if (chatMessages && chatMessages.length > 0) {
      const { error: updateChatError } = await supabase
        .from('chat_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('period_id', periodId)
        .eq('is_read', false);
      
      if (updateChatError) {
        console.error(`[매칭 완료] 채팅 메시지 읽음 처리 실패:`, updateChatError);
      } else {
        console.log(`[매칭 완료] ${chatMessages.length}개의 채팅 메시지를 읽음 처리했습니다.`);
      }
    } else {
      console.log(`[매칭 완료] 읽지 않은 채팅 메시지가 없습니다.`);
    }
  } catch (error) {
    console.error(`[매칭 완료] 채팅 메시지 읽음 처리 중 오류:`, error);
    // 채팅 메시지 처리 실패해도 매칭 결과에는 영향 없음
  }

}

// 함수 export (스케줄러/관리자에서 사용)
module.exports = {
  sendMatchingResultEmails,
  computeMatchesForPeriod,
  computeMatchesForAllUsers,
};

// 직접 실행 시에만 main 함수 호출
if (require.main === module) {
  main();
} 