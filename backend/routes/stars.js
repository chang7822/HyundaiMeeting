const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

// 모든 /api/stars/* 요청은 인증 필요
router.use(authenticate);

// KST 기준 YYYY-MM-DD 문자열 반환
function getKSTDateString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

const RPS_DAILY_LIMIT = 3;

// 오늘 날짜의 RPS 사용량 조회 (없으면 0,0)
async function getRpsDailyUsage(userId) {
  const date = getKSTDateString();
  const { data, error } = await supabase
    .from('rps_daily_usage')
    .select('used, extra')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { used: 0, extra: 0 };
  return { used: Math.max(0, Number(data.used) || 0), extra: Math.max(0, Number(data.extra) || 0) };
}

// RPS 일일 사용량 upsert (used 또는 extra 증가)
async function upsertRpsDaily(userId, date, updates) {
  const { data: existing } = await supabase
    .from('rps_daily_usage')
    .select('used, extra')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const used = existing ? (Number(existing.used) || 0) + (updates.used || 0) : (updates.used || 0);
  const extra = existing ? (Number(existing.extra) || 0) + (updates.extra || 0) : (updates.extra || 0);

  const { error } = await supabase.from('rps_daily_usage').upsert(
    { user_id: userId, date, used, extra },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
  return { used, extra };
}

// 별 지급 공통 함수
async function awardStars(userId, amount, reason, meta) {
  if (!userId || typeof amount !== 'number' || amount <= 0) {
    throw new Error('awardStars: 잘못된 인자');
  }

  // 현재 잔액 조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('star_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw userError || new Error('사용자를 찾을 수 없습니다.');
  }

  const currentBalance = typeof user.star_balance === 'number' ? user.star_balance : 0;
  const newBalance = currentBalance + amount;

  const { error: updateError } = await supabase
    .from('users')
    .update({ star_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  const { error: txError } = await supabase
    .from('star_transactions')
    .insert({
      user_id: userId,
      amount,
      reason,
      meta: meta || null,
    });

  if (txError) {
    throw txError;
  }

  return newBalance;
}

// 별 차감 공통 함수 (RPS 배팅 등)
async function deductStars(userId, amount, reason, meta) {
  if (!userId || typeof amount !== 'number' || amount <= 0) {
    throw new Error('deductStars: 잘못된 인자');
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('star_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw userError || new Error('사용자를 찾을 수 없습니다.');
  }

  const currentBalance = typeof user.star_balance === 'number' ? user.star_balance : 0;
  if (currentBalance < amount) {
    const e = new Error('INSUFFICIENT_STARS');
    e.code = 'INSUFFICIENT_STARS';
    throw e;
  }

  const newBalance = currentBalance - amount;

  const { error: updateError } = await supabase
    .from('users')
    .update({ star_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  const { error: txError } = await supabase
    .from('star_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      reason,
      meta: meta || null,
    });

  if (txError) {
    throw txError;
  }

  return newBalance;
}

// 가위바위보 일일 사용량 조회 (앱/웹 동기화)
router.get('/rps/daily', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { used, extra } = await getRpsDailyUsage(userId);
    return res.json({ used, extra });
  } catch (error) {
    console.error('[stars] /rps/daily 오류:', error);
    return res.status(500).json({ message: '조회 중 오류가 발생했습니다.' });
  }
});

// 가위바위보 미니게임: 배팅 (별 차감 + 일일 used 증가, 서버 기준으로 횟수 제한)
router.post('/rps/bet', async (req, res) => {
  try {
    const userId = req.user.userId;
    const amount = Math.floor(Number(req.body?.amount)) || 0;
    if (amount < 1 || amount > 3) {
      return res.status(400).json({ message: '배팅은 1~3개만 가능합니다.' });
    }

    const date = getKSTDateString();
    const daily = await getRpsDailyUsage(userId);
    const remaining = RPS_DAILY_LIMIT - daily.used + daily.extra;
    if (remaining <= 0) {
      return res.status(400).json({ message: '오늘 남은 횟수가 없어요. 광고를 보고 한 판 더 도전해보세요!', code: 'RPS_NO_PLAYS' });
    }

    let newBalance;
    try {
      newBalance = await deductStars(userId, amount, 'rps_bet', { amount });
    } catch (e) {
      if (e.code === 'INSUFFICIENT_STARS') {
        return res.status(400).json({ message: '보유 별이 부족합니다.', code: 'INSUFFICIENT_STARS' });
      }
      throw e;
    }

    const after = await upsertRpsDaily(userId, date, { used: 1 });
    return res.json({ success: true, newBalance, used: after.used, extra: after.extra });
  } catch (error) {
    console.error('[stars] /rps/bet 오류:', error);
    return res.status(500).json({ message: '배팅 처리 중 오류가 발생했습니다.' });
  }
});

// 가위바위보: 광고 시청 후 추가 횟수 + 별 2개 지급 (앱/웹 동기화)
router.post('/rps/extra', async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = Math.min(10, Math.max(1, Math.floor(Number(req.body?.count)) || 3));
    const starReward = Math.min(10, Math.max(0, Math.floor(Number(req.body?.starReward)) || 2));
    const date = getKSTDateString();
    const after = await upsertRpsDaily(userId, date, { extra: count });
    let newBalance = null;
    if (starReward > 0) {
      newBalance = await awardStars(userId, starReward, 'rps_ad_reward', { extra: count });
    }
    return res.json({ success: true, used: after.used, extra: after.extra, newBalance });
  } catch (error) {
    console.error('[stars] /rps/extra 오류:', error);
    return res.status(500).json({ message: '추가 횟수 처리 중 오류가 발생했습니다.' });
  }
});

// 가위바위보 미니게임: 승리 시 별 2배 지급 (배팅액 + 보상 = 2배)
router.post('/rps/win', async (req, res) => {
  try {
    const userId = req.user.userId;
    const amount = Math.floor(Number(req.body?.amount)) || 0;
    if (amount < 1 || amount > 3) {
      return res.status(400).json({ message: '유효하지 않은 배팅액입니다.' });
    }

    const reward = amount * 2; // 배팅 1 -> 2개, 2 -> 4개, 3 -> 6개 지급
    const newBalance = await awardStars(userId, reward, 'rps_win', { betAmount: amount });

    return res.json({ success: true, newBalance, reward });
  } catch (error) {
    console.error('[stars] /rps/win 오류:', error);
    return res.status(500).json({ message: '별 지급 중 오류가 발생했습니다.' });
  }
});

// 내 별 잔액 및 최근 내역 조회
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.userId;

    const today = getKSTDateString();

    const [
      { data: user, error: userError },
      { data: txs, error: txError },
      { data: attendanceLogs, error: attendanceError },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('star_balance')
        .eq('id', userId)
        .single(),
      supabase
        .from('star_transactions')
        .select('id, amount, reason, meta, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('attendance_logs')
        .select('kind')
        .eq('user_id', userId)
        .eq('attendance_date', today),
    ]);

    if (userError) {
      console.error('[stars] /me users 조회 오류:', userError);
      return res.status(500).json({ message: '별 정보를 불러오는 중 오류가 발생했습니다.' });
    }

    if (txError) {
      console.error('[stars] /me star_transactions 조회 오류:', txError);
    }

    if (attendanceError) {
      console.error('[stars] /me attendance_logs 조회 오류:', attendanceError);
    }

    const balance = typeof user.star_balance === 'number' ? user.star_balance : 0;

    const logs = attendanceLogs || [];
    const dailyDone = logs.some((row) => row.kind === 'daily');
    const adDone = logs.some((row) => row.kind === 'ad');

    return res.json({
      balance,
      recentTransactions: txs || [],
      today: {
        dailyDone,
        adDone,
      },
    });
  } catch (error) {
    console.error('[stars] /me 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 일일 출석 체크 (별 1개)
router.post('/attendance/daily', async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = getKSTDateString();

    // 오늘 이미 어떤 형태로든(출석/광고) 출석 처리 되었는지 확인 (하루 1회: 둘 중 택1)
    const { data: existing, error: existsError } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('attendance_date', today)
      .maybeSingle();

    if (existsError && existsError.code !== 'PGRST116') {
      console.error('[stars] daily 출석 조회 오류:', existsError);
      return res.status(500).json({ message: '출석 정보를 확인하는 중 오류가 발생했습니다.' });
    }

    if (existing) {
      return res.status(400).json({ message: '오늘은 이미 출석 체크 또는 광고 보상을 완료하셨습니다.' });
    }

    // attendance_logs 기록
    const { error: insertError } = await supabase.from('attendance_logs').insert({
      user_id: userId,
      attendance_date: today,
      kind: 'daily',
      stars_awarded: 1,
    });

    if (insertError) {
      console.error('[stars] daily 출석 기록 오류:', insertError);
      return res.status(500).json({ message: '출석을 기록하는 중 오류가 발생했습니다.' });
    }

    // 별 1개 지급
    let newBalance;
    try {
      newBalance = await awardStars(userId, 1, 'daily_attendance', {
        attendance_date: today,
      });
    } catch (e) {
      console.error('[stars] daily 별 지급 오류:', e);
      return res.status(500).json({ message: '별을 지급하는 중 오류가 발생했습니다.' });
    }

    // 닉네임 조회 및 출석 완료 로그
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('nickname')
      .eq('user_id', userId)
      .maybeSingle();
    
    const nickname = profile?.nickname || '알 수 없음';
    console.log(`✅ [출석체크] ${nickname} 출석체크 완료!`);

    return res.json({
      success: true,
      message: '오늘 출석 체크가 완료되었습니다. ⭐ 1개가 지급되었습니다.',
      newBalance,
    });
  } catch (error) {
    console.error('[stars] /attendance/daily 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 광고 보기 보상 (별 2개)
router.post('/attendance/ad', async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = getKSTDateString();

    // 오늘 이미 어떤 형태로든(출석/광고) 출석 처리 되었는지 확인 (하루 1회: 둘 중 택1)
    const { data: existing, error: existsError } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('attendance_date', today)
      .maybeSingle();

    if (existsError && existsError.code !== 'PGRST116') {
      console.error('[stars] ad 출석 조회 오류:', existsError);
      return res.status(500).json({ message: '광고 보상 정보를 확인하는 중 오류가 발생했습니다.' });
    }

    if (existing) {
      return res.status(400).json({ message: '오늘은 이미 출석 체크 또는 광고 보상을 완료하셨습니다.' });
    }

    // attendance_logs 기록
    const { error: insertError } = await supabase.from('attendance_logs').insert({
      user_id: userId,
      attendance_date: today,
      kind: 'ad',
      stars_awarded: 2,
    });

    if (insertError) {
      console.error('[stars] ad 출석 기록 오류:', insertError);
      return res.status(500).json({ message: '광고 보상을 기록하는 중 오류가 발생했습니다.' });
    }

    // 별 2개 지급
    let newBalance;
    try {
      newBalance = await awardStars(userId, 2, 'ad_reward', {
        attendance_date: today,
      });
    } catch (e) {
      console.error('[stars] ad 별 지급 오류:', e);
      return res.status(500).json({ message: '별을 지급하는 중 오류가 발생했습니다.' });
    }

    // 닉네임 조회 및 출석 완료 로그
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('nickname')
      .eq('user_id', userId)
      .maybeSingle();
    
    const nickname = profile?.nickname || '알 수 없음';
    console.log(`✅ [출석체크 - 광고] ${nickname} 출석체크 완료!`);
    return res.json({
      success: true,
      message: '광고를 통해 ⭐ 2개가 지급되었습니다.',
      newBalance,
    });
  } catch (error) {
    console.error('[stars] /attendance/ad 처리 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
