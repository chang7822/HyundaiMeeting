const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { sendMatchingResultEmail } = require('../utils/emailService');
const authenticate = require('../middleware/authenticate');

// 임시 데이터 (다른 라우트와 공유)
const users = [];
const matches = [];

// 모든 사용자 조회 (계정 정보 + 프로필 정보)
router.get('/users', authenticate, async (req, res) => {
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
router.get('/matches', authenticate, (req, res) => {
  try {
    // TODO: 매칭 테이블 구현 후 실제 데이터 조회
    res.json([]);
  } catch (error) {
    console.error('매칭 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 상태 업데이트
router.put('/users/:userId/status', authenticate, async (req, res) => {
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
router.get('/stats', authenticate, async (req, res) => {
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
router.get('/matching-log', authenticate, async (req, res) => {
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
router.post('/matching-log', authenticate, async (req, res) => {
  try {
    const insertData = req.body;
    
    // 1. 새로운 회차 생성 (email_sent 초기값 설정)
    const insertDataWithDefaults = {
      ...insertData,
      email_sent: false
    };
    
    const { data, error } = await supabase
      .from('matching_log')
      .insert([insertDataWithDefaults])
      .select()
      .single();
    if (error) throw error;
    
    // 2. [추가] users 테이블 매칭 상태 초기화
    console.log(`[관리자] 새로운 회차 ${data.id} 생성, users 테이블 매칭 상태 초기화`);
    
    // 더 강력한 초기화: 모든 사용자의 매칭 상태를 완전히 리셋
    const { data: resetResult, error: resetError } = await supabase
      .from('users')
      .update({ 
        is_applied: false, 
        is_matched: null 
      })
      .not('id', 'is', null)
      .select('id, email, is_applied, is_matched');
    
    if (resetError) {
      console.error(`[관리자] users 테이블 초기화 오류:`, resetError);
      // 초기화 실패해도 회차 생성은 성공으로 처리
    } else {
      console.log(`[관리자] users 테이블 매칭 상태 초기화 완료 - ${resetResult?.length || 0}명의 사용자 상태 리셋`);
      console.log(`[관리자] 초기화된 사용자 샘플:`, resetResult?.slice(0, 3));
    }
    
    res.json({
      ...data,
      message: '새로운 회차가 생성되었고, 모든 사용자의 매칭 상태가 초기화되었습니다.'
    });
  } catch (error) {
    console.error('matching_log 생성 오류:', error);
    res.status(500).json({ message: 'matching_log 생성 실패' });
  }
});

// matching_log 수정
router.put('/matching-log/:id', authenticate, async (req, res) => {
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
router.delete('/matching-log/:id', authenticate, async (req, res) => {
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

    // 3. reports 삭제 (해당 회차의 신고들)
    const { error: reportError } = await supabase
      .from('reports')
      .delete()
      .eq('period_id', periodId);
    if (reportError) throw reportError;

    // 4. chat_messages 삭제 (해당 회차의 채팅 기록)
    const { error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('period_id', periodId);
    if (chatError) {
      console.error(`채팅 기록 삭제 오류:`, chatError);
    }

    // 5. matching_log 삭제
    const { data, error: logError } = await supabase
      .from('matching_log')
      .delete()
      .eq('id', periodId)
      .select()
      .maybeSingle();
    if (logError) throw logError;

    // 6. [추가] users 테이블 매칭 상태 초기화
    console.log(`[관리자] users 테이블 매칭 상태 초기화 시작`);
    const { error: resetError } = await supabase
      .from('users')
      .update({ is_applied: false, is_matched: null })
      .not('id', 'is', null);
    if (resetError) {
      console.error(`[관리자] users 테이블 초기화 오류:`, resetError);
      // 초기화 실패해도 삭제는 성공으로 처리
    } else {
      console.log(`[관리자] users 테이블 매칭 상태 초기화 완료`);
    }

    res.json({ 
      success: true, 
      deleted: data,
      message: '회차 및 관련 데이터(매칭 신청, 이력, 신고, 채팅 기록)가 삭제되었고, 모든 사용자의 매칭 상태가 초기화되었습니다.'
    });
  } catch (error) {
    console.error('matching_log 및 연관 데이터 삭제 오류:', error);
    res.status(500).json({ message: 'matching_log 및 연관 데이터 삭제 실패' });
  }
});

// [카테고리 전체 조회]
router.get('/profile-categories', authenticate, async (req, res) => {
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
router.get('/profile-options', authenticate, async (req, res) => {
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
router.post('/profile-categories/bulk-save', authenticate, async (req, res) => {
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
router.post('/profile-options/bulk-save', authenticate, async (req, res) => {
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
router.get('/matching-applications', authenticate, async (req, res) => {
  try {
    const { periodId } = req.query;
    let query = supabase
      .from('matching_applications')
      .select(`
        *,
        user:users(id,email),
        profile:user_profiles(*)
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



// [매칭 결과(커플) 리스트 조회]
router.get('/matching-history', authenticate, async (req, res) => {
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
router.post('/send-matching-result-emails', authenticate, async (req, res) => {
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

// [수동] users 테이블 매칭 상태 초기화 (관리자용)
router.post('/reset-users-matching-status', authenticate, async (req, res) => {
  try {
    console.log('[관리자] users 테이블 매칭 상태 수동 초기화 시작');
    
    const { data, error } = await supabase
      .from('users')
      .update({ is_applied: false, is_matched: null })
      .not('id', 'is', null);
    
    if (error) {
      console.error('[관리자] users 테이블 초기화 오류:', error);
      return res.status(500).json({ message: '초기화에 실패했습니다.', error: error.message });
    }
    
    console.log('[관리자] users 테이블 매칭 상태 수동 초기화 완료');
    res.json({ 
      success: true, 
      message: '모든 사용자의 매칭 상태가 초기화되었습니다.' 
    });
  } catch (error) {
    console.error('[관리자] users 테이블 초기화 오류:', error);
    res.status(500).json({ message: '초기화에 실패했습니다.', error: error.message });
  }
});

// [신고 관리] 모든 신고 목록 조회
router.get('/reports', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reports')
      .select(`
        *,
        reporter:users!reporter_id(id, email),
        reported_user:users!reported_user_id(id, email),
        period:matching_log(id, application_start, application_end),
        resolver:users!resolved_by(email)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('신고 목록 조회 오류:', error);
      return res.status(500).json({ message: '신고 목록 조회에 실패했습니다.' });
    }

    // 각 신고에 대해 닉네임 정보 추가
    const reportsWithNicknames = await Promise.all(
      data.map(async (report) => {
        // 신고자 닉네임 조회
        let reporterNickname = null;
        if (report.reporter) {
          const { data: reporterProfile } = await supabase
            .from('user_profiles')
            .select('nickname')
            .eq('user_id', report.reporter.id)
            .single();
          reporterNickname = reporterProfile?.nickname;
        }

        // 신고받은 사용자 닉네임 조회
        let reportedUserNickname = null;
        if (report.reported_user) {
          const { data: reportedUserProfile } = await supabase
            .from('user_profiles')
            .select('nickname')
            .eq('user_id', report.reported_user.id)
            .single();
          reportedUserNickname = reportedUserProfile?.nickname;
        }

        return {
          ...report,
          reporter: report.reporter ? {
            ...report.reporter,
            nickname: reporterNickname
          } : null,
          reported_user: report.reported_user ? {
            ...report.reported_user,
            nickname: reportedUserNickname
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: reportsWithNicknames,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0
      }
    });

  } catch (error) {
    console.error('신고 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 신고 상세 조회
router.get('/reports/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:users!reporter_id(id, email),
        reported_user:users!reported_user_id(id, email),
        period:matching_log(id, application_start, application_end, finish),
        resolver:users!resolved_by(email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('신고 상세 조회 오류:', error);
      return res.status(500).json({ message: '신고 상세 조회에 실패했습니다.' });
    }

    if (!data) {
      return res.status(404).json({ message: '신고 내역을 찾을 수 없습니다.' });
    }

    // 닉네임 정보 추가
    let reporterNickname = null;
    let reportedUserNickname = null;
    let reporterGender = null;
    let reportedUserGender = null;

    if (data.reporter) {
      const { data: reporterProfile } = await supabase
        .from('user_profiles')
        .select('nickname, gender')
        .eq('user_id', data.reporter.id)
        .single();
      reporterNickname = reporterProfile?.nickname;
      reporterGender = reporterProfile?.gender;
    }

    if (data.reported_user) {
      const { data: reportedUserProfile } = await supabase
        .from('user_profiles')
        .select('nickname, gender')
        .eq('user_id', data.reported_user.id)
        .single();
      reportedUserNickname = reportedUserProfile?.nickname;
      reportedUserGender = reportedUserProfile?.gender;
    }

    const reportWithNicknames = {
      ...data,
      reporter: data.reporter ? {
        ...data.reporter,
        nickname: reporterNickname,
        gender: reporterGender
      } : null,
      reported_user: data.reported_user ? {
        ...data.reported_user,
        nickname: reportedUserNickname,
        gender: reportedUserGender
      } : null
    };

    res.json({
      success: true,
      data: reportWithNicknames
    });

  } catch (error) {
    console.error('신고 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 신고 처리 (신고 횟수 기반 정지 시스템)
router.put('/reports/:id/process', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, ban_duration_days } = req.body;

    // 신고 상태 업데이트
    const updateData = {
      status,
      admin_notes,
      resolved_at: new Date().toISOString(),
      resolved_by: req.user?.userId || req.user?.id || null
    };

    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (reportError) {
      console.error('신고 처리 오류:', reportError);
      return res.status(500).json({ message: '신고 처리에 실패했습니다.' });
    }

    // 사용자 정지 상태 업데이트
    let banUpdateData = {};
    
    if (status === 'temporary_ban' || status === 'permanent_ban') {
      // 정지 처리
      banUpdateData = {
        is_banned: true,
        banned_until: status === 'permanent_ban' ? null : 
          new Date(Date.now() + (ban_duration_days || 30) * 24 * 60 * 60 * 1000).toISOString()
      };
    } else if (status === 'rejected' || status === 'dismissed' || status === 'no_action') {
      // 정지 해제 (기각, 기각, 조치없음)
      banUpdateData = {
        is_banned: false,
        banned_until: null
      };
    }

    // 사용자 상태 업데이트가 필요한 경우
    if (Object.keys(banUpdateData).length > 0) {
      const { error: banError } = await supabase
        .from('users')
        .update(banUpdateData)
        .eq('id', reportData.reported_user_id);

      if (banError) {
        console.error('사용자 정지 상태 업데이트 오류:', banError);
        return res.status(500).json({ message: '사용자 상태 업데이트에 실패했습니다.' });
      }
    }

    res.json({
      success: true,
      message: '신고가 성공적으로 처리되었습니다.',
      data: reportData
    });

  } catch (error) {
    console.error('신고 처리 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 사용자별 신고 정보 조회
router.get('/users/:userId/report-info', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, email, report_count, is_banned, banned_until')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('사용자 신고 정보 조회 오류:', error);
      return res.status(500).json({ message: '사용자 신고 정보 조회에 실패했습니다.' });
    }

    if (!data) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('사용자 신고 정보 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [신고 관리] 사용자 신고 정보 수동 조정
router.put('/users/:userId/report-info', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { report_count, is_banned, banned_until, reason } = req.body;

    const updateData = {};
    if (report_count !== undefined) updateData.report_count = report_count;
    if (is_banned !== undefined) updateData.is_banned = is_banned;
    if (banned_until !== undefined) updateData.banned_until = banned_until;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('사용자 신고 정보 조정 오류:', error);
      return res.status(500).json({ message: '신고 정보 조정에 실패했습니다.' });
    }

    res.json({
      success: true,
      message: '신고 정보가 성공적으로 조정되었습니다.',
      data
    });

  } catch (error) {
    console.error('사용자 신고 정보 조정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 