const { createClient } = require('@supabase/supabase-js');

// 운영/개발 모두 환경변수로만 Supabase 연결을 제어한다.
// - Render 운영 서버: Render Environment 변수에서 값을 읽음
// - 로컬 개발: backend/config.env 에서 값을 읽도록 서버/스케줄러에서 dotenv.config() 호출
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다. ' +
    'backend/config.env 또는 Render 환경변수를 확인해주세요.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };