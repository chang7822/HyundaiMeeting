const express = require('express');
const router = express.Router();
const { supabase } = require('../database');

// 공개 시스템 상태 조회 (로그인 전/후 모두 사용)
router.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle();

    if (error) {
      console.error('[system][status] 조회 오류:', error);
      return res.status(500).json({ success: false, message: '시스템 상태 조회에 실패했습니다.' });
    }

    const enabled = !!(data && data.value && data.value.enabled === true);

    res.json({
      success: true,
      maintenance: {
        enabled,
      },
    });
  } catch (error) {
    console.error('[system][status] 조회 오류:', error);
    res.status(500).json({ success: false, message: '시스템 상태 조회에 실패했습니다.' });
  }
});

module.exports = router;


