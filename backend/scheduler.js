// 매칭 회차 스케줄러: matching_log의 matching_run 시각에 맞춰 matching-algorithm.js 실행
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// 로컬 개발 시 backend/config.env 를 읽어서 SUPABASE_* 등 환경변수 세팅
// - Render 운영 서버에서는 config.env 파일이 없어도, Render Environment 변수에서 값을 읽기 때문에 문제 없음
dotenv.config({ path: path.join(__dirname, 'config.env') });

const { supabase } = require('./database');

// 환경변수로 실행 주기 설정 (기본값: 10초마다)
const scheduleInterval = process.env.SCHEDULER_INTERVAL || '*/10 * * * * *';
console.log(`[스케줄러] 실행 주기: ${scheduleInterval}`);

cron.schedule(scheduleInterval, async () => {
  try {
    const { data, error } = await supabase
      .from('matching_log')
      .select('id, matching_run, matching_announce, executed, email_sent, finish, application_start')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return;

    const now = new Date();
    const runTime = new Date(data.matching_run);
    const executionTime = new Date(runTime.getTime()); // 정시에 실행
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
      const resetExecutionTime = new Date(startTime.getTime() - 10 * 1000); // 10초 전 실행으로 변경

      if (now >= resetExecutionTime) {
        // DB에서 마지막으로 초기화된 회차 ID 조회
        let lastPeriodStartResetId = null;
        try {
          const { data: settingRow, error: settingError } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'last_period_start_reset_id')
            .maybeSingle();

          if (!settingError && settingRow && settingRow.value && typeof settingRow.value.periodId === 'number') {
            lastPeriodStartResetId = settingRow.value.periodId;
          }
        } catch (infoErr) {
          console.error('[스케줄러] last_period_start_reset_id 조회 오류:', infoErr);
        }

        if (lastPeriodStartResetId !== data.id) {
          console.log(`[스케줄러] 회차 ${data.id} users 테이블 초기화 실행`);
          const { data: resetResult, error: resetError } = await supabase
            .from('users')
            .update({ is_applied: false, is_matched: null })
            .not('id', 'is', null)
            .select('id');

          if (resetError) {
            console.error(`[스케줄러] users 테이블 초기화 실패:`, resetError);
          } else {
            console.log(`[스케줄러] users 테이블 초기화 성공: ${resetResult?.length || 0}명 사용자 상태 리셋`);
            // 초기화 완료 후 app_settings에 기록
            try {
              const value = { periodId: data.id };
              await supabase
                .from('app_settings')
                .upsert(
                  {
                    key: 'last_period_start_reset_id',
                    value,
                  },
                  { onConflict: 'key' }
                );
            } catch (upsertErr) {
              console.error('[스케줄러] last_period_start_reset_id 업데이트 오류:', upsertErr);
            }
          }
        }
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
          // console.log('[스케줄러] 회차 종료 감지, users 테이블 is_applied, is_matched 초기화');
          const { error: resetError } = await supabase
            .from('users')
            .update({ is_applied: false, is_matched: null })
            .not('id', 'is', null); // 모든 행을 업데이트하기 위한 WHERE 절
          if (resetError) {
            console.error('[스케줄러] users 테이블 초기화 오류:', resetError);
          } else {
            // console.log('[스케줄러] users 테이블 초기화 완료');
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

// 정지 해제 스케줄러: 10초마다 정지 기간이 만료된 사용자들의 정지를 해제
cron.schedule(scheduleInterval, async () => {
  try {
    // console.log('[스케줄러] 정지 해제 작업 시작');
    
    const now = new Date();
    
    // 정지 기간이 만료된 사용자들 조회
    const { data: expiredBans, error: selectError } = await supabase
      .from('users')
      .select('id, banned_until')
      .eq('is_banned', true)
      .not('banned_until', 'is', null)
      .lte('banned_until', now.toISOString());
    
    if (selectError) {
      // console.error('[스케줄러] 정지 만료 사용자 조회 오류:', selectError);
      return;
    }
    
    if (!expiredBans || expiredBans.length === 0) {
      // console.log('[스케줄러] 정지 해제할 사용자가 없습니다.');
      return;
    }
    
    // 정지 해제할 사용자 ID 목록
    const userIds = expiredBans.map(user => user.id);
    
    // 정지 해제 실행
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        is_banned: false,
        banned_until: null 
      })
      .in('id', userIds);
    
    if (updateError) {
      console.error('[스케줄러] 정지 해제 업데이트 오류:', updateError);
    } else {
      console.log(`[스케줄러] 정지 해제 완료: ${expiredBans.length}명`);
      expiredBans.forEach(user => {
        console.log(`  - ${user.nickname} (ID: ${user.id}): ${user.banned_until} → 해제`);
      });
    }
    
  } catch (error) {
    console.error('[스케줄러] 정지 해제 작업 오류:', error);
  }
});

console.log('[스케줄러] 매칭 회차 스케줄러가 시작되었습니다.');
console.log('[스케줄러] 정지 해제 스케줄러가 시작되었습니다. (10초마다)'); 