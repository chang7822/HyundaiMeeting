// 매칭 회차 스케줄러: matching_log의 matching_run 시각에 맞춰 matching-algorithm.js 실행
const cron = require('node-cron');
const { exec } = require('child_process');
const { supabase } = require('./database');

let lastExecutedId = null; // 중복 실행 방지용

cron.schedule('* * * * *', async () => {
  try {
    const { data, error } = await supabase
      .from('matching_log')
      .select('id, matching_run, executed')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return;

    const now = new Date();
    const runTime = new Date(data.matching_run);
    // executed가 false이고, 1분 이내(±30초)면 실행
    if (!data.executed && Math.abs(now - runTime) < 60 * 1000) {
      console.log(`[스케줄러] 매칭 회차 ${data.id} 실행: ${runTime.toISOString()}`);
      exec('node matching-algorithm.js', async (err, stdout, stderr) => {
        if (err) {
          console.error('매칭 알고리즘 실행 오류:', err);
        } else {
          console.log('매칭 알고리즘 실행 결과:', stdout);
          // 실행 완료 후 executed true로 업데이트
          const { error: updateError } = await supabase
            .from('matching_log')
            .update({ executed: true })
            .eq('id', data.id);
          if (updateError) {
            console.error(`[스케줄러] executed 업데이트 오류:`, updateError);
          }
        }
      });
    }
  } catch (e) {
    console.error('[스케줄러] 오류:', e);
  }
});

console.log('[스케줄러] 매칭 회차 스케줄러가 시작되었습니다.'); 