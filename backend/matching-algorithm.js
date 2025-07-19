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

// 매칭 조건 체크 함수
function isMutualMatch(a, b) {
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
  return true;
}



// 매칭 결과 이메일 발송 함수 (스케줄러에서 호출)
async function sendMatchingResultEmails() {
  try {
    // 1. 최신 회차 id 조회
    const { data: logRows, error: logError } = await supabase
      .from('matching_log')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    if (logError || !logRows || logRows.length === 0) {
      console.error('매칭 회차 조회 실패:', logError);
      return;
    }
    const periodId = logRows[0].id;

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

async function main() {
  // 1. 최신 회차 id 조회
  const { data: logRows, error: logError } = await supabase
    .from('matching_log')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);
  if (logError || !logRows || logRows.length === 0) {
    console.error('매칭 회차 조회 실패:', logError);
    return;
  }
  const periodId = logRows[0].id;

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
  if (userIds.length < 2) {
    console.log('매칭할 신청자가 2명 미만입니다.');
    return;
  }

  // 3. 신청자 프로필/선호도 정보 조회 (batch)
  let profiles = [];
  for (let i = 0; i < userIds.length; i += 50) {
    const batchIds = userIds.slice(i, i+50);
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
      ...row.profile_snapshot,
      ...row.preference_snapshot
    })));
  }

  // 4. 남/여 분리
  const males = profiles.filter(p => p.gender === 'male');
  const females = profiles.filter(p => p.gender === 'female');
  // 5. 그래프(edge) 생성: 남-여 쌍 중 양방향 만족하는 경우만
  const edges = Array(males.length).fill(0).map(() => []); // edges[i] = [여자 인덱스...]
  for (let i = 0; i < males.length; i++) {
    for (let j = 0; j < females.length; j++) {
      if (isMutualMatch(males[i], females[j])) {
        edges[i].push(j);
      }
    }
  }
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
    // matching_history에 기록
    const { error: insertError } = await supabase
      .from('matching_history')
      .insert({
        period_id: periodId,
        male_user_id: userA,
        female_user_id: userB,
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

  // 9. 매칭 결과 이메일 발송은 matching_announce 시각에 별도로 처리
  console.log('\n📧 매칭 결과 이메일 발송은 matching_announce 시각에 별도 스케줄러에서 처리됩니다.');

  // 10. 결과를 마크다운 파일로 저장 (한 커플당 2행)
  let md = '| 남자 프로필키 | 여자 선호키 | 남자 직군 | 여자 선호직군 | 남자 체형 | 여자 선호체형 | 여자 프로필키 | 남자 선호키 | 여자 직군 | 남자 선호직군 | 여자 체형 | 남자 선호체형 |\n';
  md += '|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  matches.forEach(([a, b], idx) => {
    const male = males.find(m => m.user_id === a);
    const female = females.find(f => f.user_id === b);
    if (male && female) {
      // 1행: 남자 기준
      md += `| ${male.height} | ${female.preferred_height_min}~${female.preferred_height_max} | ${male.job_type} | ${female.preferred_job_types} | ${male.body_type} | ${female.preferred_body_types} |`;
      md += ' |'; // 여자 기준 칸 비움
      md += '\n';
      // 2행: 여자 기준
      md += `| | | | | | | ${female.height} | ${male.preferred_height_min}~${male.preferred_height_max} | ${female.job_type} | ${male.preferred_job_types} | ${female.body_type} | ${male.preferred_body_types} |\n`;
    }
  });
  fs.writeFileSync('matching_result.md', md, 'utf8');
  console.log(`matching_result.md 파일로 저장 완료 (총 ${matches.length}쌍, DB 저장 성공: ${success})`);
}

// 함수 export (스케줄러에서 사용)
module.exports = {
  sendMatchingResultEmails
};

// 직접 실행 시에만 main 함수 호출
if (require.main === module) {
  main();
} 