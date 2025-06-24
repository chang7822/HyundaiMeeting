const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Supabase 클라이언트 테스트...');

const supabaseUrl = 'https://ikhvppldbdljgwrdnapc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraHZwcGxkYmRsamd3cmRuYXBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc2NjYwNCwiZXhwIjoyMDY2MzQyNjA0fQ.HYeGhUM8IBUHtxs-FCevaZHj14WCCs1QmaH0Pmaz5nQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Supabase 클라이언트 생성 완료');
    
    // 간단한 쿼리 테스트
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ 쿼리 에러:', error.message);
    } else {
      console.log('✅ Supabase 연결 성공!');
      console.log('데이터:', data);
    }
  } catch (err) {
    console.error('❌ 연결 실패:', err.message);
  }
}

testConnection(); 