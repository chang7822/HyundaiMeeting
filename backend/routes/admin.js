const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const nodemailer = require('nodemailer');

// 임시 데이터 (다른 라우트와 공유)
const users = [];
const matches = [];

// 모든 사용자 조회 (계정 정보 + 프로필 정보)
router.get('/users', async (req, res) => {
  try {
    // 계정 정보 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, is_verified, is_active, is_admin, created_at, updated_at');

    if (usersError) {
      console.error('사용자 조회 오류:', usersError);
      return res.status(500).json({ message: '사용자 조회에 실패했습니다.' });
    }

    // 각 사용자의 프로필 정보도 함께 조회
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        return {
          ...user,
          ...profile
        };
      })
    );
    
    res.json(usersWithProfiles);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 모든 매칭 조회 (임시)
router.get('/matches', (req, res) => {
  try {
    // TODO: 매칭 테이블 구현 후 실제 데이터 조회
    res.json([]);
  } catch (error) {
    console.error('매칭 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 상태 업데이트
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('사용자 상태 업데이트 오류:', error);
      return res.status(500).json({ message: '사용자 상태 업데이트에 실패했습니다.' });
    }
    
    res.json({
      success: true,
      message: '사용자 상태가 업데이트되었습니다.',
      user: data
    });
  } catch (error) {
    console.error('사용자 상태 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 시스템 통계
router.get('/stats', async (req, res) => {
  try {
    // 전체 사용자 수
    const { count: totalUsers, error: totalError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('전체 사용자 수 조회 오류:', totalError);
      return res.status(500).json({ message: '통계 조회에 실패했습니다.' });
    }

    // 활성 사용자 수
    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeError) {
      console.error('활성 사용자 수 조회 오류:', activeError);
      return res.status(500).json({ message: '통계 조회에 실패했습니다.' });
    }

    // 인증된 사용자 수
    const { count: verifiedUsers, error: verifiedError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);

    if (verifiedError) {
      console.error('인증된 사용자 수 조회 오류:', verifiedError);
      return res.status(500).json({ message: '통계 조회에 실패했습니다.' });
    }

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      verifiedUsers: verifiedUsers || 0,
      totalMatches: 0, // TODO: 매칭 테이블 구현 후 실제 데이터 조회
      confirmedMatches: 0,
      pendingMatches: 0,
      cancelledMatches: 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// matching_log 전체 조회
router.get('/matching-log', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matching_log')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('matching_log 조회 오류:', error);
    res.status(500).json({ message: 'matching_log 조회 실패' });
  }
});

// matching_log 생성
router.post('/matching-log', async (req, res) => {
  try {
    const insertData = req.body;
    const { data, error } = await supabase
      .from('matching_log')
      .insert([insertData])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('matching_log 생성 오류:', error);
    res.status(500).json({ message: 'matching_log 생성 실패' });
  }
});

// matching_log 수정
router.put('/matching-log/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase
      .from('matching_log')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('matching_log 수정 오류:', error);
    res.status(500).json({ message: 'matching_log 수정 실패' });
  }
});

// matching_log 삭제 (연관 데이터도 함께 삭제)
router.delete('/matching-log/:id', async (req, res) => {
  const { id } = req.params;
  const periodId = Number(id);
  try {
    // 1. matching_applications 삭제
    const { error: appError } = await supabase
      .from('matching_applications')
      .delete()
      .eq('period_id', periodId);
    if (appError) throw appError;

    // 2. matching_history 삭제
    const { error: histError } = await supabase
      .from('matching_history')
      .delete()
      .eq('period_id', periodId);
    if (histError) throw histError;

    // 3. matching_log 삭제
    const { data, error: logError } = await supabase
      .from('matching_log')
      .delete()
      .eq('id', periodId)
      .select()
      .maybeSingle();
    if (logError) throw logError;

    res.json({ success: true, deleted: data });
  } catch (error) {
    console.error('matching_log 및 연관 데이터 삭제 오류:', error);
    res.status(500).json({ message: 'matching_log 및 연관 데이터 삭제 실패' });
  }
});

// [카테고리 전체 조회]
router.get('/profile-categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('profile_categories 조회 오류:', error);
    res.status(500).json({ message: '카테고리 조회 실패' });
  }
});

// [옵션 전체 조회]
router.get('/profile-options', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_options')
      .select('*')
      .order('category_id', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('profile_options 조회 오류:', error);
    res.status(500).json({ message: '옵션 조회 실패' });
  }
});

// [카테고리 일괄 저장]
router.post('/profile-categories/bulk-save', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ message: 'categories 배열 필요' });
    // 삭제: id가 있는 경우만
    const deleteIds = categories.filter(c => c._delete && c.id != null).map(c => c.id);
    if (deleteIds.length > 0) {
      await supabase.from('profile_categories').delete().in('id', deleteIds);
    }
    // upsert: id가 있는 경우만(신규 생성은 id 없이)
    const upsertCats = categories.filter(c => !c._delete && c.id != null).map(c => {
      const { _new, _delete, __typename, ...rest } = c;
      return rest;
    });
    if (upsertCats.length > 0) {
      const { error } = await supabase.from('profile_categories').upsert(upsertCats, { onConflict: 'id' });
      if (error) throw error;
    }
    // id가 없는 신규 카테고리 insert
    const newCats = categories.filter(c => !c._delete && (c.id == null || c._new)).map(c => {
      const { _new, _delete, __typename, id, ...rest } = c;
      return rest;
    });
    if (newCats.length > 0) {
      const { error } = await supabase.from('profile_categories').insert(newCats);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('카테고리 일괄 저장 오류:', error);
    res.status(500).json({ message: '카테고리 저장 실패', error: error?.message || error });
  }
});

// [옵션 일괄 저장]
router.post('/profile-options/bulk-save', async (req, res) => {
  try {
    const { options } = req.body;
    if (!Array.isArray(options)) return res.status(400).json({ message: 'options 배열 필요' });

    // 필수 필드 유효성 검사
    for (const o of options) {
      if (!o.category_id || !o.option_text || o.option_text.trim() === '') {
        return res.status(400).json({ message: '옵션에 category_id와 option_text가 모두 필요합니다.', option: o });
      }
    }
    // 삭제: id가 있는 경우만
    const deleteIds = options.filter(o => o._delete && o.id != null).map(o => o.id);
    if (deleteIds.length > 0) {
      await supabase.from('profile_options').delete().in('id', deleteIds);
    }
    // upsert: id가 있는 경우만(신규 생성은 id 없이)
    const upsertOpts = options.filter(o => !o._delete && o.id != null).map(o => {
      const { _new, _delete, __typename, ...rest } = o;
      return rest;
    });
    if (upsertOpts.length > 0) {
      const { error } = await supabase.from('profile_options').upsert(upsertOpts, { onConflict: 'id' });
      if (error) throw error;
    }
    // id가 없는 신규 옵션 insert
    const newOpts = options.filter(o => !o._delete && (o.id == null || o._new)).map(o => {
      const { _new, _delete, __typename, id, ...rest } = o;
      return rest;
    });
    if (newOpts.length > 0) {
      const { error } = await supabase.from('profile_options').insert(newOpts);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('옵션 일괄 저장 오류:', error);
    res.status(500).json({ message: '옵션 저장 실패', error: error?.message || error });
  }
});

// [매칭 신청 현황 조회]
router.get('/matching-applications', async (req, res) => {
  try {
    const { periodId } = req.query;
    let query = supabase
      .from('matching_applications')
      .select(`
        *,
        user:users!inner(id,email),
        profile:user_profiles!user_id(*)
      `)
      .order('applied_at', { ascending: false });
    if (periodId && periodId !== 'all') {
      query = query.eq('period_id', periodId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[matching_applications] Supabase 쿼리 에러:', error);
      throw error;
    }
    if (!data) return res.json([]); // 데이터 없으면 빈 배열 반환

    const userMap = {};
    data.forEach(row => {
      if (row.user && row.user.id) userMap[row.user.id] = row.user;
    });

    for (const row of data) {
      if (row.partner_user_id && userMap[row.partner_user_id]) {
        row.partner = userMap[row.partner_user_id];
      } else if (row.partner_user_id) {
        try {
          const { data: partnerUser, error: partnerError } = await supabase
            .from('users')
            .select('id,email')
            .eq('id', row.partner_user_id)
            .single();
          if (partnerError || !partnerUser) {
            row.partner = null;
          } else {
            row.partner = partnerUser;
          }
        } catch (e) {
          row.partner = null;
        }
      }
    }
    res.json(data);
  } catch (error) {
    console.error('matching_applications 현황 조회 오류:', error);
    res.status(500).json({ message: '매칭 신청 현황 조회 실패', error: error?.message || error });
  }
});

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

  let subject, htmlContent;
  
  if (isMatched && partnerInfo) {
    // 매칭 성공
    subject = '[울산 사내 솔로공모] 매칭 결과 발표 - 성공';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">🎉 매칭 성공!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">울산 사내 솔로공모 매칭 결과가 발표되었습니다</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
          <h2 style="color: #2d3748; margin-top: 0;">축하합니다! 매칭이 성공했습니다.</h2>
          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
            매칭 알고리즘을 통해 상대방과 매칭이 성공적으로 이루어졌습니다. 
            이제 서비스 내에서 상대방과의 채팅을 통해 만남을 준비하실 수 있습니다.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin-top: 0;">💬 채팅방 개설 안내</h3>
            <p style="color: #4a5568; margin-bottom: 15px;">
              상대방과의 채팅방이 자동으로 개설되었습니다. 
              서비스에 로그인하여 채팅을 통해 만남을 준비해주세요.
            </p>
            <div style="background: #e6fffa; padding: 15px; border-radius: 8px; border: 1px solid #81e6d9;">
              <p style="margin: 0; color: #2c7a7b; font-weight: 600;">
                📱 <strong>다음 단계:</strong> 서비스 로그인 → 채팅 메뉴 → 상대방과 대화 시작
              </p>
            </div>
          </div>
        </div>
        
        <div style="background: #fff5f5; padding: 20px; border-radius: 10px; border: 1px solid #fed7d7; margin-bottom: 25px;">
          <h3 style="color: #c53030; margin-top: 0;">⚠️ 개인정보 보호 안내</h3>
          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 10px;">
            <strong>대면 만남 이전에는 다음 사항을 주의해주세요:</strong>
          </p>
          <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>소속 조직(부서, 팀) 정보를 공개하지 마세요</li>
            <li>실명을 직접적으로 공개하지 마세요</li>
            <li>개인 연락처(전화번호, 카카오톡 ID 등)를 공개하지 마세요</li>
            <li>회사 내 위치나 근무 시간 등 상세 정보를 공개하지 마세요</li>
          </ul>
          <p style="color: #4a5568; line-height: 1.6; margin: 10px 0 0 0; font-size: 14px;">
            안전하고 신뢰할 수 있는 만남을 위해 서비스 내 채팅 기능을 활용해주세요.
          </p>
        </div>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; text-align: center;">
          <p style="color: #718096; margin: 0; font-size: 14px;">
            <strong>발표 시각:</strong> ${koreanTime} (한국 시간)
          </p>
          <p style="color: #718096; margin: 10px 0 0 0; font-size: 14px;">
            문의사항이 있으시면 관리자에게 연락해주세요.
          </p>
        </div>
      </div>
    `;
  } else {
    // 매칭 실패
    subject = '[울산 사내 솔로공모] 매칭 결과 발표';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">📋 매칭 결과 발표</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">울산 사내 솔로공모 매칭 결과가 발표되었습니다</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
          <h2 style="color: #2d3748; margin-top: 0;">매칭 결과 안내</h2>
          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
            안타깝게도 이번 회차에서는 적절한 매칭 상대를 찾지 못했습니다. 
            이는 여러 요인(선호도, 신청 인원, 매칭 조건 등)에 의해 발생할 수 있습니다.
          </p>
          
          <div style="background: #e6fffa; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin-top: 0;">💡 다음 기회를 위해</h3>
            <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>다음 회차 매칭에 다시 신청해보세요</li>
              <li>프로필 정보를 더 상세히 작성해보세요</li>
              <li>선호도 설정을 조정해보세요</li>
              <li>매칭 신청 기간을 놓치지 마세요</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; text-align: center;">
          <p style="color: #718096; margin: 0; font-size: 14px;">
            <strong>발표 시각:</strong> ${koreanTime} (한국 시간)
          </p>
          <p style="color: #718096; margin: 10px 0 0 0; font-size: 14px;">
            다음 회차 매칭을 기대해주세요. 문의사항이 있으시면 관리자에게 연락해주세요.
          </p>
        </div>
      </div>
    `;
  }

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

// [매칭 결과(커플) 리스트 조회]
router.get('/matching-history', async (req, res) => {
  try {
    const { periodId, nickname } = req.query;
    // 1. matching_history에서 회차별로 조회
    let query = supabase
      .from('matching_history')
      .select(`
        *,
        male:user_profiles!male_user_id(*, user:users!user_id(id, email)),
        female:user_profiles!female_user_id(*, user:users!user_id(id, email))
      `)
      .order('period_id', { ascending: false });
    if (periodId && periodId !== 'all') {
      query = query.eq('period_id', periodId);
    }
    const { data, error } = await query;
    if (error) throw error;
    let result = data || [];
    // 2. 닉네임 필터링(남/여 중 하나라도 해당 닉네임 포함)
    if (nickname && nickname.trim() !== '') {
      result = result.filter(row =>
        (row.male && row.male.nickname && row.male.nickname.includes(nickname)) ||
        (row.female && row.female.nickname && row.female.nickname.includes(nickname))
      );
    }
    res.json(result);
  } catch (error) {
    console.error('matching_history 조회 오류:', error);
    res.status(500).json({ message: '매칭 결과 조회 실패', error: error?.message || error });
  }
});

// [매칭 결과 발표 이메일 발송]
router.post('/send-matching-result-emails', async (req, res) => {
  try {
    const { periodId } = req.body;
    
    if (!periodId) {
      return res.status(400).json({ message: 'periodId가 필요합니다.' });
    }

    console.log(`📧 매칭 결과 이메일 발송 시작 - 회차: ${periodId}`);

    // 해당 회차의 매칭 신청자들 조회
    const { data: applications, error: appError } = await supabase
      .from('matching_applications')
      .select(`
        user_id,
        matched,
        partner_user_id,
        user:users!inner(email)
      `)
      .eq('period_id', periodId)
      .eq('applied', true)
      .eq('cancelled', false);

    if (appError) {
      console.error('매칭 신청자 조회 오류:', appError);
      return res.status(500).json({ message: '매칭 신청자 조회에 실패했습니다.' });
    }

    if (!applications || applications.length === 0) {
      return res.status(404).json({ message: '해당 회차의 매칭 신청자가 없습니다.' });
    }

    let emailSuccessCount = 0;
    let emailFailCount = 0;
    const emailResults = [];

    // 각 신청자에게 이메일 발송
    for (const app of applications) {
      try {
        const isMatched = app.matched === true;
        const partnerInfo = isMatched && app.partner_user_id ? { partnerId: app.partner_user_id } : null;
        
        const emailSent = await sendMatchingResultEmail(app.user.email, isMatched, partnerInfo);
        
        if (emailSent) {
          emailSuccessCount++;
          emailResults.push({
            userId: app.user_id,
            email: app.user.email,
            matched: isMatched,
            status: 'success'
          });
        } else {
          emailFailCount++;
          emailResults.push({
            userId: app.user_id,
            email: app.user.email,
            matched: isMatched,
            status: 'failed'
          });
        }
      } catch (error) {
        console.error(`이메일 발송 오류 - 사용자: ${app.user_id}`, error);
        emailFailCount++;
        emailResults.push({
          userId: app.user_id,
          email: app.user.email,
          matched: app.matched === true,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`📧 매칭 결과 이메일 발송 완료 - 성공: ${emailSuccessCount}건, 실패: ${emailFailCount}건`);

    res.json({
      success: true,
      message: `매칭 결과 이메일 발송 완료 (성공: ${emailSuccessCount}건, 실패: ${emailFailCount}건)`,
      totalSent: applications.length,
      successCount: emailSuccessCount,
      failCount: emailFailCount,
      results: emailResults
    });

  } catch (error) {
    console.error('매칭 결과 이메일 발송 오류:', error);
    res.status(500).json({ message: '매칭 결과 이메일 발송에 실패했습니다.', error: error.message });
  }
});

module.exports = router; 