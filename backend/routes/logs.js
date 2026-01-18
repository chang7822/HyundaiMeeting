const express = require('express');
const router = express.Router();
const logCollector = require('../utils/logCollector');
const authenticate = require('../middleware/authenticate');
const { supabase } = require('../database');

// 관리자 권한 확인 미들웨어
const requireAdmin = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.userId)
      .single();

    if (error || !user || !user.is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    next();
  } catch (error) {
    console.error('[logs] 관리자 권한 확인 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
};

// 서버 로그 조회
router.get('/server', authenticate, requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const logs = logCollector.getServerLogs(limit);
    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error('[logs] 서버 로그 조회 오류:', error);
    res.status(500).json({ error: '서버 로그 조회 실패' });
  }
});

// 스케줄러 로그 조회
router.get('/scheduler', authenticate, requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const logs = logCollector.getSchedulerLogs(limit);
    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error('[logs] 스케줄러 로그 조회 오류:', error);
    res.status(500).json({ error: '스케줄러 로그 조회 실패' });
  }
});

// 스케줄러 로그 수집 (내부용)
router.post('/scheduler/ingest', (req, res) => {
  const { level, message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message가 필요합니다.' });
  }

  const normalizedLevel = typeof level === 'string' ? level : 'info';
  logCollector.addLog('scheduler', normalizedLevel, message);
  return res.json({ success: true });
});

module.exports = router;

