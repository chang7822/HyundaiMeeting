const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  let totalDeleted = 0;
  while (true) {
    // 1. test로 시작하는 이메일의 유저 id 최대 1000개씩 조회
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .like('email', 'test%')
      .limit(1000);
    if (error) {
      console.error('유저 조회 오류:', error);
      return;
    }
    if (!users || users.length === 0) {
      console.log('삭제할 test 더미 유저가 더 이상 없습니다.');
      break;
    }
    const userIds = users.map(u => u.id);
    totalDeleted += userIds.length;
    console.log(`이번 배치 삭제 대상 유저 수: ${userIds.length}`);

    // 2. user_profiles 삭제 (batch)
    for (let i = 0; i < userIds.length; i += 50) {
      const batchIds = userIds.slice(i, i+50);
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .in('user_id', batchIds);
      if (error) console.error('user_profiles 삭제 오류 (batch):', error);
    }
    console.log('user_profiles 삭제 완료');

    // 3. matching_applications 삭제 (batch)
    for (let i = 0; i < userIds.length; i += 50) {
      const batchIds = userIds.slice(i, i+50);
      const { error } = await supabase
        .from('matching_applications')
        .delete()
        .in('user_id', batchIds);
      if (error) console.error('matching_applications 삭제 오류 (batch):', error);
    }
    console.log('matching_applications 삭제 완료');

    // 4. matching_history 삭제 (male_user_id, female_user_id 각각 batch)
    for (let i = 0; i < userIds.length; i += 50) {
      const batchIds = userIds.slice(i, i+50);
      const { error: hist1 } = await supabase
        .from('matching_history')
        .delete()
        .in('male_user_id', batchIds);
      if (hist1) console.error('matching_history 삭제 오류 (male_user_id, batch):', hist1);
      const { error: hist2 } = await supabase
        .from('matching_history')
        .delete()
        .in('female_user_id', batchIds);
      if (hist2) console.error('matching_history 삭제 오류 (female_user_id, batch):', hist2);
    }
    console.log('matching_history 삭제 완료');

    // 5. users 삭제 (batch)
    for (let i = 0; i < userIds.length; i += 50) {
      const batchIds = userIds.slice(i, i+50);
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', batchIds);
      if (error) console.error('users 삭제 오류 (batch):', error);
    }
    console.log('users 삭제 완료');
  }

  // 삭제 후 남은 test 유저 수 출력
  const { data: remain, error: remainErr } = await supabase
    .from('users')
    .select('id')
    .like('email', 'test%');
  if (remainErr) {
    console.error('삭제 후 남은 유저 조회 오류:', remainErr);
  } else {
    console.log('삭제 후 남은 test 유저 수:', remain?.length);
  }
  console.log('총 삭제된 test 더미 유저 수:', totalDeleted);
  console.log('test 더미 유저 및 관련 데이터 삭제 완료');
}

main(); 