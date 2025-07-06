const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: __dirname + '/config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getKSTISOString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace('T', ' ').substring(0, 19);
}

// 랜덤 데이터 생성 유틸
const maleNames = ['민준','서준','도윤','시우','하준','주원','지호','지후','준우','현우','건우','우진','선우','유준','서진','연우','윤우','은우','수호','시윤'];
const femaleNames = ['서연','지우','서윤','하은','지민','수아','하윤','지윤','채원','예은','민서','소율','윤서','서현','예린','다은','지아','가은','수빈','유진'];
const jobTypes = ['일반직', '기술직', '기타'];

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomEmail(name, idx) { return `test${name}${idx}${randomInt(100,999)}@test.com`; }
function randomNickname(name, idx) { return `${name}${idx}`; }
function randomYear() {
  return randomInt(1985, 2003);
}
function randomHeight() {
  return randomInt(150, 199);
}
function randomGender() {
  return Math.random() < 0.5 ? 'male' : 'female';
}
function randomArray(arr, min, max) {
  const n = randomInt(min, max);
  const set = new Set();
  while (set.size < n) set.add(randomPick(arr));
  return Array.from(set);
}

async function getOptionsFromDB() {
  // DB에서 남/여 체형, 직군 옵션 동적 조회
  const maleBodyTypesRes = await supabase
    .from('profile_options')
    .select('option_text')
    .eq('category_id', 8)
    .order('display_order');
  const femaleBodyTypesRes = await supabase
    .from('profile_options')
    .select('option_text')
    .eq('category_id', 11)
    .order('display_order');
  const jobTypesRes = await supabase
    .from('profile_options')
    .select('option_text')
    .eq('category_id', 7)
    .order('display_order');
  if (maleBodyTypesRes.error || femaleBodyTypesRes.error || jobTypesRes.error) {
    throw new Error('옵션 조회 실패');
  }
  return {
    maleBodyTypes: maleBodyTypesRes.data.map(o=>o.option_text),
    femaleBodyTypes: femaleBodyTypesRes.data.map(o=>o.option_text),
    jobTypes: jobTypesRes.data.map(o=>o.option_text),
  };
}

async function main() {
  // 0. 옵션 동적 조회
  const { maleBodyTypes, femaleBodyTypes, jobTypes } = await getOptionsFromDB();
  // 1. 더미 유저 생성
  const males = [], females = [];
  for (let i = 0; i < 1000; i++) {
    const id = uuidv4();
    const name = randomPick(maleNames);
    const birth_year = randomYear();
    const nowYear = new Date().getFullYear();
    const age = nowYear - birth_year + 1;
    const noPreference = Math.random() < 0.1; // 10% 확률로 상관없음
    let preferred_age_min, preferred_age_max, preferred_height_min, preferred_height_max;
    if (noPreference) {
      preferred_age_min = -99;
      preferred_age_max = 99;
      preferred_height_min = 150;
      preferred_height_max = 199;
    } else {
      preferred_age_min = randomInt(-10, 10);
      preferred_age_max = randomInt(preferred_age_min, 10);
      preferred_height_min = randomInt(150, 199);
      preferred_height_max = randomInt(preferred_height_min, 199);
    }
    males.push({
      id,
      email: randomEmail(name, i),
      password: 'dummy',
      is_verified: true,
      is_active: true,
      is_admin: false,
      created_at: getKSTISOString(),
      updated_at: getKSTISOString(),
      profile: {
        user_id: id,
        nickname: randomNickname(name, i),
        gender: 'male',
        birth_year,
        height: randomHeight(),
        body_type: randomPick(maleBodyTypes),
        job_type: randomPick(jobTypes),
        preferred_age_min,
        preferred_age_max,
        preferred_height_min,
        preferred_height_max,
        preferred_body_types: JSON.stringify(randomArray(femaleBodyTypes, 1, 3)),
        preferred_job_types: JSON.stringify(randomArray(jobTypes, 1, 2)),
        created_at: getKSTISOString(),
        updated_at: getKSTISOString(),
      }
    });
  }
  for (let i = 0; i < 1000; i++) {
    const id = uuidv4();
    const name = randomPick(femaleNames);
    const birth_year = randomYear();
    const nowYear = new Date().getFullYear();
    const age = nowYear - birth_year + 1;
    const noPreference = Math.random() < 0.1; // 10% 확률로 상관없음
    let preferred_age_min, preferred_age_max, preferred_height_min, preferred_height_max;
    if (noPreference) {
      preferred_age_min = -99;
      preferred_age_max = 99;
      preferred_height_min = 150;
      preferred_height_max = 199;
    } else {
      preferred_age_min = randomInt(-10, 10);
      preferred_age_max = randomInt(preferred_age_min, 10);
      preferred_height_min = randomInt(150, 199);
      preferred_height_max = randomInt(preferred_height_min, 199);
    }
    females.push({
      id,
      email: randomEmail(name, i),
      password: 'dummy',
      is_verified: true,
      is_active: true,
      is_admin: false,
      created_at: getKSTISOString(),
      updated_at: getKSTISOString(),
      profile: {
        user_id: id,
        nickname: randomNickname(name, i),
        gender: 'female',
        birth_year,
        height: randomHeight(),
        body_type: randomPick(femaleBodyTypes),
        job_type: randomPick(jobTypes),
        preferred_age_min,
        preferred_age_max,
        preferred_height_min,
        preferred_height_max,
        preferred_body_types: JSON.stringify(randomArray(maleBodyTypes, 1, 3)),
        preferred_job_types: JSON.stringify(randomArray(jobTypes, 1, 2)),
        created_at: getKSTISOString(),
        updated_at: getKSTISOString(),
      }
    });
  }

  // 2. DB에 insert
  const users = [...males, ...females];
  const profiles = users.map(u => u.profile);
  console.log(`users: ${users.length}, profiles: ${profiles.length}`);
  // users
  for (let i = 0; i < users.length; i += 50) {
    const batch = users.slice(i, i+50).map(u => {
      const { profile, ...rest } = u;
      return rest;
    });
    const { error } = await supabase.from('users').insert(batch);
    if (error) console.error('users insert error:', error);
  }
  // (필요시 FK 커밋 지연 방지용 대기)
  // await new Promise(res => setTimeout(res, 1000));
  // user_profiles
  for (let i = 0; i < profiles.length; i += 50) {
    const batch = profiles.slice(i, i+50);
    const { error } = await supabase.from('user_profiles').insert(batch);
    if (error) {
      console.error('profiles insert error:', error);
      console.error('실패 batch:', JSON.stringify(batch, null, 2));
    }
  }
  console.log('더미 유저/프로필 생성 완료');

  // 3. matching_log 최신 회차 id
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

  // 4. 남자 80명, 여자 50명 신청자로 선정
  const maleApplicants = males.slice(0, 80);
  const femaleApplicants = females.slice(0, 50);
  const now = getKSTISOString();
  const applications = [
    ...maleApplicants.map(u => ({ user_id: u.id, period_id: periodId, applied: true, applied_at: now, cancelled: false })),
    ...femaleApplicants.map(u => ({ user_id: u.id, period_id: periodId, applied: true, applied_at: now, cancelled: false })),
  ];
  for (let i = 0; i < applications.length; i += 50) {
    const batch = applications.slice(i, i+50);
    const { error } = await supabase.from('matching_applications').insert(batch);
    if (error) console.error('applications insert error:', error);
  }
  console.log('신청자 insert 완료');

  // 5. 남자 10명, 여자 5명 취소 처리
  const maleCancel = maleApplicants.slice(0, 10);
  const femaleCancel = femaleApplicants.slice(0, 5);
  for (const u of [...maleCancel, ...femaleCancel]) {
    const { error } = await supabase
      .from('matching_applications')
      .update({ cancelled: true, cancelled_at: getKSTISOString() })
      .eq('user_id', u.id)
      .eq('period_id', periodId);
    if (error) console.error('취소 update error:', error);
  }
  console.log('취소 처리 완료 (남 10, 여 5)');

  // 6. user_profiles 생성 결과 확인
  // test로 시작하는 이메일의 user_id 목록 조회
  const { data: testUsers, error: testUserError } = await supabase
    .from('users')
    .select('id')
    .like('email', 'test%');
  if (testUserError) {
    console.error('user_profiles 생성 확인용 유저 조회 오류:', testUserError);
    return;
  }
  const testUserIds = testUsers.map(u => u.id);
  if (testUserIds.length === 0) {
    console.log('test 이메일 유저 없음');
    return;
  }
  // user_profiles에서 해당 user_id 개수 조회 (50개씩 나눠서)
  let totalCount = 0;
  let profCountError = null;
  for (let i = 0; i < testUserIds.length; i += 50) {
    const batchIds = testUserIds.slice(i, i+50);
    const { count, error } = await supabase
      .from('user_profiles')
      .select('user_id', { count: 'exact', head: true })
      .in('user_id', batchIds);
    if (error) {
      profCountError = error;
      console.error('user_profiles 개수 조회 오류 (batch):', error);
    } else {
      totalCount += count;
    }
  }
  if (profCountError) {
    console.error('user_profiles 개수 조회 중 일부 오류 발생');
  } else {
    console.log(`user_profiles에 생성된 test 더미 프로필 수: ${totalCount} / ${testUserIds.length}`);
  }
}

main(); 