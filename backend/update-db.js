const { supabase } = require('./database');
const fs = require('fs');

async function updateDatabase() {
  try {
    console.log('데이터베이스 업데이트 시작...');
    
    // SQL 파일 읽기
    const sql = fs.readFileSync('./complete-database-setup.sql', 'utf8');
    
    // SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('데이터베이스 업데이트 실패:', error);
      return;
    }
    
    console.log('데이터베이스 업데이트 완료:', data);
  } catch (error) {
    console.error('스크립트 실행 오류:', error);
  }
}

updateDatabase(); 