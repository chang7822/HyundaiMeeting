// 매칭 회차 스케줄러: matching_log의 matching_run 시각에 맞춰 matching-algorithm.js 실행
const cron = require('node-cron');
const { exec } = require('child_process');
const { supabase } = require('./database');

let lastPeriodStartReset = null; // 회차 시작 초기화 중복 실행 방지용

cron.schedule('* * * * *', async () => {
  try {
    const { data, error } = await supabase
      .from('matching_log')
      .select('id, matching_run, matching_announce, executed, email_sent, finish, application_start')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return;

    const now = new Date();
    console.log(`[스케줄러][DEBUG] now: ${now.toISOString()}`);
    console.log('[스케줄러][DEBUG] matching_log row:', data);
    const runTime = new Date(data.matching_run);
    const executionTime = new Date(runTime.getTime() + 30 * 1000);
    console.log(`[스케줄러][DEBUG] runTime: ${runTime.toISOString()}, executionTime: ${executionTime.toISOString()}, executed: ${data.executed}`);
    // executed가 false이고, matching_run 시각이 지났고, 아직 실행하지 않은 경우에만 실행
    // 30초 여유를 두어 정확한 시각에 실행되도록 함
    if (!data.executed && now >= executionTime) {
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
            console.log(`[스케줄러] 매칭 회차 ${data.id} 실행 완료 표시`);
          }
        }
      });
    }
    
    // [추가] 회차 시작 시 users 테이블 초기화 (신청 기간 시작 시점)
    if (data.application_start) {
      const startTime = new Date(data.application_start);
      const resetExecutionTime = new Date(startTime.getTime() + 30 * 1000); // 30초 후 실행
      
      if (now >= resetExecutionTime && lastPeriodStartReset !== data.id) {
        console.log(`[스케줄러] 회차 ${data.id} 신청 기간 시작, users 테이블 is_applied, is_matched 초기화`);
        await supabase.from('users').update({ is_applied: false, is_matched: null }).not('id', 'is', null);
        lastPeriodStartReset = data.id; // 초기화 완료 표시
      }
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
        if (!nextLog) {
          // 다음 회차가 없으면 무조건 초기화 실행
          console.log('[스케줄러] 회차 종료 감지, users 테이블 is_applied, is_matched 초기화');
          const { error: resetError } = await supabase
            .from('users')
            .update({ is_applied: false, is_matched: null })
            .not('id', 'is', null); // 모든 행을 업데이트하기 위한 WHERE 절
          if (resetError) {
            console.error('[스케줄러] users 테이블 초기화 오류:', resetError);
          } else {
            console.log('[스케줄러] users 테이블 초기화 완료');
          }
        }
      }
    }

    // [추가] 매칭 결과 이메일 발송 (matching_announce 시각)
    if (data.matching_announce) {
      const announceTime = new Date(data.matching_announce);
      const emailExecutionTime = new Date(announceTime.getTime() + 30 * 1000); // 30초 후 실행
      
      if (!data.email_sent && now >= emailExecutionTime) {
        console.log(`[스케줄러] 매칭 결과 이메일 발송 시작 (예정: ${announceTime.toISOString()}, 실제: ${now.toISOString()})`);
        
        // 매칭 결과 이메일 발송 함수 실행
        const { sendMatchingResultEmails } = require('./matching-algorithm');
        try {
          await sendMatchingResultEmails();
          console.log('[스케줄러] 매칭 결과 이메일 발송 완료');
          
          // 이메일 발송 완료 후 email_sent true로 업데이트
          const { error: updateError } = await supabase
            .from('matching_log')
            .update({ email_sent: true })
            .eq('id', data.id);
          if (updateError) {
            console.error(`[스케줄러] email_sent 업데이트 오류:`, updateError);
          } else {
            console.log(`[스케줄러] 매칭 회차 ${data.id} 이메일 발송 완료 표시`);
          }
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