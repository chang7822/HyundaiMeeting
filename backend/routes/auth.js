const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { supabase } = require('../database');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

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

// 환경 변수 확인
console.log('=== 환경 변수 확인 ===');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '설정됨' : '설정되지 않음');
console.log('=====================');

// 인증번호 임시 저장 (데이터베이스로 변경 예정)
const verificationCodes = new Map();

// 이메일 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 이메일 설정 확인
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ 이메일 서버 연결 실패:', error);
    console.error('에러 코드:', error.code);
    console.error('에러 메시지:', error.message);
  } else {
    console.log('✅ 이메일 서버 연결 성공');
  }
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

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '울산 사내 솔로공모 이메일 인증',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">[울산 사내 솔로공모] 이메일 인증</h2>
        <p>안녕하세요! 현대자동차 사내 만남 서비스인 [울산 사내 솔로공모]에 가입해주셔서 감사합니다.</p>
        <p>아래 인증번호를 입력하여 이메일 인증을 완료해주세요:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #667eea; font-size: 32px; margin: 0;">${code}</h1>
        </div>
        <p>이 인증번호는 30분간 유효합니다.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          <strong>송신 시각:</strong> ${koreanTime} (한국 시간)<br>
          <strong>만료 시각:</strong> ${new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Seoul'
          }).format(new Date(now.getTime() + 30 * 60 * 1000))} (한국 시간)
        </p>
        <p>감사합니다.</p>
      </div>
    `
  };

  try {
    console.log('📧 이메일 발송 시도:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      sentAt: koreanTime
    });
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ 이메일 발송 성공 결과:', result);
    return true;
  } catch (error) {
    console.error('❌ 이메일 발송 실패 상세:', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
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

    // 환경 변수 확인
    console.log('환경 변수 확인:', {
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? '설정됨' : '설정되지 않음',
      NODE_ENV: process.env.NODE_ENV
    });

    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      createdAt: Date.now()
    });

    

    const emailSent = await sendVerificationEmail(email, verificationCode);
    
    if (emailSent) {
      console.log(`✅ 이메일 발송 성공: ${email}`);
        // 개발 모드에서 인증번호를 콘솔에 출력
      console.log('\n🔐 === 개발 모드: 인증번호 확인 ===');
      console.log(`📧 이메일: ${email}`);
      console.log(`🔢 인증번호: ${verificationCode}`);
      console.log('================================\n');
      res.json({ success: true, message: '인증 메일이 발송되었습니다.' });
    } else {
      // 이메일 발송 실패 시에도 인증번호는 이미 위에서 출력됨
      console.log(`❌ 이메일 발송 실패: ${email}`);
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

    // DB에서 사용자 확인 (계정 정보만)
    const { data: user, error } = await supabase.from('users').select('id, email, password, is_verified, is_active, is_admin').eq('email', email).single();
    
    if (error || !user) {
      console.log('❌ 사용자 조회 실패:', error?.message || '사용자를 찾을 수 없음');
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ 비밀번호 불일치:', email);
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 계정 활성화 상태 확인
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: '비활성화된 계정입니다.' });
    }

    // 프로필 정보 가져오기
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('✅ 로그인 성공:', { email, isAdmin: user.is_admin });

    const token = jwt.sign(
      { userId: user.id, id: user.id, email: user.email, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '로그인되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        gender: profile?.gender || null,
        birthYear: profile?.birth_year || null,
        company: profile?.company || null,
        isAdmin: user.is_admin || false
      },
      token
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
      jobType,
      appeal,
      profileData,
      preferences
    } = req.body;

    // 필수 필드 검증
    if (!email || !password || !nickname || !gender || !birthYear) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
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

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성 (계정 정보만)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
        is_verified: true, // 이메일 인증 완료 가정
        is_active: true,
        is_applied: false, // 매칭 미신청(기본값)
        is_matched: null   // 매칭 결과 없음(기본값)
      }])
      .select('id, email, is_verified, is_active, is_admin')
      .single();

    if (userError) {
      console.error('사용자 생성 오류:', userError);
      return res.status(500).json({ error: '사용자 생성 중 오류가 발생했습니다.' });
    }

    // 프로필 데이터 준비
    const profileDataToInsert = {
      user_id: user.id,
      nickname,
      gender,
      birth_year: birthYear,
      height: height || null,
      residence: residence || null,
      company: company || null,
      job_type: jobType || null,
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
      preferred_job_types: null
    };

    // 프로필 데이터 처리
    if (profileData) {
      console.log('=== 프로필 데이터 처리 시작 ===');
      console.log('받은 profileData:', JSON.stringify(profileData, null, 2));
      
      // 1. 직접 입력된 값들 처리 (프론트엔드에서 직접 관리하는 값들)
      if (profileData.mbti) {
        profileDataToInsert.mbti = profileData.mbti;
        console.log('MBTI 설정:', profileData.mbti);
      }
      if (profileData.bodyTypes && Array.isArray(profileData.bodyTypes)) {
        profileDataToInsert.body_type = JSON.stringify(profileData.bodyTypes);
        console.log('체형(복수) 설정:', profileData.bodyTypes);
      }
      if (profileData.maritalStatus) {
        profileDataToInsert.marital_status = profileData.maritalStatus;
        console.log('결혼상태 설정:', profileData.maritalStatus);
      }
      if (profileData.interests && Array.isArray(profileData.interests)) {
        profileDataToInsert.interests = JSON.stringify(profileData.interests);
        console.log('관심사 설정:', profileData.interests);
      }
      if (profileData.appearance && Array.isArray(profileData.appearance)) {
        profileDataToInsert.appearance = JSON.stringify(profileData.appearance);
        console.log('외모 설정:', profileData.appearance);
      }
      if (profileData.personality && Array.isArray(profileData.personality)) {
        profileDataToInsert.personality = JSON.stringify(profileData.personality);
        console.log('성격 설정:', profileData.personality);
      }
      if (profileData.religion) {
        profileDataToInsert.religion = profileData.religion;
        console.log('종교 설정:', profileData.religion);
      }
      if (profileData.smoking) {
        profileDataToInsert.smoking = profileData.smoking;
        console.log('흡연 설정:', profileData.smoking);
      }
      if (profileData.drinking) {
        profileDataToInsert.drinking = profileData.drinking;
        console.log('음주 설정:', profileData.drinking);
      }

      // 2. selected 객체 처리 (DB 카테고리 기반 선택)
      if (profileData.selected) {
        console.log('selected 객체 처리 시작:', profileData.selected);
        
        // 카테고리와 옵션 정보 가져오기
        const { data: categories } = await supabase
          .from('profile_categories')
          .select('*');
        
        const { data: options } = await supabase
          .from('profile_options')
          .select('*');
        
        console.log('카테고리 개수:', categories?.length);
        console.log('옵션 개수:', options?.length);
        
        // selected 객체에서 모든 option_id들을 추출하여 프로필 데이터에 매핑
        Object.entries(profileData.selected).forEach(([categoryId, optionIds]) => {
          if (Array.isArray(optionIds) && optionIds.length > 0) {
            const category = categories.find(cat => cat.id === parseInt(categoryId));
            if (category) {
              const selectedOptions = options
                .filter(opt => optionIds.includes(opt.id))
                .map(opt => opt.option_text);

              console.log(`카테고리 "${category.name}" 처리:`, selectedOptions);

              // 카테고리별로 프로필 데이터에 매핑 (직접 입력된 값이 없을 때만)
              switch (category.name) {
                case '결혼상태':
                  if (!profileDataToInsert.marital_status) {
                    profileDataToInsert.marital_status = selectedOptions[0];
                    console.log('결혼상태 설정:', selectedOptions[0]);
                  }
                  break;
                case '종교':
                  if (!profileDataToInsert.religion) {
                    profileDataToInsert.religion = selectedOptions[0];
                    console.log('종교 설정:', selectedOptions[0]);
                  }
                  break;
                case '흡연':
                  if (!profileDataToInsert.smoking) {
                    profileDataToInsert.smoking = selectedOptions[0];
                    console.log('흡연 설정:', selectedOptions[0]);
                  }
                  break;
                case '음주':
                  if (!profileDataToInsert.drinking) {
                    profileDataToInsert.drinking = selectedOptions[0];
                    console.log('음주 설정:', selectedOptions[0]);
                  }
                  break;
                case 'MBTI':
                  if (!profileDataToInsert.mbti) {
                    profileDataToInsert.mbti = selectedOptions[0];
                    console.log('MBTI 설정:', selectedOptions[0]);
                  }
                  break;
                case '직군':
                  if (!profileDataToInsert.job_type) {
                    profileDataToInsert.job_type = selectedOptions[0];
                    console.log('직군 설정:', selectedOptions[0]);
                  }
                  break;
                case '체형':
                  if (!profileDataToInsert.body_type) {
                    profileDataToInsert.body_type = selectedOptions[0];
                    console.log('체형 설정:', selectedOptions[0]);
                  }
                  break;
                case '관심사':
                  if (!profileDataToInsert.interests) {
                    profileDataToInsert.interests = JSON.stringify(selectedOptions);
                    console.log('관심사 설정:', selectedOptions);
                  }
                  break;
                case '외모':
                  if (!profileDataToInsert.appearance) {
                    profileDataToInsert.appearance = JSON.stringify(selectedOptions);
                    console.log('외모 설정:', selectedOptions);
                  }
                  break;
                case '성격':
                  if (!profileDataToInsert.personality) {
                    profileDataToInsert.personality = JSON.stringify(selectedOptions);
                    console.log('성격 설정:', selectedOptions);
                  }
                  break;
              }
            }
          }
        });
      }
      
      console.log('최종 profileDataToInsert:', JSON.stringify(profileDataToInsert, null, 2));
      console.log('=== 프로필 데이터 처리 완료 ===');
    }

    // 선호도 데이터 처리
    if (preferences) {
      profileDataToInsert.preferred_age_min = preferences.ageMin ?? null;
      profileDataToInsert.preferred_age_max = preferences.ageMax ?? null;
      profileDataToInsert.preferred_height_min = preferences.heightMin ?? null;
      profileDataToInsert.preferred_height_max = preferences.heightMax ?? null;
      profileDataToInsert.preferred_body_types = preferences.preferredBodyTypes && preferences.preferredBodyTypes.length > 0 ? JSON.stringify(preferences.preferredBodyTypes) : null;
      profileDataToInsert.preferred_job_types = preferences.preferredJobTypes && preferences.preferredJobTypes.length > 0 ? JSON.stringify(preferences.preferredJobTypes) : null;
      // [추가] preferred_marital_statuses 저장
      if (preferences.preferredMaritalStatuses && preferences.preferredMaritalStatuses.length > 0) {
        profileDataToInsert.preferred_marital_statuses = JSON.stringify(preferences.preferredMaritalStatuses);
      } else {
        profileDataToInsert.preferred_marital_statuses = null;
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

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.id, 
        id: user.id, 
        email: user.email,
        role: user.is_admin ? 'admin' : 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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
      token
    });

  } catch (error) {
    console.error('통합 회원가입 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 로그인된 사용자 정보 반환
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId; // JWT에서 userId로 저장됨
    // 계정 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_verified, is_active, is_admin, created_at, updated_at')
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

module.exports = router; 