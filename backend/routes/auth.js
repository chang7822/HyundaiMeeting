const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { supabase } = require('../database');
const { sendAdminNotificationEmail } = require('../utils/emailService');
const { sendPushToAdmin } = require('../pushService');
const { computeMatchingCountsForUser } = require('../utils/matchingCompatibility');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const notificationsRouter = require('./notifications');

// ==================== Refresh Token 헬퍼 함수 ====================

/**
 * Refresh Token 생성 (랜덤 문자열)
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * 네이티브 앱인지 확인
 */
function isNativeApp(deviceType) {
  return deviceType && (
    deviceType.startsWith('android_') ||
    deviceType.startsWith('iphone') ||
    deviceType.startsWith('ipad') ||
    deviceType.startsWith('ipod')
  );
}

/**
 * Refresh Token 만료 시간 계산
 * - 네이티브 앱: 30일
 * - 웹: 7일
 */
function getRefreshTokenExpiry(deviceType) {
  const isNative = isNativeApp(deviceType);
  const days = isNative ? 30 : 7;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate.toISOString();
}

/**
 * Access Token 생성
 * - 모든 플랫폼: 1시간 만료
 */
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, id: user.id, email: user.email, isAdmin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Refresh Token을 DB에 저장
 */
async function saveRefreshToken(userId, refreshToken, deviceType) {
  const expiresAt = getRefreshTokenExpiry(deviceType);
  
  const { error } = await supabase
    .from('refresh_tokens')
    .insert({
      token: refreshToken,
      user_id: userId,
      device_type: deviceType || 'unknown',
      expires_at: expiresAt
    });

  if (error) {
    console.error('[RefreshToken] 저장 실패:', error);
    throw error;
  }
}

/**
 * Refresh Token 검증 및 사용자 정보 반환
 */
async function verifyRefreshToken(refreshToken) {
  // 1. DB에서 토큰 조회
  const { data: tokenData, error: tokenError } = await supabase
    .from('refresh_tokens')
    .select('user_id, expires_at, revoked_at')
    .eq('token', refreshToken)
    .single();

  if (tokenError || !tokenData) {
    return { valid: false, error: '토큰을 찾을 수 없습니다.' };
  }

  // 2. 무효화된 토큰인지 확인
  if (tokenData.revoked_at) {
    return { valid: false, error: '이미 무효화된 토큰입니다.' };
  }

  // 3. 만료 시간 확인
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  if (now > expiresAt) {
    return { valid: false, error: '토큰이 만료되었습니다.' };
  }

  // 4. 사용자 정보 조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, is_admin, is_active')
    .eq('id', tokenData.user_id)
    .single();

  if (userError || !user) {
    return { valid: false, error: '사용자를 찾을 수 없습니다.' };
  }

  // 5. 계정 활성화 확인
  if (!user.is_active) {
    return { valid: false, error: '비활성화된 계정입니다.' };
  }

  return { valid: true, user };
}

/**
 * 사용자의 모든 Refresh Token 무효화 (토큰 철회)
 */
async function revokeAllUserTokens(userId) {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null); // 아직 무효화되지 않은 토큰만

  if (error) {
    console.error('[RefreshToken] 토큰 철회 실패:', error);
    throw error;
  }

  console.log(`[RefreshToken] 사용자 ${userId}의 모든 토큰 무효화 완료`);
}

/**
 * 특정 Refresh Token만 무효화
 */
async function revokeRefreshToken(refreshToken) {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', refreshToken)
    .is('revoked_at', null);

  if (error) {
    console.error('[RefreshToken] 토큰 무효화 실패:', error);
    throw error;
  }
}

// 헬퍼 함수들을 외부에서 사용할 수 있도록 export (다른 라우터에서 사용)
module.exports.revokeAllUserTokens = revokeAllUserTokens;
module.exports.revokeRefreshToken = revokeRefreshToken;

// ==================== Refresh Token 헬퍼 함수 끝 ====================

// 환경 변수 직접 설정 (config.env 로딩 문제 해결)
if (!process.env.EMAIL_USER) {
  console.warn('[경고] EMAIL_USER 환경변수가 설정되어 있지 않습니다. 이메일 인증이 동작하지 않을 수 있습니다.');
}
if (!process.env.EMAIL_PASS) {
  console.warn('[경고] EMAIL_PASS 환경변수가 설정되어 있지 않습니다. 이메일 인증이 동작하지 않을 수 있습니다.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[경고] JWT_SECRET 환경변수가 설정되어 있지 않습니다. 인증/보안에 취약할 수 있습니다.');
}

// NODE_ENV 기반 개발 모드 플래그 (백업용 - 실제 디버깅 여부는 dev_mode 설정으로 제어)
const IS_DEV = process.env.NODE_ENV !== 'production';

// 환경 변수 간단 확인 (최초 1회만)
console.log('[AUTH] EMAIL_USER 설정 여부:', !!process.env.EMAIL_USER ? 'OK' : 'MISSING');

// Dev Mode(app_settings.dev_mode) 조회 헬퍼
async function isDevModeEnabled() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'dev_mode')
      .maybeSingle();

    if (error) {
      console.error('[AUTH][DEV_MODE] dev_mode 조회 오류:', error);
      return false;
    }

    return !!(data && data.value && data.value.enabled === true);
  } catch (e) {
    console.error('[AUTH][DEV_MODE] dev_mode 조회 예외:', e);
    return false;
  }
}

// User-Agent에서 기기 타입 감지 함수
function getDeviceTypeFromUA(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  // iOS 기기 감지
  if (ua.includes('iphone')) return 'iphone';
  if (ua.includes('ipad')) return 'ipad';
  if (ua.includes('ipod')) return 'ipod';
  
  // Android 기기 감지
  if (ua.includes('android')) {
    if (ua.includes('mobile')) return 'android_phone';
    return 'android_tablet';
  }
  
  // 데스크톱 OS 감지
  if (ua.includes('windows')) {
    if (ua.includes('edge')) return 'windows_edge';
    if (ua.includes('chrome')) return 'windows_chrome';
    if (ua.includes('firefox')) return 'windows_firefox';
    return 'windows_other';
  }
  
  if (ua.includes('mac os x') || ua.includes('macintosh')) {
    if (ua.includes('safari') && !ua.includes('chrome')) return 'mac_safari';
    if (ua.includes('chrome')) return 'mac_chrome';
    if (ua.includes('firefox')) return 'mac_firefox';
    return 'mac_other';
  }
  
  if (ua.includes('linux')) {
    if (ua.includes('chrome')) return 'linux_chrome';
    if (ua.includes('firefox')) return 'linux_firefox';
    return 'linux_other';
  }
  
  return 'unknown';
}

// 인증번호 임시 저장 (데이터베이스로 변경 예정)
const verificationCodes = new Map();
// 회원가입 이전에 이메일 인증을 완료한 사용자 임시 저장 (서버 재시작 시 초기화됨)
const preVerifiedEmails = new Map();
const PRE_VERIFIED_EMAIL_TTL = 24 * 60 * 60 * 1000; // 24시간

function markEmailAsPreVerified(email) {
  preVerifiedEmails.set(email, {
    verifiedAt: Date.now()
  });
}

function isEmailPreVerified(email) {
  const info = preVerifiedEmails.get(email);
  if (!info) return false;
  
  const isExpired = Date.now() - info.verifiedAt > PRE_VERIFIED_EMAIL_TTL;
  if (isExpired) {
    preVerifiedEmails.delete(email);
    return false;
  }
  return true;
}

// 비밀번호 재설정용 인증번호 저장 Map (별도 관리)
const passwordResetCodes = new Map();

// 이메일 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 이메일 설정 확인 (실패/성공 로그는 사용자에게 노출하지 않기 위해 생략)
transporter.verify(function(error, success) {
  // 아무 것도 하지 않음
});

// 인증번호 생성
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 발송
async function sendVerificationEmail(email, code) {
  const now = new Date();
  const koreanTime = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Seoul'
  }).format(now);

  const formatDateYMD = (date) => {
    const yy = String(date.getFullYear()).slice(2);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${yy}. ${m}. ${d}`;
  };

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '[직장인 솔로 공모] 이메일 인증',
    html: `
      <div style="font-family: Arial, sans-serif; width: 100%; max-width: 100%; margin: 0;">
        <h2 style="color: #333;">[직장인 솔로 공모] 이메일 인증</h2>
        <p>안녕하세요! 직장인 맞춤 만남 서비스인 [직장인 솔로 공모]에 가입해주셔서 감사합니다.</p>
        <p>아래 인증번호를 입력하여 이메일 인증을 완료해주세요:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #667eea; font-size: 32px; margin: 0;">${code}</h1>
        </div>
        <p>이 인증번호는 30분간 유효합니다.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://automatchingway.com" target="_blank" rel="noopener noreferrer"
             style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600; line-height: 1.5; font-size: 14px;">
            직쏠공 (직장인 솔로 공모)<br/>바로가기
          </a>
        </div>
        <p style="color: #666; font-size: 16px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          <strong>송신 시각:</strong> ${formatDateYMD(new Date())} (한국 시간)<br>
          <strong>만료 시각:</strong> ${formatDateYMD(new Date(now.getTime() + 30 * 60 * 1000))} (한국 시간)
        </p>
        <p>감사합니다.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    // 인증 메일 발송 실패도 조용히 false만 반환
    return false;
  }
}

// 이메일 인증 요청
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });
    }

    // 이메일 중복 확인
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116는 데이터가 없는 경우
      console.error('이메일 중복 확인 오류:', checkError);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 등록된 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.' 
      });
    }



    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      createdAt: Date.now()
    });
    const emailSent = await sendVerificationEmail(email, verificationCode);
    
    if (emailSent) {
      // 이메일 인증코드를 로그에도 남겨서 운영 중에도 확인할 수 있도록 함
      console.log(`[AUTH] 이메일 인증 코드 발송 성공: email=${email}, code=${verificationCode}`);
      res.json({ success: true, message: '인증 메일이 발송되었습니다.' });
    } else {
      console.log(`[AUTH] 이메일 인증 코드 발송 실패: email=${email}, code=${verificationCode}`);
      res.json({ 
        success: true, 
        message: '인증 메일이 발송되었습니다. (개발 모드: 콘솔에서 인증번호 확인)',
        debugCode: verificationCode
      });
    }
  } catch (error) {
    console.error('이메일 인증 요청 오류:', error);
    console.error('에러 상세 정보:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 기존 사용자용 이메일 재발송 (메인페이지에서 사용)
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });
    }

    // 기존 사용자 확인 (가입된 사용자여야 함)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, is_verified')
      .eq('email', email)
      .single();

    if (checkError || !existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '등록되지 않은 이메일입니다.' 
      });
    }

    // 이미 인증된 사용자인 경우
    if (existingUser.is_verified) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 인증된 사용자입니다.' 
      });
    }

    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      createdAt: Date.now()
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '[직장인 솔로 공모] 이메일 인증번호 재발송',
      html: `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 100%; margin: 0; padding: 20px;">
          <h2 style="color: #333; text-align: center;">이메일 인증번호</h2>
          <p>안녕하세요! 직장인 솔로 공모입니다:</p>
          <p>요청하신 이메일 인증번호입니다:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 4px;">${verificationCode}</h1>
          </div>
          <p>이 인증번호는 30분간 유효합니다.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://automatchingway.com" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600; line-height: 1.5; font-size: 14px;">
              직쏠공 (직장인 솔로 공모)<br/>바로가기
            </a>
          </div>
          <p>감사합니다.</p>
        </div>
      `
    };

    // 상단에서 생성한 공용 transporter 재사용
    try {
      await transporter.sendMail(mailOptions);
      // 재발송된 인증 코드도 로그에 남긴다
      console.log(`[AUTH] 이메일 인증번호 재발송: email=${email}, code=${verificationCode}`);
      res.json({ success: true, message: '인증번호가 재발송되었습니다.' });
    } catch (error) {
      // 재발송 실패 시에도 구체적인 로그는 남기지 않고 오류 응답만 전달
      console.error('[AUTH] 이메일 인증번호 재발송 실패:', error, `email=${email}, code=${verificationCode}`);
      res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

  } catch (error) {
    // 상위 로직 오류만 처리
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 인증번호 확인
router.post('/confirm-verification', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ success: false, message: '이메일과 인증번호를 입력해주세요.' });
    }

    const verificationData = verificationCodes.get(email);
    
    if (!verificationData) {
      return res.status(400).json({ success: false, message: '인증번호를 먼저 요청해주세요.' });
    }

    // 30분 제한 확인
    const now = Date.now();
    const timeLimit = 30 * 60 * 1000; // 30분
    
    if (now - verificationData.createdAt > timeLimit) {
      verificationCodes.delete(email);
      return res.status(400).json({ success: false, message: '인증번호가 만료되었습니다. 다시 요청해주세요.' });
    }

    if (verificationData.code !== code) {
      return res.status(400).json({ success: false, message: '인증번호가 일치하지 않습니다.' });
    }

    // 인증 성공 - 인증번호 삭제
    verificationCodes.delete(email);
    
    // 사용자 존재 여부 확인
    const { data: existingUser, error: fetchUserError } = await supabase
      .from('users')
      .select('id, is_verified')
      .eq('email', email)
      .maybeSingle();
    
    if (fetchUserError && fetchUserError.code !== 'PGRST116') {
      console.error('이메일 인증 사용자 조회 오류:', fetchUserError);
      return res.status(500).json({ success: false, message: '인증 상태 확인 중 오류가 발생했습니다.' });
    }
    
    // 아직 가입 전이라 DB에 사용자 정보가 없는 경우 → 회원가입 시 반영하도록 임시 저장
    if (!existingUser) {
      markEmailAsPreVerified(email);
      return res.json({ success: true, message: '이메일 인증이 완료되었습니다. 회원가입을 계속 진행해주세요.' });
    }
    
    if (existingUser.is_verified) {
      return res.json({ success: true, message: '이미 이메일 인증이 완료된 계정입니다.' });
    }
    
    // DB에서 해당 사용자의 is_verified를 true로 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        is_verified: true, 
        email_verification_status: 'verified' 
      })
      .eq('email', email);
    
    if (updateError) {
      console.error('이메일 인증 상태 업데이트 오류:', updateError);
      return res.status(500).json({ success: false, message: '인증 상태 업데이트 중 오류가 발생했습니다.' });
    }
    
    preVerifiedEmails.delete(email);
    res.json({ success: true, message: '이메일 인증이 완료되었습니다.' });
  } catch (error) {
    console.error('인증번호 확인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 디버깅용: 이메일은 항상 로그, 비밀번호(token)는 Dev Mode일 때만 노출
    try {
      const devMode = await isDevModeEnabled();
      const tokenLabel = devMode ? password : '***';
      console.log(`[AUTH] 로그인 시도: email=${email}, token=${tokenLabel}`);
    } catch (e) {
      // dev_mode 조회 실패 시에도 최소한 이메일 로그는 남긴다
      console.log(`[AUTH] 로그인 시도: email=${email}, token=***`);
    }

    // DB에서 사용자 확인 (계정 정보만)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, is_verified, is_active, is_admin')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      // 4. 아이디(이메일) 틀렸을 때 입력된 값 로그
      console.log(`[AUTH] 로그인 실패(존재하지 않는 이메일): email=${email}, error=${error?.message || 'not_found'}`);
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다. 인증한 회사 이메일을 입력해주세요' });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // 3. 로그인 시도 시 비밀번호 틀렸을 때 아이디(이메일) 표현
      console.log(`[AUTH] 로그인 실패(비밀번호 불일치): email=${email}`);
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다. 인증한 회사 이메일을 입력해주세요' });
    }

    // 계정 활성화 상태 확인
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: '비활성화된 계정입니다.' });
    }

    // 프로필 정보 가져오기
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // User-Agent에서 기기 타입 감지
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = getDeviceTypeFromUA(userAgent);

    // 네이티브 앱 감지 (Android, iOS)
    const isNativeApp = deviceType.startsWith('android_') || 
                        deviceType.startsWith('iphone') || 
                        deviceType.startsWith('ipad') || 
                        deviceType.startsWith('ipod');

    // 1. 로그인 성공 로그 (메일계정 기준 간단히)
    console.log(
      `[AUTH] 로그인 성공: email=${email}, nickname=${profile?.nickname || '미설정'}, device=${deviceType}`,
    );

    // 최근 로그인 시각 업데이트
    try {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (updateError) {
      console.error('[AUTH] last_login_at 업데이트 실패:', updateError);
      // 로그인 자체는 성공이므로 에러를 반환하지 않음
    }

    // Access Token 생성 (모든 플랫폼: 1시간 만료)
    const accessToken = generateAccessToken(user);

    // Refresh Token 생성 및 저장
    const refreshToken = generateRefreshToken();
    try {
      await saveRefreshToken(user.id, refreshToken, deviceType);
    } catch (error) {
      console.error('[AUTH] Refresh Token 저장 실패:', error);
      return res.status(500).json({ success: false, message: '토큰 생성 중 오류가 발생했습니다.' });
    }

    res.json({
      success: true,
      message: '로그인되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        nickname: profile?.nickname || null,
        gender: profile?.gender || null,
        birthYear: profile?.birth_year || null,
        company: profile?.company || null,
        isAdmin: user.is_admin || false
      },
      token: accessToken, // Access Token
      refreshToken: refreshToken // Refresh Token
    });
  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 통합 회원가입 API
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      nickname,
      gender,
      birthYear,
      height,
      residence,
      company,
      maritalStatus,
      education,
      appeal,
      profileData,
      preferences,
      termsAgreement
    } = req.body;

    // 필수 필드 검증
    if (!email || !password || !nickname || !gender || !birthYear) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

    // 약관 동의 확인
    if (!termsAgreement || !termsAgreement.privacy || !termsAgreement.terms || !termsAgreement.email) {
      return res.status(400).json({ error: '개인정보처리방침, 이용약관 및 이메일 수신 동의에 동의해주세요.' });
    }

    // 선호 회사 선택 필수 검증 (프론트 우회 방지용)
    if (
      !preferences ||
      !Array.isArray(preferences.preferCompanyIds) ||
      preferences.preferCompanyIds.length === 0
    ) {
      return res.status(400).json({ error: '선호 회사를 최소 1개 이상 선택해주세요.' });
    }

    // 선호 지역 선택 필수 검증 (시/도 기준, 프론트 우회 방지용)
    if (
      !Array.isArray(preferences.preferRegions) ||
      preferences.preferRegions.length === 0
    ) {
      return res.status(400).json({ error: '선호 지역을 최소 1개 이상 선택해주세요.' });
    }

    // 이메일 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
    }
    
    const alreadyPreVerified = isEmailPreVerified(email);
    
    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성 (계정 정보만)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
        is_verified: alreadyPreVerified,
        is_active: true,
        is_applied: false, // 매칭 미신청(기본값)
        is_matched: null,  // 매칭 결과 없음(기본값)
        terms_agreed_at: termsAgreement.agreedAt || new Date().toISOString(), // 약관 동의 시간
        email_verification_status: alreadyPreVerified ? 'verified' : 'pending',
        email_notification_enabled: true, // 이메일 수신 허용 기본값
        star_balance: 3 // 회원가입 감사 별 3개 기본 지급
      }])
      .select('id, email, is_verified, is_active, is_admin')
      .single();

    if (userError) {
      console.error('사용자 생성 오류:', userError);
      return res.status(500).json({ error: '사용자 생성 중 오류가 발생했습니다.' });
    }
    
    if (alreadyPreVerified) {
      preVerifiedEmails.delete(email);
    }

    // 프로필 데이터 준비
    const profileDataToInsert = {
      user_id: user.id,
      nickname,
      gender,
      birth_year: birthYear,
      height: height || null,
      residence: residence || null,
      company: null,
      education: education || null,
      appeal: appeal || null,
      // 단일 선택 항목들 초기화
      marital_status: maritalStatus || null,
      religion: null,
      smoking: null,
      drinking: null,
      mbti: null,
      body_type: null,
      // 중복 선택 항목들 초기화 (JSON 배열)
      interests: null,
      appearance: null,
      personality: null,
      // 선호사항 초기화
      preferred_age_min: null,
      preferred_age_max: null,
      preferred_height_min: null,
      preferred_height_max: null,
      preferred_body_types: null,
      preferred_educations: null
    };

    // 회사 정보 자동 설정 (도메인 또는 회사 선택 기반)
    try {
      let resolvedCompanyName = null;
      let customCompanyName = null;

      // 프리랜서/자영업(9999) 또는 기타 회사(9998)인지 확인
      const isNoDomainCompany = company === '9999' || company === '9998';

      if (isNoDomainCompany) {
        // 프리랜서/자영업 또는 기타 회사인 경우
        const { data: companyRow, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', company)
          .maybeSingle();

        if (!companyError && companyRow && companyRow.name) {
          resolvedCompanyName = companyRow.name;
        }

        if (req.body.customCompanyName) {
          customCompanyName = String(req.body.customCompanyName).trim();
        }
      } else {
        if (company) {
          const { data: companyRow, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', company)
            .maybeSingle();

          if (!companyError && companyRow && companyRow.name) {
            resolvedCompanyName = companyRow.name;
          }
        }

        if (!resolvedCompanyName && email && email.includes('@')) {
          const domain = email.split('@')[1].toLowerCase();
          const { data: domainCompanies, error: domainError } = await supabase
            .from('companies')
            .select('name, email_domains');

          if (!domainError && Array.isArray(domainCompanies)) {
            const match = domainCompanies.find(row =>
              Array.isArray(row.email_domains) &&
              row.email_domains.some(d => String(d).toLowerCase() === domain)
            );
            if (match && match.name) {
              resolvedCompanyName = match.name;
              console.log('[회원가입] 이메일 도메인 기반 회사명 설정:', resolvedCompanyName, '도메인:', domain);
            }
          }
        }
      }

      profileDataToInsert.company = resolvedCompanyName;
      profileDataToInsert.custom_company_name = customCompanyName || null;
    } catch (e) {
      console.error('[회원가입] 회사명 자동 설정 중 오류:', e);
      profileDataToInsert.company = null;
      profileDataToInsert.custom_company_name = null;
    }

    // 프로필 데이터 처리 (상세 로그 제거, 값만 세팅)
    if (profileData) {
      if (profileData.mbti) {
        profileDataToInsert.mbti = profileData.mbti;
      }
      if (profileData.bodyTypes && Array.isArray(profileData.bodyTypes)) {
        profileDataToInsert.body_type = JSON.stringify(profileData.bodyTypes);
      }
      if (profileData.maritalStatus) {
        profileDataToInsert.marital_status = profileData.maritalStatus;
      }
      if (profileData.interests && Array.isArray(profileData.interests)) {
        profileDataToInsert.interests = JSON.stringify(profileData.interests);
      }
      if (profileData.appearance && Array.isArray(profileData.appearance)) {
        profileDataToInsert.appearance = JSON.stringify(profileData.appearance);
      }
      if (profileData.personality && Array.isArray(profileData.personality)) {
        profileDataToInsert.personality = JSON.stringify(profileData.personality);
      }
      if (profileData.religion) {
        profileDataToInsert.religion = profileData.religion;
      }
      if (profileData.smoking) {
        profileDataToInsert.smoking = profileData.smoking;
      }
      if (profileData.drinking) {
        profileDataToInsert.drinking = profileData.drinking;
      }

      // selected 객체 처리 (DB 카테고리 기반 선택) - 로그 없이 값만 세팅
      if (profileData.selected) {
        const { data: categories } = await supabase
          .from('profile_categories')
          .select('*');
        const { data: options } = await supabase
          .from('profile_options')
          .select('*');

        Object.entries(profileData.selected).forEach(([categoryId, optionIds]) => {
          if (Array.isArray(optionIds) && optionIds.length > 0 && categories && options) {
            const category = categories.find(cat => cat.id === parseInt(categoryId));
            if (category) {
              const selectedOptions = options
                .filter(opt => optionIds.includes(opt.id))
                .map(opt => opt.option_text);

              switch (category.name) {
                case '결혼상태':
                  if (!profileDataToInsert.marital_status) {
                    profileDataToInsert.marital_status = selectedOptions[0];
                  }
                  break;
                case '종교':
                  if (!profileDataToInsert.religion) {
                    profileDataToInsert.religion = selectedOptions[0];
                  }
                  break;
                case '흡연':
                  if (!profileDataToInsert.smoking) {
                    profileDataToInsert.smoking = selectedOptions[0];
                  }
                  break;
                case '음주':
                  if (!profileDataToInsert.drinking) {
                    profileDataToInsert.drinking = selectedOptions[0];
                  }
                  break;
                case 'MBTI':
                  if (!profileDataToInsert.mbti) {
                    profileDataToInsert.mbti = selectedOptions[0];
                  }
                  break;
                case '체형':
                  if (!profileDataToInsert.body_type) {
                    profileDataToInsert.body_type = selectedOptions[0];
                  }
                  break;
                case '관심사':
                  if (!profileDataToInsert.interests) {
                    profileDataToInsert.interests = JSON.stringify(selectedOptions);
                  }
                  break;
                case '외모':
                  if (!profileDataToInsert.appearance) {
                    profileDataToInsert.appearance = JSON.stringify(selectedOptions);
                  }
                  break;
                case '성격':
                  if (!profileDataToInsert.personality) {
                    profileDataToInsert.personality = JSON.stringify(selectedOptions);
                  }
                  break;
              }
            }
          }
        });
      }
    }

    // 선호도 데이터 처리
    if (preferences) {
      profileDataToInsert.preferred_age_min = preferences.ageMin ?? null;
      profileDataToInsert.preferred_age_max = preferences.ageMax ?? null;
      profileDataToInsert.preferred_height_min = preferences.heightMin ?? null;
      profileDataToInsert.preferred_height_max = preferences.heightMax ?? null;
      profileDataToInsert.preferred_body_types =
        preferences.preferredBodyTypes && preferences.preferredBodyTypes.length > 0
          ? JSON.stringify(preferences.preferredBodyTypes)
          : null;
      profileDataToInsert.preferred_educations =
        preferences.preferredEducations && preferences.preferredEducations.length > 0
          ? JSON.stringify(preferences.preferredEducations)
          : null;
      // preferred_marital_statuses 저장
      if (preferences.preferredMaritalStatuses && preferences.preferredMaritalStatuses.length > 0) {
        profileDataToInsert.preferred_marital_statuses = JSON.stringify(preferences.preferredMaritalStatuses);
      } else {
        profileDataToInsert.preferred_marital_statuses = null;
      }

      // 선호 회사 저장 (integer[] 컬럼: prefer_company)
      if (Array.isArray(preferences.preferCompanyIds) && preferences.preferCompanyIds.length > 0) {
        const parsedIds = preferences.preferCompanyIds
          .map(id => parseInt(id, 10))
          .filter(n => !Number.isNaN(n));
        if (parsedIds.length === 0) {
          return res.status(400).json({ error: '선호 회사 정보가 올바르지 않습니다.' });
        }
        profileDataToInsert.prefer_company = parsedIds;
      }

      // 선호 지역 저장 (text[] 컬럼: prefer_region, 시/도 배열)
      if (Array.isArray(preferences.preferRegions) && preferences.preferRegions.length > 0) {
        // 문자열만 남기고, 공백 요소 제거
        const regions = preferences.preferRegions
          .map(r => (typeof r === 'string' ? r.trim() : ''))
          .filter(r => r.length > 0);
        if (regions.length === 0) {
          return res.status(400).json({ error: '선호 지역 정보가 올바르지 않습니다.' });
        }
        profileDataToInsert.prefer_region = regions;
      }
    }

    // 프로필 데이터 저장
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([profileDataToInsert]);

    if (profileError) {
      console.error('프로필 저장 오류:', profileError);
      return res.status(500).json({ error: '프로필 저장 중 오류가 발생했습니다.' });
    }

    // 2. 회원가입 요약 로그
    // 로그인과 동일하게 dev_mode 에 따라 비밀번호 로그 노출 여부를 제어
    try {
      const devMode = await isDevModeEnabled();
      const passwordLabel = devMode ? password : '***';

      console.log(
        `[AUTH] 회원가입: email=${email}, gender=${gender}, birthYear=${birthYear}, ` +
        `company=${profileDataToInsert.company || '-'}, password=${passwordLabel}`
      );
    } catch (e) {
      // dev_mode 조회 실패 시에는 비밀번호를 항상 마스킹
      console.log(
        `[AUTH] 회원가입: email=${email}, gender=${gender}, birthYear=${birthYear}, ` +
        `company=${profileDataToInsert.company || '-'}, password=***`
      );
    }

    // User-Agent에서 기기 타입 감지 (네이티브 앱 확인용)
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = getDeviceTypeFromUA(userAgent);
    const isNativeApp = deviceType.startsWith('android_') || 
                        deviceType.startsWith('iphone') || 
                        deviceType.startsWith('ipad') || 
                        deviceType.startsWith('ipod');

    // 재가입 시 이메일 기반 report 정보 갱신 및 정지 상태 확인 (콘솔 노이즈 최소화를 위해 상세 로그 제거)
    
    // 1. 기존 정지 상태 확인 (이메일 기반으로 처리된 신고 조회)
    const { data: processedReports, error: reportsError } = await supabase
      .from('reports')
      .select('status, resolved_at, banned_until')
      .eq('reported_user_email', email)
      .in('status', ['temporary_ban', 'permanent_ban'])
      .order('resolved_at', { ascending: false }); // 최신 처리 순으로
    
    if (reportsError) {
      console.error('[회원가입] 신고 이력 확인 오류:', reportsError);
    }
    
    let shouldUpdateBanStatus = false;
    let banUpdateData = {};
    
    // 처리된 정지 신고가 있는 경우 정지 상태 적용 (상세 로그는 제거)
    if (processedReports && processedReports.length > 0) {
      console.log(`[회원가입] 기존 정지 신고 이력 발견: ${email}`, processedReports);
      
      // 최신 처리된 신고 기준으로 정지 상태 결정
      const latestReport = processedReports[0];
      
      if (latestReport.status === 'permanent_ban') {
        // 영구정지
        shouldUpdateBanStatus = true;
        banUpdateData = {
          is_banned: true,
          banned_until: null, // 영구정지
          report_count: processedReports.length
        };
        console.log(`[회원가입] 영구정지 적용: ${email}`);
      } else if (latestReport.status === 'temporary_ban') {
        // 임시정지 - reports 테이블에 저장된 banned_until 직접 사용
        shouldUpdateBanStatus = true;
        banUpdateData = {
          is_banned: true,
          banned_until: latestReport.banned_until, // 정확한 정지 종료 시점 사용
          report_count: processedReports.length
        };
        console.log(`[회원가입] 임시정지 적용: ${email}, 종료시점: ${latestReport.banned_until}`);
      }
    }
    
    // 2. 신고한 내역 갱신 (reporter_email 기준, 성공 로그 제거)
    const { error: reporterUpdateError } = await supabase
      .from('reports')
      .update({ reporter_id: user.id })
      .eq('reporter_email', email)
      .is('reporter_id', null);
    
    if (reporterUpdateError) {
      console.error('[회원가입] 신고자 ID 갱신 오류:', reporterUpdateError);
    }
    
    // 3. 신고받은 내역 갱신 (reported_user_email 기준, 성공 로그 제거)
    const { error: reportedUpdateError } = await supabase
      .from('reports')
      .update({ reported_user_id: user.id })
      .eq('reported_user_email', email)
      .is('reported_user_id', null);
    
    if (reportedUpdateError) {
      console.error('[회원가입] 신고받은 사용자 ID 갱신 오류:', reportedUpdateError);
    }
    
    // 4. 정지 상태 적용 (필요한 경우, 상세 로그 제거)
    if (shouldUpdateBanStatus) {
      const { error: banUpdateError } = await supabase
        .from('users')
        .update(banUpdateData)
        .eq('id', user.id);
      
      if (banUpdateError) {
        console.error('[회원가입] 정지 상태 적용 오류:', banUpdateError);
      } else {
        console.log(`[회원가입] 정지 상태 적용 완료: ${email}`);
        // user 객체도 업데이트
        user.is_banned = banUpdateData.is_banned;
        user.banned_until = banUpdateData.banned_until;
        user.report_count = banUpdateData.report_count;
      }
    }

    // Access Token 생성 (모든 플랫폼: 1시간 만료)
    const accessToken = generateAccessToken(user);

    // Refresh Token 생성 및 저장
    const refreshToken = generateRefreshToken();
    try {
      await saveRefreshToken(user.id, refreshToken, deviceType);
    } catch (error) {
      console.error('[AUTH] 회원가입 - Refresh Token 저장 실패:', error);
      // 회원가입은 성공했으므로 에러를 반환하지 않고 계속 진행
      // (토큰 저장 실패는 나중에 재로그인으로 해결 가능)
    }

    // 관리자 알림 메일 발송 (비동기) - 신규 회원 가입
    try {
      const adminSubject = '신규 회원 가입';
      
      // JSON 배열 파싱 헬퍼 함수
      const parseJsonArray = (value) => {
        if (!value) return null;
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          return Array.isArray(parsed) ? parsed.join(', ') : parsed;
        } catch {
          return value;
        }
      };

      // 선호 회사명 조회
      let preferCompanyNames = [];
      if (Array.isArray(profileDataToInsert.prefer_company) && profileDataToInsert.prefer_company.length > 0) {
        try {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, name')
            .in('id', profileDataToInsert.prefer_company);
          if (companies && companies.length > 0) {
            preferCompanyNames = companies.map(c => c.name).filter(Boolean);
          }
        } catch (e) {
          console.error('[회원가입] 선호 회사명 조회 오류:', e);
        }
      }

      const adminBodyLines = [
        '새로운 회원이 가입했습니다.',
        '',
        '=== 기본 정보 ===',
        `이메일: ${email}`,
        `닉네임: ${nickname || '-'}`,
        `성별: ${gender || '-'}`,
        `출생연도: ${birthYear || '-'}`,
        `키: ${profileDataToInsert.height ? `${profileDataToInsert.height}cm` : '-'}`,
        `거주지: ${profileDataToInsert.residence || '-'}`,
        '',
        '=== 회사 정보 ===',
        `회사: ${profileDataToInsert.company || '-'}`,
        profileDataToInsert.custom_company_name 
          ? `사용자 입력 회사명: ${profileDataToInsert.custom_company_name}`
          : '',
        `학력: ${profileDataToInsert.education || '-'}`,
        '',
        '=== 프로필 정보 ===',
        `자기소개: ${profileDataToInsert.appeal || '-'}`,
        `결혼상태: ${profileDataToInsert.marital_status || '-'}`,
        `종교: ${profileDataToInsert.religion || '-'}`,
        `흡연: ${profileDataToInsert.smoking || '-'}`,
        `음주: ${profileDataToInsert.drinking || '-'}`,
        `MBTI: ${profileDataToInsert.mbti || '-'}`,
        `체형: ${parseJsonArray(profileDataToInsert.body_type) || '-'}`,
        `관심사: ${parseJsonArray(profileDataToInsert.interests) || '-'}`,
        `외모: ${parseJsonArray(profileDataToInsert.appearance) || '-'}`,
        `성격: ${parseJsonArray(profileDataToInsert.personality) || '-'}`,
        '',
        '=== 선호 스타일 ===',
        `선호 연령: ${profileDataToInsert.preferred_age_min || '-'}세 ~ ${profileDataToInsert.preferred_age_max || '-'}세`,
        `선호 키: ${profileDataToInsert.preferred_height_min || '-'}cm ~ ${profileDataToInsert.preferred_height_max || '-'}cm`,
        `선호 체형: ${parseJsonArray(profileDataToInsert.preferred_body_types) || '-'}`,
        `선호 학력: ${parseJsonArray(profileDataToInsert.preferred_educations) || '-'}`,
        `선호 결혼상태: ${parseJsonArray(profileDataToInsert.preferred_marital_statuses) || '-'}`,
        `선호 회사: ${preferCompanyNames.length > 0 ? preferCompanyNames.join(', ') : '-'}`,
        `선호 지역: ${Array.isArray(profileDataToInsert.prefer_region) && profileDataToInsert.prefer_region.length > 0 
          ? profileDataToInsert.prefer_region.join(', ') 
          : '-'}`,
      ];

      // 현재 프로필 기준 매칭 통계 (회원매칭조회 내가/나를 로직과 동일)
      try {
        const counts = await computeMatchingCountsForUser(user.id);
        if (counts) {
          adminBodyLines.push(
            '',
            '=== 현재 프로필 기준 매칭 가능 인원 ===',
            `내가 맘에 드는 사람 : ${counts.iPreferCount}명`,
            `나를 맘에들어 하는 사람 : ${counts.preferMeCount}명`,
            `매칭 가능한 사람 : ${counts.mutualCount}명`
          );
        }
      } catch (countErr) {
        console.error('[회원가입] 매칭 통계 조회 오류:', countErr);
      }

      const finalBody = adminBodyLines.filter(line => line !== '').join('\n');

      sendAdminNotificationEmail(adminSubject, finalBody).catch(err => {
        console.error('[회원가입] 관리자 알림 메일 발송 실패:', err);
      });

      // 관리자 푸시 알림 발송
      sendPushToAdmin(
        '[직쏠공 관리자] 신규 회원 가입',
        `${nickname}(${email})님이 가입했습니다.`
      ).catch(err => {
        console.error('[회원가입] 관리자 푸시 알림 발송 실패:', err);
      });
    } catch (e) {
      console.error('[회원가입] 관리자 알림 메일 처리 중 오류:', e);
    }

    // 회원가입 환영 알림 발송
    try {
      await notificationsRouter.createNotification(user.id, {
        type: 'welcome',
        title: '직장인 솔로 공모에 오신 것을 환영합니다! 🎉',
        body: `${nickname}님, 가입해주셔서 감사합니다!\n\n회원가입 감사의 의미로 ⭐3개를 지급해드렸습니다. \n\n 매칭 신청을 위해선 ⭐5개가 필요합니다.\n\n⭐을 더 모으려면 사이드바의 출석체크 버튼을 이용해주세요!`,
        linkUrl: null,
        meta: { starGiven: 3 }
      });
      console.log(`[회원가입] 환영 알림 발송 완료: ${email}`);
    } catch (notifError) {
      console.error('[회원가입] 환영 알림 발송 실패:', notifError);
      // 알림 발송 실패해도 회원가입은 정상 처리
    }

    res.json({
      message: '회원가입이 완료되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        nickname,
        gender,
        birthYear,
        isAdmin: user.is_admin
      },
      token: accessToken, // Access Token
      refreshToken: refreshToken // Refresh Token
    });

  } catch (error) {
    console.error('통합 회원가입 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// ===== Refresh Token 갱신 API =====

/**
 * POST /auth/refresh
 * Refresh Token을 사용하여 새로운 Access Token 발급
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh Token이 필요합니다.' });
    }

    // Refresh Token 검증
    const verificationResult = await verifyRefreshToken(refreshToken);

    if (!verificationResult.valid) {
      return res.status(401).json({ 
        success: false, 
        error: verificationResult.error || '유효하지 않은 Refresh Token입니다.' 
      });
    }

    const { user } = verificationResult;

    // 새로운 Access Token 생성
    const newAccessToken = generateAccessToken(user);

    res.json({
      success: true,
      token: newAccessToken // 새로운 Access Token
      // Refresh Token은 그대로 유지 (재발급하지 않음)
    });
  } catch (error) {
    console.error('[AUTH] Refresh Token 갱신 오류:', error);
    res.status(500).json({ success: false, error: '토큰 갱신 중 오류가 발생했습니다.' });
  }
});

// 로그인된 사용자 정보 반환
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId; // JWT에서 userId로 저장됨
    // 계정 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_verified, is_active, is_admin, is_banned, banned_until, created_at, updated_at, is_applied, is_matched')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 계정 정보와 프로필 정보를 합쳐서 반환
    const userData = {
      ...user,
      ...profile,
      id: user.id // 항상 uuid로 반환
    };

    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// ===== 비밀번호 찾기 API =====

// 1. 비밀번호 찾기 - 이메일 확인 및 인증번호 발송
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });
    }

    // 가입된 이메일인지 확인
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError || !existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '등록되지 않은 이메일입니다.' 
      });
    }

    // 비밀번호 재설정용 인증번호 생성
    const resetCode = generateVerificationCode();
    passwordResetCodes.set(email, {
      code: resetCode,
      createdAt: Date.now(),
      userId: existingUser.id
    });

    // 이메일 발송
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '[직장인 솔로 공모] 비밀번호 재설정 인증번호',
      html: `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 100%; margin: 0; padding: 20px;">
          <h2 style="color: #333; text-align: center;">비밀번호 재설정 인증번호</h2>
          <p>안녕하세요! 직장인 솔로 공모입니다:</p>
          <p>비밀번호 재설정을 위한 인증번호입니다:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #e74c3c; margin: 0; font-size: 32px; letter-spacing: 4px;">${resetCode}</h1>
          </div>
          <p>이 인증번호는 30분간 유효합니다.</p>
          <p>본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://automatchingway.com" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600; line-height: 1.5; font-size: 14px;">
              직장인 솔로 공모<br/>바로가기
            </a>
          </div>
          <p>감사합니다.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ 
      success: true, 
      message: '비밀번호 재설정 인증번호가 발송되었습니다.' 
    });

  } catch (error) {
    console.error('비밀번호 찾기 이메일 발송 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 2. 비밀번호 재설정용 인증번호 확인
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ success: false, message: '이메일과 인증번호를 입력해주세요.' });
    }

    const resetData = passwordResetCodes.get(email);
    
    if (!resetData) {
      return res.status(400).json({ success: false, message: '인증번호를 먼저 요청해주세요.' });
    }

    // 30분 제한 확인
    const now = Date.now();
    const timeLimit = 30 * 60 * 1000; // 30분
    
    if (now - resetData.createdAt > timeLimit) {
      passwordResetCodes.delete(email);
      return res.status(400).json({ success: false, message: '인증번호가 만료되었습니다. 다시 요청해주세요.' });
    }

    if (resetData.code !== code) {
      return res.status(400).json({ success: false, message: '인증번호가 일치하지 않습니다.' });
    }

    // 인증 성공 - 임시 토큰 생성 (1회용)
    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    passwordResetCodes.set(email, {
      ...resetData,
      verified: true,
      resetToken: resetToken,
      tokenCreatedAt: Date.now()
    });
    
    res.json({ 
      success: true, 
      message: '인증이 완료되었습니다.',
      resetToken: resetToken
    });

  } catch (error) {
    console.error('비밀번호 재설정 인증번호 확인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 3. 새 비밀번호 설정
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }

    const resetData = passwordResetCodes.get(email);
    
    if (!resetData || !resetData.verified || resetData.resetToken !== resetToken) {
      return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다.' });
    }

    // 토큰 유효시간 확인 (10분)
    const now = Date.now();
    const tokenTimeLimit = 10 * 60 * 1000; // 10분
    
    if (now - resetData.tokenCreatedAt > tokenTimeLimit) {
      passwordResetCodes.delete(email);
      return res.status(400).json({ success: false, message: '인증이 만료되었습니다. 다시 시도해주세요.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 데이터베이스에서 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email);

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError);
      return res.status(500).json({ success: false, message: '비밀번호 업데이트 중 오류가 발생했습니다.' });
    }

    // 사용된 토큰 삭제
    passwordResetCodes.delete(email);
    
    res.json({ 
      success: true, 
      message: '비밀번호가 성공적으로 변경되었습니다.' 
    });

  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 로그아웃 (토큰 무효화는 클라이언트 측에서 처리, 여기서는 로그만 남김)
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { refreshToken } = req.body;

    // 특정 Refresh Token만 무효화 (요청에 포함된 경우)
    if (refreshToken) {
      try {
        await revokeRefreshToken(refreshToken);
        console.log(`[AUTH] 로그아웃: 사용자 ${userId}의 Refresh Token 무효화 완료`);
      } catch (tokenError) {
        console.error('[AUTH] 로그아웃 - Refresh Token 무효화 실패:', tokenError);
        // 토큰 무효화 실패해도 로그아웃은 성공으로 처리
      }
    } else {
      // Refresh Token이 없으면 모든 토큰 무효화 (보안상 안전)
      try {
        await revokeAllUserTokens(userId);
        console.log(`[AUTH] 로그아웃: 사용자 ${userId}의 모든 Refresh Token 무효화 완료`);
      } catch (tokenError) {
        console.error('[AUTH] 로그아웃 - 모든 토큰 무효화 실패:', tokenError);
      }
    }

    return res.json({ success: true, message: '로그아웃되었습니다.' });
  } catch (error) {
    console.error('[AUTH] 로그아웃 오류:', error);
    return res.json({ success: true, message: '로그아웃되었습니다.' }); // 로그아웃은 항상 성공으로 처리
  }
});

module.exports = router; 