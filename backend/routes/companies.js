const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { sendAdminNotificationEmail } = require('../utils/emailService');
const { sendPushToAdmin } = require('../pushService');
const notificationRoutes = require('./notifications');

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
    isActive: company.is_active,
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
    const { companyName, emailDomain, replyEmail, message } = req.body || {};

    if (!companyName || !emailDomain || !replyEmail) {
      return res.status(400).json({
        success: false,
        message: '회사명, 이메일 도메인 주소, 회신받을 이메일 주소를 입력해주세요.',
      });
    }

    const trimmedName = String(companyName).trim();
    const trimmedDomain = String(emailDomain).trim();
    const trimmedReplyEmail = String(replyEmail).trim();
    const trimmedMessage = (message || '').toString().trim();

    if (!trimmedName || !trimmedDomain || !trimmedReplyEmail) {
      return res.status(400).json({
        success: false,
        message: '회사명, 이메일 도메인 주소, 회신받을 이메일 주소를 올바르게 입력해주세요.',
      });
    }

    // 이메일 형식 간단 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedReplyEmail)) {
      return res.status(400).json({
        success: false,
        message: '회신받을 이메일 주소 형식이 올바르지 않습니다.',
      });
    }

    // company_requests 테이블에 저장 (DB에 저장 실패해도 요청은 성공 처리)
    try {
      await supabase.from('company_requests').insert({
        company_name: trimmedName,
        email_domain: trimmedDomain,
        reply_email: trimmedReplyEmail,
        message: trimmedMessage || null,
        status: 'pending',
      });
    } catch (dbErr) {
      console.error('[회사 추가 요청] company_requests 저장 실패:', dbErr);
    }

    // 관리자 알림: 이메일 + 인앱 알림 + 푸시 알림 (비동기, 실패해도 요청은 성공 처리)
    const adminSubject = '신규 회사 추가 요청';
    const adminBodyLines = [
      '랜딩 페이지에서 새로운 회사 추가 요청이 접수되었습니다.',
      '',
      `회사명: ${trimmedName}`,
      `이메일 도메인: ${trimmedDomain}`,
      `확정 여부 회신받을 이메일: ${trimmedReplyEmail}`,
      '',
      '기타 요청사항:',
      trimmedMessage || '(작성 없음)',
    ];
    const notifTitle = '신규 회사 추가 요청';
    const notifBody = `${trimmedName} (${trimmedDomain}) - 회신받을 이메일: ${trimmedReplyEmail}`;

    try {
      // 1) 관리자 개인 메일 발송 (EMAIL_USER로 발송)
      sendAdminNotificationEmail(adminSubject, adminBodyLines.join('\n')).catch((err) => {
        console.error('[회사 추가 요청] 관리자 알림 메일 발송 실패:', err);
      });

      // 2) 관리자 계정 인앱 알림 메시지
      const adminEmail = process.env.ADMIN_EMAIL || 'hhggom@hyundai.com';
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .maybeSingle();

      if (adminUser?.id) {
        notificationRoutes.createNotification(adminUser.id, {
          type: 'company_request',
          title: notifTitle,
          body: notifBody,
          linkUrl: '/admin/company-manager',
          meta: { companyName: trimmedName, emailDomain: trimmedDomain, replyEmail: trimmedReplyEmail },
        }).catch((err) => {
          console.error('[회사 추가 요청] 관리자 인앱 알림 발송 실패:', err);
        });
      }

      // 3) 관리자 계정 푸시 알림
      sendPushToAdmin(notifTitle, notifBody, { type: 'company_request', linkUrl: '/admin/company-manager' }).catch((err) => {
        console.error('[회사 추가 요청] 관리자 푸시 알림 발송 실패:', err);
      });
    } catch (e) {
      console.error('[회사 추가 요청] 관리자 알림 처리 중 오류:', e);
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