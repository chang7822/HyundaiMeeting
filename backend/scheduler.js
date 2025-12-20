// 매칭 회차 스케줄러: matching_log의 matching_run 시각에 맞춰 matching-algorithm.js 실행
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// 로컬 개발 시 backend/config.env 를 읽어서 SUPABASE_* 등 환경변수 세팅
// - Render 운영 서버에서는 config.env 파일이 없어도, Render Environment 변수에서 값을 읽기 때문에 문제 없음
dotenv.config({ path: path.join(__dirname, 'config.env') });

const { supabase } = require('./database');
const { sendPushToAllUsers, sendPushToUsers } = require('./pushService');
const notificationRoutes = require('./routes/notifications');

// 추가 매칭 도전 기능 활성화 여부 확인
async function isExtraMatchingFeatureEnabled() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'extra_matching_enabled')
      .maybeSingle();

    if (error) {
      console.error('[scheduler] extra_matching_enabled 조회 오류:', error);
      return true; // 에러 시 기본값 true (활성화)
    }

    if (!data || !data.value) {
      return true;
    }

    return data.value.enabled !== false;
  } catch (e) {
    console.error('[scheduler] extra_matching_enabled 조회 예외:', e);
    return true;
  }
}

// status 기반으로 현재 회차/다음 회차를 계산하는 내부 헬퍼 (matching.js와 동일 로직)
function computeCurrentAndNextFromLogs(logs) {
  if (!logs || logs.length === 0) {
    return { current: null, next: null };
  }

  let current = null;
  let next = null;

  // logs는 id 내림차순(가장 큰 id가 0번 인덱스)으로 정렬되어 있음
  const readyLogs = logs.filter(log => log.status === '준비중');
  const activeLogs = logs.filter(log => log.status === '진행중' || log.status === '발표완료');
  const finishedLogs = logs.filter(log => log.status === '종료');

  if (activeLogs.length > 0) {
    // 진행중/발표완료 회차가 하나 이상 있으면, 가장 최신 회차를 현재 회차로 사용
    current = activeLogs[0];
  } else if (finishedLogs.length > 0 && readyLogs.length > 0) {
    // 종료된 회차가 있고, 그 이후에 준비중인 회차들이 있다면,
    // "마지막으로 종료된 회차" 이후의 준비중 회차들 중 가장 가까운(가장 오래된) 회차를 현재 회차로 선택
    const latestFinished = finishedLogs[0]; // logs가 id DESC이므로 0번째가 가장 최근 종료
    let candidate = null;
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      if (log.status === '준비중' && log.id > latestFinished.id) {
        candidate = log; // 뒤에서 앞으로 오므로 마지막으로 대입되는 것이 id가 가장 작은 준비중 회차
      }
    }
    current = candidate || latestFinished;
  } else if (readyLogs.length > 0) {
    // 전부 준비중인 경우: 가장 오래된 준비중 회차를 현재 회차로 간주
    current = readyLogs[readyLogs.length - 1];
  } else {
    // 모든 회차가 종료되었거나, 정의되지 않은 status만 있는 경우: 가장 최신 회차를 현재 회차로 사용
    current = logs[0];
  }

  // 현재 회차가 발표완료 상태인 경우에만 NEXT(다음 회차) 후보 탐색
  if (current && current.status === '발표완료') {
    let candidate = null;
    for (const log of logs) {
      if (log.status === '준비중' && log.id > current.id) {
        // current.id보다 큰(미래) 준비중 회차 중에서 가장 id가 작은 회차를 NEXT로 선택
        if (!candidate || log.id < candidate.id) {
          candidate = log;
        }
      }
    }
    next = candidate;
  }

  return { current, next };
}

// 환경변수로 실행 주기 설정 (기본값: 10초마다)
const scheduleInterval = process.env.SCHEDULER_INTERVAL || '*/10 * * * * *';
console.log(`[스케줄러] 실행 주기: ${scheduleInterval}`);

cron.schedule(scheduleInterval, async () => {
  try {
    // 0. status 자동 갱신 (준비중 → 진행중 → 발표완료 → 종료)
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      // 0-1) 종료 처리: finish 시각이 지난 진행중/발표완료 회차는 종료
      const { error: finishUpdateError } = await supabase
        .from('matching_log')
        .update({ status: '종료' })
        .neq('status', '종료')
        .not('finish', 'is', null)
        .lte('finish', nowIso);
      if (finishUpdateError) {
        console.error('[스케줄러] matching_log status 종료 업데이트 오류:', finishUpdateError);
      }

      // 0-2) 발표완료 처리: matching_announce 시각이 지난 진행중 회차
      const { error: announceUpdateError } = await supabase
        .from('matching_log')
        .update({ status: '발표완료' })
        .eq('status', '진행중')
        .not('matching_announce', 'is', null)
        .lte('matching_announce', nowIso);
      if (announceUpdateError) {
        console.error('[스케줄러] matching_log status 발표완료 업데이트 오류:', announceUpdateError);
      }

      // 0-3) 진행중 처리: 신청 시작~마감 사이의 준비중 회차
      const { error: runningUpdateError } = await supabase
        .from('matching_log')
        .update({ status: '진행중' })
        .eq('status', '준비중')
        .not('application_start', 'is', null)
        .lte('application_start', nowIso);
      if (runningUpdateError) {
        console.error('[스케줄러] matching_log status 진행중 업데이트 오류:', runningUpdateError);
      }
    } catch (statusErr) {
      console.error('[스케줄러] matching_log status 자동 갱신 중 오류:', statusErr);
    }

    const { data: logs, error } = await supabase
      .from('matching_log')
      .select('*')
      .order('id', { ascending: false });
    if (error || !logs || logs.length === 0) return;

    const { current } = computeCurrentAndNextFromLogs(logs);
    if (!current) return;

    const runTime = new Date(current.matching_run);
    const executionTime = new Date(runTime.getTime()); // 정시에 실행
    // executed가 false이고, matching_run 시각이 지났고, 아직 실행하지 않은 경우에만 실행
    if (!current.executed && now >= executionTime) {
      // ✅ 실행 직전에 executed 플래그를 먼저 true로 올려서
      //    10초 주기의 스케줄러가 같은 회차를 여러 번 실행하지 않도록 방지
      try {
        const { error: preUpdateError } = await supabase
          .from('matching_log')
          .update({ executed: true })
          .eq('id', current.id);
        if (preUpdateError) {
          console.error('[스케줄러] executed 사전 업데이트 오류:', preUpdateError);
        } else {
          console.log(`[스케줄러] 매칭 회차 ${current.id} executed 플래그 선반영 후 실행`);
        }
      } catch (flagErr) {
        console.error('[스케줄러] executed 사전 업데이트 중 예외:', flagErr);
      }

      console.log(`[스케줄러] 매칭 회차 ${current.id} 실행 (예정: ${runTime.toISOString()}, 실제: ${now.toISOString()})`);
      // current.id를 인자로 넘겨서 해당 회차만 대상으로 매칭 알고리즘 실행
      exec(`node matching-algorithm.js ${current.id}`, async (err, stdout, stderr) => {
        if (err) {
          console.error('매칭 알고리즘 실행 오류:', err);
        } else {
          console.log('매칭 알고리즘 실행 결과:', stdout);
        }
        // 콜백 내 executed 업데이트는 이미 선반영된 상태이므로, 중복 호출이 되더라도 영향 없음(로그만 참고용)
        try {
          const { error: updateError } = await supabase
            .from('matching_log')
            .update({ executed: true })
            .eq('id', current.id);
          if (updateError) {
            console.error(`[스케줄러] executed 업데이트 오류:`, updateError);
          } else {
            console.log(`[스케줄러] 매칭 회차 ${current.id} 실행 완료 표시`);
          }
        } catch (updateErr) {
          console.error('[스케줄러] executed 업데이트 중 예외:', updateErr);
        }
      });
    }
    
    // [추가] 회차 시작 시 users 테이블 초기화 (신청 기간 시작 직전 1회만)
    if (current.application_start) {
      const startTime = new Date(current.application_start);
      const resetExecutionTime = new Date(startTime.getTime() - 10 * 1000); // 신청 시작 10초 전

      // ✅ 안전장치 추가
      // - 지금 시간이 "신청 시작 10초 전 ~ 신청 시작 직전" 구간일 때만 동작
      // - status 가 '준비중' 인 경우에만 동작 (진행중/발표완료/종료 상태에서는 절대 다시 초기화 안 함)
      const inResetWindow = now >= resetExecutionTime && now < startTime;
      const canResetByStatus = current.status === '준비중';

      if (inResetWindow && canResetByStatus) {
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

        if (lastPeriodStartResetId !== current.id) {
          // 초기화 사유 정리 (로그용)
          let reason = '';
          if (lastPeriodStartResetId == null) {
            reason = 'app_settings에 기록 없음';
          } else {
            reason = `last_period_start_reset_id=${lastPeriodStartResetId} → current.id=${current.id} 불일치`;
          }

          console.log(
            `[스케줄러] 회차 ${current.id} users 테이블 초기화 실행` +
              ` (사유: ${reason}, status=${current.status}, now=${now.toISOString()}, window=[${resetExecutionTime.toISOString()} ~ ${startTime.toISOString()}])`
          );

          const { data: resetResult, error: resetError } = await supabase
            .from('users')
            .update({ is_applied: false, is_matched: null })
            .not('id', 'is', null)
            .select('id');

          if (resetError) {
            console.error(`[스케줄러] users 테이블 초기화 실패:`, resetError);
          } else {
            console.log(
              `[스케줄러] users 테이블 초기화 성공: ${resetResult?.length || 0}명 사용자 상태 리셋 (회차 ${current.id})`
            );
            // 초기화 완료 후 app_settings에 기록
            try {
              const value = { periodId: current.id };
              await supabase
                .from('app_settings')
                .upsert(
                  {
                    key: 'last_period_start_reset_id',
                    value,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'key' }
                );
            } catch (upsertErr) {
              console.error('[스케줄러] last_period_start_reset_id 업데이트 오류:', upsertErr);
            }
          }
        } else {
          // 동일 회차에 대해 이미 초기화가 완료된 경우 스킵 로그 (디버그용)
          console.log(
            `[스케줄러] 회차 ${current.id} users 초기화 스킵` +
              ` (사유: 이미 last_period_start_reset_id=${lastPeriodStartResetId}, status=${current.status})`
          );
        }
      }
    }
    
    // [추가] 회차 종료(마감) 시 users 테이블 초기화
    if (current.finish) {
      const finishTime = new Date(current.finish);
      // 회차 종료 시각이 지났고, 다음 회차가 아직 생성되지 않은 경우
      if (now > finishTime) {
        // matching_log에 finish가 더 큰 row가 있는지 확인(다음 회차)
        const { data: nextLog, error: nextLogError } = await supabase
          .from('matching_log')
          .select('id')
          .gt('id', current.id)
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

    // [추가] 매칭 신청 시작 푸시 알림 (전 회원 대상)
    if (current.application_start) {
      try {
        const startTime = new Date(current.application_start);
        // 신청 시작 시각 이후 5분 이내인 경우에만 푸시 발송 후보
        const pushWindowStart = startTime;
        const pushWindowEnd = new Date(startTime.getTime() + 5 * 60 * 1000);
        const inPushWindow = now >= pushWindowStart && now < pushWindowEnd;

        if (inPushWindow) {
          let lastStartPushPeriodId = null;
          try {
            const { data: settingRow, error: settingError } = await supabase
              .from('app_settings')
              .select('value')
              .eq('key', 'last_application_start_push_period_id')
              .maybeSingle();

            if (!settingError && settingRow && settingRow.value && typeof settingRow.value.periodId === 'number') {
              lastStartPushPeriodId = settingRow.value.periodId;
            }
          } catch (infoErr) {
            console.error('[스케줄러] last_application_start_push_period_id 조회 오류:', infoErr);
          }

          if (lastStartPushPeriodId !== current.id) {
            console.log(`[스케줄러] 회차 ${current.id} 매칭 신청 시작 알림/푸시 발송`);

            // 1) 푸시 알림 (전체 사용자)
            await sendPushToAllUsers({
              type: 'matching_application_start',
              periodId: String(current.id),
              title: '[직쏠공]',
              body: '이번 회차 매칭 신청이 시작되었어요.',
            });

            // 2) 알림 메시지 (전체 활성 사용자)
            try {
              const { data: activeUsers, error: usersError } = await supabase
                .from('users')
                .select('id, is_active, is_banned');

              if (usersError) {
                console.error('[스케줄러] 매칭 신청 시작 알림용 사용자 조회 오류:', usersError);
              } else if (activeUsers && activeUsers.length > 0) {
                const targets = activeUsers.filter(
                  (u) => u.is_active !== false && u.is_banned !== true && u.id,
                );

                await Promise.all(
                  targets.map((u) =>
                    notificationRoutes
                      .createNotification(String(u.id), {
                        type: 'matching',
                        title: '[매칭시작] 새로운 매칭 신청이 시작되었습니다',
                        body: `새 회차의 매칭 신청이 시작되었어요.\n메인 페이지에서 매칭을 신청해 보세요!`,
                        linkUrl: '/main',
                        meta: { period_id: current.id },
                      })
                      .catch((e) => console.error('[스케줄러] 매칭 신청 시작 알림 생성 오류:', e)),
                  ),
                );
              }
            } catch (notifErr) {
              console.error('[스케줄러] 매칭 신청 시작 알림 메시지 생성 중 오류:', notifErr);
            }

            try {
              const value = { periodId: current.id };
              await supabase
                .from('app_settings')
                .upsert(
                  {
                    key: 'last_application_start_push_period_id',
                    value,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'key' },
                );
            } catch (upsertErr) {
              console.error('[스케줄러] last_application_start_push_period_id 업데이트 오류:', upsertErr);
            }
          }
        }
      } catch (pushErr) {
        console.error('[스케줄러] 매칭 신청 시작 푸시 발송 중 오류:', pushErr);
      }
    }

    // [추가] 매칭 결과 이메일 발송 (matching_announce 시각)
    if (current.matching_announce) {
      const announceTime = new Date(current.matching_announce);
      const emailExecutionTime = new Date(announceTime.getTime() + 30 * 1000); // 30초 후 실행
      
      if (!current.email_sent && now >= emailExecutionTime) {
        // ✅ executed와 동일하게, 실행 전에 먼저 email_sent 플래그를 올려서
        //    10초 주기의 스케줄러가 같은 회차에 대해 여러 번 메일 발송을 시작하지 않도록 방지
        try {
          const { error: preUpdateError } = await supabase
            .from('matching_log')
            .update({ email_sent: true })
            .eq('id', current.id);
          if (preUpdateError) {
            console.error('[스케줄러] email_sent 사전 업데이트 오류:', preUpdateError);
          } else {
            console.log(`[스케줄러] 매칭 회차 ${current.id} email 메일 발송 시작`);
          }
        } catch (flagErr) {
          console.error('[스케줄러] email_sent 사전 업데이트 중 예외:', flagErr);
        }

        console.log(`[스케줄러] 매칭 결과 이메일 발송 시작 (예정: ${announceTime.toISOString()}, 실제: ${now.toISOString()})`);
        
        // 매칭 결과 이메일 발송 함수 실행
        const { sendMatchingResultEmails } = require('./matching-algorithm');
        try {
          // current.id 기준으로 결과 메일 발송 (내부에서 최대 5회 재시도)
          await sendMatchingResultEmails(current.id);
          console.log('[스케줄러] 매칭 결과 이메일 발송 완료');

          // 매칭 결과 알림 및 푸시 (해당 회차에 매칭을 신청한 사용자들만 대상)
          try {
            const { data: apps, error: appsError } = await supabase
              .from('matching_applications')
              .select('user_id, is_matched, partner_user_id')
              .eq('period_id', current.id)
              .eq('applied', true)
              .eq('cancelled', false);

            if (appsError) {
              console.error('[스케줄러] 매칭 결과 신청자 조회 오류:', appsError);
            } else if (apps && apps.length > 0) {
              const userIds = Array.from(new Set(apps.map((a) => a.user_id)));
              console.log(`[스케줄러] 회차 ${current.id} 매칭 결과 알림 대상: ${userIds.length}명`);

              // 1) 푸시 알림 (전체 신청자)
              await sendPushToUsers(userIds, {
                type: 'matching_result_announce',
                periodId: String(current.id),
                title: '[직쏠공]',
                body: '매칭 결과가 발표되었어요.',
              });

              // 2) 알림 메시지 (각 사용자별 성공/실패 개별 메시지)
              // 추가 매칭 도전 기능 활성화 여부 확인
              const extraMatchingEnabled = await isExtraMatchingFeatureEnabled();
              
              await Promise.all(
                apps.map(async (app) => {
                  try {
                    const isMatched = app.is_matched === true;
                    if (isMatched) {
                      await notificationRoutes.createNotification(String(app.user_id), {
                        type: 'match',
                        title: '[매칭결과] 매칭이 성사되었습니다',
                        body: '이번 회차 매칭 결과, 회원님의 매칭이 성사되었습니다. 메인 페이지에서 상대방 프로필과 채팅방을 확인해 주세요.\n\n💡 상대방의 메시지 알림을 실시간으로 받으시려면 꼭 메인페이지에서 푸시 알림을 켜주세요!\n 매칭된 상대방이 기다릴 수 있어요 ㅠㅠ',
                        linkUrl: '/main',
                        meta: {
                          period_id: current.id,
                          result: 'success',
                          partner_user_id: app.partner_user_id || null,
                        },
                      });
                    } else {
                      // 추가 매칭 도전 기능 활성화 여부에 따라 다른 메시지 전송
                      if (extraMatchingEnabled) {
                        await notificationRoutes.createNotification(String(app.user_id), {
                          type: 'match',
                          title: '[매칭결과] 이번 회차 매칭에 실패했습니다',
                          body: '아쉽게도 이번 회차 정규 매칭에서는 인연을 찾지 못했어요. 추가 매칭 도전을 통해 다시 도전해 보세요.',
                          linkUrl: '/extra-matching',
                          meta: {
                            period_id: current.id,
                            result: 'fail',
                          },
                        });
                      } else {
                        await notificationRoutes.createNotification(String(app.user_id), {
                          type: 'match',
                          title: '[매칭결과] 이번 회차 매칭에 실패했습니다',
                          body: '아쉽게도 이번 회차 매칭에서는 인연을 찾지 못했어요. 다음 회차에 다시 도전해 보세요.',
                          linkUrl: '/main',
                          meta: {
                            period_id: current.id,
                            result: 'fail',
                          },
                        });
                      }
                    }
                  } catch (notifErr) {
                    console.error(`[스케줄러] 사용자 ${app.user_id} 알림 생성 오류:`, notifErr);
                  }
                })
              );
            } else {
              console.log(`[스케줄러] 회차 ${current.id} 매칭 결과 대상 신청자가 없습니다.`);
            }
          } catch (err) {
            console.error('[스케줄러] 매칭 결과 알림/푸시 발송 중 오류:', err);
          }
          
          // 완료 후에도 email_sent=true를 한 번 더 보강 (중복이어도 무해, 로그용)
          const { error: updateError } = await supabase
            .from('matching_log')
            .update({ email_sent: true })
            .eq('id', current.id);
          if (updateError) {
            console.error(`[스케줄러] email_sent 업데이트 오류:`, updateError);
          } else {
            console.log(`[스케줄러] 매칭 회차 ${current.id} 이메일 발송 완료 표시`);
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