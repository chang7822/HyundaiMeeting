const nodemailer = require('nodemailer');

// 이메일 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 매칭 결과 이메일 발송 함수
async function sendMatchingResultEmail(userEmail, isMatched, partnerInfo = null) {
  // 한국 시간(KST, UTC+9)으로 변환
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9 (분 단위)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const kstTime = new Date(utcTime + (kstOffset * 60 * 1000));

  const formatDateYMD = (date) => {
    const yy = String(date.getFullYear()).slice(2);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${yy}. ${m}. ${d}`;
  };

  const hh = kstTime.getHours().toString().padStart(2, '0');
  const mm = kstTime.getMinutes().toString().padStart(2, '0');
  const koreanTime = `${formatDateYMD(kstTime)} ${hh}:${mm}`;

  const subject = '[직장인 솔로 공모] 매칭 결과 발표';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; width: 100%; max-width: 100%; margin: 0; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">📋 매칭 결과 발표</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">직장인 솔로 공모 매칭 결과가 발표되었습니다</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
        <h2 style="color: #2d3748; margin-top: 0;">매칭 결과 확인 안내</h2>
        <p style="color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
          이번 회차 매칭 결과가 발표되었습니다. 
          서비스에 로그인하여 매칭 결과를 확인해주세요.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
          <h3 style="color: #667eea; margin-top: 0;">📱 결과 확인 방법</h3>
          <p style="color: #4a5568; margin-bottom: 15px;">
            서비스에 로그인하시면 메인 페이지에서 매칭 결과를 확인하실 수 있습니다.
          </p>
          <div style="background: #e6fffa; padding: 15px; border-radius: 8px; border: 1px solid #81e6d9;">
            <p style="margin: 0; color: #2c7a7b; font-weight: 600;">
              🔍 <strong>확인 방법:</strong> 서비스 로그인 → 메인 페이지 → 매칭 결과 확인
            </p>
          </div>
        </div>
      </div>
      
      <div style="background: #fef5e7; padding: 20px; border-radius: 10px; border: 1px solid #f6ad55; margin-bottom: 25px;">
        <h3 style="color: #c05621; margin-top: 0;">만남 전 안내사항</h3>
        <p style="color: #4a5568; line-height: 1.6; margin-bottom: 15px;">
          <strong>안전한 만남을 위해 다음 사항을 참고해주세요:</strong>
        </p>
        <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>대면 만남 전까지는 서비스 내 채팅을 통해 대화를 나누어보세요</li>
          <li>개인정보는 만남이 확정된 후에 서로 공유하는 걸 추천드립니다.</li>
          <li>SNS나 실명 등은 미리 교환하지 않는 것을 추천드립니다. (비매너 유저 이탈 방지)</li>
        </ul>
        <p style="color: #4a5568; line-height: 1.6; margin: 10px 0 0 0; font-size: 16px;">
          서비스 내 채팅 기능을 활용하여 대면 만남을 위한 약속을 잡아보세요!
        </p>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://automatchingway.com" target="_blank" rel="noopener noreferrer"
           style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600; line-height: 1.5; font-size: 14px;">
          직쏠공 (직장인 솔로 공모)<br/>바로가기
        </a>
      </div>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="color: #718096; margin: 0; font-size: 16px;">
          <strong>발표 시각:</strong> ${koreanTime} (한국 시간)
        </p>
        <p style="color: #718096; margin: 10px 0 0 0; font-size: 16px;">
          문의사항이 있으시면 고객센터를 통해 관리자에게 연락해주세요.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // SMTP "접수" 단계의 결과를 로그로 남김 (실제 수신 성공/실패(바운스)는 이후에 발생할 수 있음)
    const accepted = Array.isArray(info?.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info?.rejected) ? info.rejected : [];
    const response = info?.response || null;
    const messageId = info?.messageId || null;
    try {
      console.log(
        `[sendMatchingResultEmail] queued: to=${userEmail} accepted=${accepted.length} rejected=${rejected.length}` +
          (messageId ? ` messageId=${messageId}` : '') +
          (response ? ` | response=${response}` : ''),
      );
    } catch {}
    return {
      ok: true,
      to: userEmail,
      accepted,
      rejected,
      response,
      messageId,
    };
  } catch (error) {
    // 운영/개발 모두에서 실패 원인을 남겨서, 실제 장애 원인을 추적할 수 있도록 한다.
    const basicMsg = error?.message || String(error);
    const code = error?.code || error?.responseCode || null;
    const smtpResponse = error?.response || null;

    // 네트워크/연결성 계열 오류는 "실제 발송은 되었을 수도" 있는 케이스가 존재함(연결 끊김/타임아웃 등)
    const transientCodes = new Set(['ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ESOCKET', 'ETIMEDOUT']);
    const transient = transientCodes.has(String(code || ''));

    console.error(
      '[sendMatchingResultEmail] 이메일 발송 실패:',
      basicMsg,
      code ? `| code=${code}` : '',
      smtpResponse ? `| SMTP 응답: ${smtpResponse}` : '',
    );

    return {
      ok: false,
      to: userEmail,
      transient,
      error: {
        message: basicMsg,
        code,
        smtpResponse,
      },
    };
  }
}

// 내부 관리자 알림용 단순 텍스트 이메일
async function sendAdminNotificationEmail(subject, content) {
  const toEmail = process.env.EMAIL_USER;
  if (!toEmail) {
    // EMAIL_USER 미설정 시에도 조용히 패스
    return false;
  }

  const finalSubject = subject && subject.startsWith('[직장인 솔로 공모]')
    ? subject
    : `[직장인 솔로 공모] ${subject || '관리자 알림'}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: finalSubject,
    text: content || '',
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[sendAdminNotificationEmail] 관리자 알림 메일 발송 실패:', error?.message || error);
    }
    return false;
  }
}

// 관리자 전체 공지 메일 발송용 공통 템플릿
function buildAdminBroadcastEmailHtml(content) {
  const safeContent = (content || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/(?:\r\n|\r|\n)/g, '<br/>');

  return `
    <div style="font-family: Arial, sans-serif; width: 100%; max-width: 100%; margin: 0; padding: 20px; background-color: #f3f4f6;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px 28px; border-radius: 18px 18px 0 0; text-align: left;">
        <h1 style="margin: 0; font-size: 24px;">[직장인 솔로 공모] 공지 메일</h1>
        <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">
          직장인 솔로 공모 서비스를 이용해주시는 회원님께 안내드립니다.
        </p>
      </div>

      <div style="background: #ffffff; padding: 22px 24px 24px 24px; border-radius: 0 0 18px 18px; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);">
        <div style="color: #111827; font-size: 16px; line-height: 1.7; word-break: break-word;">
          ${safeContent}
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
          <p style="margin: 0 0 6px 0;">
            이 메일은 직장인 솔로 공모 서비스 안내를 위해 발송되었습니다.
          </p>
          <div style="text-align: center; margin-top: 10px;">
            <a href="https://automatchingway.com" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; padding: 10px 22px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600; line-height: 1.5; font-size: 13px;">
              직쏠공 (직장인 솔로 공모)<br/>바로가기
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 관리자 개별/전체 공지 메일 발송 함수
async function sendAdminBroadcastEmail(toEmail, subject, content) {
  if (!toEmail) return false;

  const finalSubject = subject && subject.startsWith('[직장인 솔로 공모]')
    ? subject
    : `[직장인 솔로 공모] ${subject || '공지 메일'}`;

  const htmlContent = buildAdminBroadcastEmailHtml(content || '');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: finalSubject,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[sendAdminBroadcastEmail] 관리자 공지 메일 발송 실패:', error?.message || error);
    }
    return false;
  }
}

/**
 * 신규 회사 추가 알림 메일 발송
 */
async function sendNewCompanyNotificationEmail(recipientEmail, companyName, domains, subject, content) {
  const safeContent = (content || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/(?:\r\n|\r|\n)/g, '<br/>');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; width: 100%; max-width: 100%; margin: 0; padding: 20px; background-color: #f3f4f6;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px 28px; border-radius: 18px 18px 0 0; text-align: left;">
        <h1 style="margin: 0; font-size: 22px;">[직장인 솔로 공모] 공지 메일</h1>
        <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">
          직장인 솔로 공모 서비스를 이용해주시는 회원님께 안내드립니다.
        </p>
      </div>

      <div style="background: #ffffff; padding: 22px 24px 24px 24px; border-radius: 0 0 18px 18px; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);">
        <div style="color: #111827; font-size: 14px; line-height: 1.7; word-break: break-word;">
          ${safeContent}
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <p style="margin: 0 0 6px 0;">
            이 메일은 직장인 솔로 공모 서비스 안내를 위해 발송되었습니다.
          </p>
          <div style="text-align: center; margin-top: 10px;">
            <a href="https://automatchingway.com" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; padding: 10px 22px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600; line-height: 1.5; font-size: 13px;">
              직쏠공 (직장인 솔로 공모)<br/>바로가기
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  const finalSubject = subject && subject.startsWith('[직장인 솔로 공모]')
    ? subject
    : `[직장인 솔로 공모] ${subject || '신규 회사 추가 안내'}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: finalSubject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[emailService] 신규 회사 추가 알림 메일 발송 완료: ${recipientEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[emailService] 신규 회사 추가 알림 메일 발송 실패 (${recipientEmail}):`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendMatchingResultEmail,
  sendAdminBroadcastEmail,
  buildAdminBroadcastEmailHtml,
  sendAdminNotificationEmail,
  sendNewCompanyNotificationEmail,
};