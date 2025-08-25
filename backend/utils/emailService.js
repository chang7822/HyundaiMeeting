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
  const now = new Date();
  const koreanTime = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  }).format(now);

  const subject = '[울산 사내 솔로공모] 매칭 결과 발표';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">📋 매칭 결과 발표</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">울산 사내 솔로공모 매칭 결과가 발표되었습니다</p>
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
          <li>소속 조직이나 실명 등은 미리 공개하지 않는 것을 추천드립니다.</li>
        </ul>
        <p style="color: #4a5568; line-height: 1.6; margin: 10px 0 0 0; font-size: 14px;">
          서비스 내 채팅 기능을 활용하여 대면 만남을 위한 약속을 잡아보세요!
        </p>
      </div>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="color: #718096; margin: 0; font-size: 14px;">
          <strong>발표 시각:</strong> ${koreanTime} (한국 시간)
        </p>
        <p style="color: #718096; margin: 10px 0 0 0; font-size: 14px;">
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
    console.log(`📧 매칭 결과 이메일 발송 시도: ${userEmail} (매칭 ${isMatched ? '성공' : '실패'})`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ 매칭 결과 이메일 발송 성공: ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ 매칭 결과 이메일 발송 실패: ${userEmail}`, error);
    return false;
  }
}

module.exports = {
  sendMatchingResultEmail
}; 