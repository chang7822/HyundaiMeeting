const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const router = express.Router();

// 임시 데이터 저장 (실제로는 데이터베이스 사용)
const users = [];
const verificationCodes = new Map();

// 이메일 설정
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 인증번호 생성
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 발송
async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '현대만남 이메일 인증',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">현대만남 이메일 인증</h2>
        <p>안녕하세요! 현대만남 서비스에 가입해주셔서 감사합니다.</p>
        <p>아래 인증번호를 입력하여 이메일 인증을 완료해주세요:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #667eea; font-size: 32px; margin: 0;">${code}</h1>
        </div>
        <p>이 인증번호는 10분간 유효합니다.</p>
        <p>감사합니다.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
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

    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      createdAt: Date.now()
    });

    const emailSent = await sendVerificationEmail(email, verificationCode);
    
    if (emailSent) {
      res.json({ success: true, message: '인증 메일이 발송되었습니다.' });
    } else {
      res.status(500).json({ success: false, message: '이메일 발송에 실패했습니다.' });
    }
  } catch (error) {
    console.error('이메일 인증 요청 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 인증번호 확인
router.post('/confirm-verification', (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ success: false, message: '이메일과 인증번호를 입력해주세요.' });
    }

    const verificationData = verificationCodes.get(email);
    
    if (!verificationData) {
      return res.status(400).json({ success: false, message: '인증번호를 먼저 요청해주세요.' });
    }

    // 10분 제한 확인
    const now = Date.now();
    const timeLimit = 10 * 60 * 1000; // 10분
    
    if (now - verificationData.createdAt > timeLimit) {
      verificationCodes.delete(email);
      return res.status(400).json({ success: false, message: '인증번호가 만료되었습니다. 다시 요청해주세요.' });
    }

    if (verificationData.code !== code) {
      return res.status(400).json({ success: false, message: '인증번호가 일치하지 않습니다.' });
    }

    // 인증 성공 - 인증번호 삭제
    verificationCodes.delete(email);
    
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

    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '로그인되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        company: user.company,
        isAdmin: user.isAdmin || false
      },
      token
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { email, password, company } = req.body;
    
    if (!email || !password || !company) {
      return res.status(400).json({ success: false, message: '모든 필수 정보를 입력해주세요.' });
    }

    // 이미 존재하는 사용자 확인
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '이미 가입된 이메일입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      company,
      isVerified: true,
      isActive: true,
      createdAt: new Date()
    };

    users.push(newUser);

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser.id,
        email: newUser.email,
        company: newUser.company
      },
      token
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 기본 관리자 계정 생성 함수
async function createDefaultAdmin() {
  const adminEmail = 'admin@hyundai.com';
  const adminPassword = 'admin123!';
  
  // 이미 관리자가 존재하는지 확인
  const existingAdmin = users.find(u => u.email === adminEmail);
  if (existingAdmin) {
    console.log('기본 관리자 계정이 이미 존재합니다.');
    return;
  }
  
  // 비밀번호 해시화
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  
  const adminUser = {
    id: 'admin-001',
    email: adminEmail,
    password: hashedPassword,
    company: '현대자동차',
    isVerified: true,
    isActive: true,
    isAdmin: true,
    createdAt: new Date()
  };
  
  users.push(adminUser);
  console.log('기본 관리자 계정이 생성되었습니다:');
  console.log('이메일:', adminEmail);
  console.log('비밀번호:', adminPassword);
}

// 서버 시작 시 관리자 계정 생성
createDefaultAdmin();

module.exports = router; 