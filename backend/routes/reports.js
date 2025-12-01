const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');
const { sendAdminNotificationEmail } = require('../utils/emailService');

// 신고 등록
router.post('/', authenticate, async (req, res) => {
  try {
    const { reported_user_id, reported_user_email, period_id, report_type, report_details } = req.body;
    const reporter_id = req.user.userId;

    // console.log('[신고 등록] 요청 데이터:', {
    //   reported_user_id,
    //   period_id,
    //   period_id_type: typeof period_id,
    //   report_type,
    //   report_details,
    //   reporter_id
    // });

    // 필수 필드 검증 (reported_user_id 또는 reported_user_email 중 하나는 있어야 함)
    if ((!reported_user_id && !reported_user_email) || !report_type || !period_id || period_id <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 정보가 누락되었습니다.' 
      });
    }

    // 자기 자신을 신고하는지 확인
    if (reporter_id === reported_user_id) {
      return res.status(400).json({ 
        success: false, 
        message: '자기 자신을 신고할 수 없습니다.' 
      });
    }

    // 이미 신고한 적이 있는지 확인 (ID와 이메일 모두 확인)
    let existingReport = null;
    let checkError = null;
    
    if (reported_user_id) {
      // ID 기반 확인 (활성 사용자)
      const result = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', reporter_id)
        .eq('reported_user_id', reported_user_id)
        .eq('period_id', period_id)
        .maybeSingle();
      existingReport = result.data;
      checkError = result.error;
      
      // ID로 찾지 못했고 이메일이 있다면 이메일로도 확인 (재가입 사용자 대비)
      if (!existingReport && !checkError && reported_user_email) {
        const emailResult = await supabase
          .from('reports')
          .select('id')
          .eq('reporter_id', reporter_id)
          .eq('reported_user_email', reported_user_email)
          .eq('period_id', period_id)
          .maybeSingle();
        existingReport = emailResult.data;
        checkError = emailResult.error;
      }
    } else if (reported_user_email) {
      // 이메일 기반 확인 (탈퇴한 사용자)
      const result = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', reporter_id)
        .eq('reported_user_email', reported_user_email)
        .eq('period_id', period_id)
        .maybeSingle();
      existingReport = result.data;
      checkError = result.error;
    }

    if (checkError) {
      console.error('기존 신고 확인 오류:', checkError);
      return res.status(500).json({ 
        success: false, 
        message: '서버 오류가 발생했습니다.' 
      });
    }

    if (existingReport) {
      // console.log('[신고 등록] 이미 신고한 사용자:', { reporter_id, reported_user_id, period_id });
      return res.status(400).json({ 
        success: false, 
        message: '이미 신고한 사용자입니다.' 
      });
    }

    // 신고자 이메일 조회
    const { data: reporterUser, error: reporterError } = await supabase
      .from('users')
      .select('email')
      .eq('id', reporter_id)
      .single();

    if (reporterError) {
      console.error('신고자 이메일 조회 오류:', reporterError);
      return res.status(500).json({ 
        success: false, 
        message: '신고자 정보를 찾을 수 없습니다.' 
      });
    }

    // 신고받은 사용자의 이메일 조회 (활성 사용자인 경우만)
    let reportedUserEmail = reported_user_email; // 이미 제공된 이메일 사용
    
    if (reported_user_id && !reported_user_email) {
      // ID는 있지만 이메일이 없는 경우 (활성 사용자)
      const { data: reportedUser, error: reportedError } = await supabase
        .from('users')
        .select('email')
        .eq('id', reported_user_id)
        .single();

      if (reportedError) {
        console.error('신고받은 사용자 이메일 조회 오류:', reportedError);
        return res.status(500).json({ 
          success: false, 
          message: '신고받은 사용자 정보를 찾을 수 없습니다.' 
        });
      }
      
      reportedUserEmail = reportedUser.email;
    }

    // 신고 등록 (이메일 정보 포함)
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id,
        reported_user_id: reported_user_id || null, // 탈퇴한 사용자인 경우 null
        period_id,
        report_type,
        report_details,
        status: 'pending',
        reporter_email: reporterUser.email,
        reported_user_email: reportedUserEmail
      })
      .select()
      .single();

    if (error) {
      console.error('신고 등록 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '신고 등록에 실패했습니다.' 
      });
    }

    // 신고받은 사용자의 report_count 증가
    const { data: userData, error: getUserError } = await supabase
      .from('users')
      .select('report_count')
      .eq('id', reported_user_id)
      .single();

    if (getUserError) {
      console.error('사용자 정보 조회 오류:', getUserError);
    } else {
      const currentCount = userData.report_count || 0;
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          report_count: currentCount + 1
        })
        .eq('id', reported_user_id);

      if (updateError) {
        console.error('신고 횟수 업데이트 오류:', updateError);
        // 신고 등록은 성공했지만 횟수 업데이트 실패는 로그만 남김
      }
    }

    // 관리자 알림 메일 발송 (비동기, 실패해도 신고 등록은 유지)
    try {
      const adminSubject = '신규 신고 접수';
      const adminBodyLines = [
        '새로운 신고가 접수되었습니다.',
        '',
        `신고 ID: ${data.id}`,
        `회차 ID: ${data.period_id}`,
        `신고 유형: ${data.report_type}`,
        `신고자 이메일: ${reporterUser.email}`,
        `신고 대상자 이메일: ${reportedUserEmail || '알 수 없음'}`,
        '',
        '신고 내용:',
        report_details || '(내용 없음)',
      ];
      sendAdminNotificationEmail(adminSubject, adminBodyLines.join('\n')).catch(err => {
        console.error('[신고 등록] 관리자 알림 메일 발송 실패:', err);
      });
    } catch (e) {
      console.error('[신고 등록] 관리자 알림 메일 처리 중 오류:', e);
    }

    res.json({
      success: true,
      message: '신고가 성공적으로 등록되었습니다.',
      data: data
    });

  } catch (error) {
    console.error('신고 등록 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내가 신고한 목록 조회
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const reporter_id = req.user.userId;

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        period:matching_log(id, application_start, application_end)
      `)
      .eq('reporter_id', reporter_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('신고 목록 조회 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '신고 목록 조회에 실패했습니다.' 
      });
    }

    // 탈퇴한 사용자 처리를 위해 reported_user_email 사용
    const processedData = data.map(report => ({
      ...report,
      reported_user_nickname: report.reported_user_email || '탈퇴한 사용자'
    }));

    res.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('신고 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 신고 상세 조회
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.userId;

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:user_profiles!reporter_id(nickname),
        reported_user:user_profiles!reported_user_id(nickname),
        period:matching_log(id, application_start, application_end)
      `)
      .eq('id', id)
      .eq('reporter_id', user_id)
      .single();

    if (error) {
      console.error('신고 상세 조회 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '신고 상세 조회에 실패했습니다.' 
      });
    }

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: '신고 내역을 찾을 수 없습니다.' 
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('신고 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 