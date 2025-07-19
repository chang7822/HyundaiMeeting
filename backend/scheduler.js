// 매칭 회차 스케줄러: matching_log의 matching_run 시각에 맞춰 matching-algorithm.js 실행
const cron = require('node-cron');
const { exec } = require('child_process');
const { supabase } = require('./database');

let lastExecutedId = null; // 중복 실행 방지용
let lastResetExecuted = null; // 회차 종료 초기화 중복 실행 방지용
let lastEmailSentId = null; // 이메일 발송 중복 방지용

cron.schedule('* * * * *', async () => {
  try {
    const { data, error } = await supabase
      .from('matching_log')
      .select('id, matching_run, matching_announce, executed, finish')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return;

    const now = new Date();
    const runTime = new Date(data.matching_run);
    // executed가 false이고, matching_run 시각이 지났고, 아직 실행하지 않은 경우에만 실행
    // 30초 여유를 두어 정확한 시각에 실행되도록 함
    const executionTime = new Date(runTime.getTime() + 30 * 1000); // 30초 후 실행
    if (!data.executed && now >= executionTime && lastExecutedId !== data.id) {
      console.log(`[스케줄러] 매칭 회차 ${data.id} 실행 (예정: ${runTime.toISOString()}, 실제: ${now.toISOString()})`);
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
          } else {
            lastExecutedId = data.id; // 실행 완료 표시
          }
        }
      });
    }
    // [추가] 회차 종료(마감) 시 users 테이블 초기화
    if (data.finish) {
      const finishTime = new Date(data.finish);
      // 회차 종료 시각이 지났고, 다음 회차가 아직 생성되지 않은 경우
      if (now > finishTime) {
        // matching_log에 finish가 더 큰 row가 있는지 확인(다음 회차)
        const { data: nextLog, error: nextLogError } = await supabase
          .from('matching_log')
          .select('id')
          .gt('id', data.id)
          .limit(1)
          .maybeSingle();
        if (!nextLog && lastResetExecuted !== data.id) {
          // 다음 회차가 없고, 아직 초기화하지 않은 경우에만 실행
          console.log('[스케줄러] 회차 종료 감지, users 테이블 is_applied, is_matched 초기화');
          await supabase.from('users').update({ is_applied: false, is_matched: null });
          lastResetExecuted = data.id; // 초기화 완료 표시
        }
      }
    }

    // [추가] 매칭 결과 이메일 발송 (matching_announce 시각)
    if (data.matching_announce) {
      const announceTime = new Date(data.matching_announce);
      const emailExecutionTime = new Date(announceTime.getTime() + 30 * 1000); // 30초 후 실행
      
      if (now >= emailExecutionTime && lastEmailSentId !== data.id) {
        console.log(`[스케줄러] 매칭 결과 이메일 발송 시작 (예정: ${announceTime.toISOString()}, 실제: ${now.toISOString()})`);
        
        // 매칭 결과 이메일 발송 함수 실행
        const { sendMatchingResultEmails } = require('./matching-algorithm');
        try {
          await sendMatchingResultEmails();
          console.log('[스케줄러] 매칭 결과 이메일 발송 완료');
          lastEmailSentId = data.id; // 이메일 발송 완료 표시
        } catch (err) {
          console.error('[스케줄러] 매칭 결과 이메일 발송 오류:', err);
        }
      }
    }
  } catch (e) {
    console.error('[스케줄러] 오류:', e);
  }
});

console.log('[스케줄러] 매칭 회차 스케줄러가 시작되었습니다.'); 