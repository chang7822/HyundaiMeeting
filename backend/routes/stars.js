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
