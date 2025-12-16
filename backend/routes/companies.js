const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { sendAdminNotificationEmail } = require('../utils/emailService');

// 모든 회사 조회 (DB에서)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return res.status(500).json({ message: '회사 목록을 불러오지 못했습니다.', error });
  }

  // emailDomains 필드명 맞추기
  const companies = (data || []).map(company => ({
    id: String(company.id),
    name: company.name,
    emailDomains: company.email_domains,
    isActive: company.is_active
  }));

  res.json(companies);
});

// 도메인으로 회사 조회 (DB에서)
router.get('/domain/:domain', async (req, res) => {
  const { domain } = req.params;
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .contains('email_domains', [domain])
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: '회사를 찾을 수 없습니다.' });
  }

  const company = {
    id: String(data.id),
    name: data.name,
    emailDomains: data.email_domains,
    isActive: data.is_active
  };
  res.json(company);
});

// 랜딩 페이지에서 보내는 "내 회사 추가 요청" (비로그인 허용)
router.post('/request', async (req, res) => {
  try {
    const { companyName, emailDomain, message } = req.body || {};

    if (!companyName || !emailDomain) {
      return res.status(400).json({
        success: false,
        message: '회사명과 이메일 도메인 주소를 입력해주세요.',
      });
    }

    const trimmedName = String(companyName).trim();
    const trimmedDomain = String(emailDomain).trim();
    const trimmedMessage = (message || '').toString().trim();

    if (!trimmedName || !trimmedDomain) {
      return res.status(400).json({
        success: false,
        message: '회사명과 이메일 도메인 주소를 올바르게 입력해주세요.',
      });
    }

    // 관리자 알림 메일 발송 (비동기, 실패해도 요청은 성공 처리)
    try {
      const adminSubject = '신규 회사 추가 요청';
      const adminBodyLines = [
        '랜딩 페이지에서 새로운 회사 추가 요청이 접수되었습니다.',
        '',
        `회사명: ${trimmedName}`,
        `이메일 도메인: ${trimmedDomain}`,
        '',
        '기타 요청사항:',
        trimmedMessage || '(작성 없음)',
      ];
      sendAdminNotificationEmail(adminSubject, adminBodyLines.join('\n')).catch((err) => {
        console.error('[회사 추가 요청] 관리자 알림 메일 발송 실패:', err);
      });
    } catch (e) {
      console.error('[회사 추가 요청] 관리자 알림 메일 처리 중 오류:', e);
    }

    return res.json({
      success: true,
      message: '요청이 정상적으로 전송되었습니다. 확인 후 회사 목록에 반영하도록 하겠습니다.',
    });
  } catch (error) {
    console.error('회사 추가 요청 처리 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

module.exports = router; 