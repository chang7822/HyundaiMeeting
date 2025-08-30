const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

// 내 매칭 이력 조회
router.get('/my-history', authenticate, async (req, res) => {
  try {
    const user_id = req.user.userId;

    // 먼저 모든 매칭 로그를 가져와서 순차적 회차 번호 매핑 생성
    const { data: allLogs, error: logsError } = await supabase
      .from('matching_log')
      .select('id')
      .order('application_start', { ascending: true });

    if (logsError) {
      console.error('매칭 로그 조회 오류:', logsError);
      return res.status(500).json({ 
        success: false, 
        message: '매칭 로그 조회에 실패했습니다.' 
      });
    }

    // period_id를 순차적 회차 번호로 매핑
    const periodToRoundMap = {};
    allLogs.forEach((log, index) => {
      periodToRoundMap[log.id] = index + 1;
    });

    // 사용자의 매칭 이력 조회 (남성/여성 모두 포함)
    // LEFT JOIN을 사용하여 탈퇴한 사용자도 처리 가능하도록 수정
    const { data, error } = await supabase
      .from('matching_history')
      .select(`
        *,
        period:matching_log(id, application_start, application_end, finish)
      `)
      .or(`male_user_id.eq.${user_id},female_user_id.eq.${user_id}`)
      .order('matched_at', { ascending: false });

    if (error) {
      console.error('매칭 이력 조회 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '매칭 이력 조회에 실패했습니다.' 
      });
    }

    // 각 매칭에 대한 신고 정보 조회
    const processedData = await Promise.all(data.map(async (match) => {
      const isMale = match.male_user_id === user_id;
      const partnerUserId = isMale ? match.female_user_id : match.male_user_id;
      const partnerNickname = isMale ? match.female_nickname : match.male_nickname;
      
      // 상대방이 탈퇴하지 않은 경우에만 프로필 정보 조회
      let partnerProfile = null;
      if (partnerUserId) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('nickname, gender')
          .eq('user_id', partnerUserId)
          .single();
        partnerProfile = profileData;
      }
      
      // 해당 매칭에 대한 신고 내역 조회 (상대방이 탈퇴하지 않은 경우만)
      let reportInfo = null;
      if (match.matched === true && partnerUserId) {
        const { data: reportData } = await supabase
          .from('reports')
          .select('id, report_type, report_details, status, created_at')
          .eq('reporter_id', user_id)
          .eq('reported_user_id', partnerUserId)
          .eq('period_id', match.period_id)
          .single();
        
        reportInfo = reportData;
      }
      
      return {
        id: match.id,
        period_id: match.period_id,
        round_number: periodToRoundMap[match.period_id] || match.period_id, // 순차적 회차 번호 사용
        matched_at: match.matched_at,
        matched: match.matched,
        partner_user_id: partnerUserId,
        // 스냅샷 정보 우선 사용 (탈퇴해도 정보 보존)
        partner_nickname: partnerProfile?.nickname || partnerNickname || '탈퇴한 사용자',
        partner_gender: partnerProfile?.gender || (isMale ? match.female_gender : match.male_gender) || null,
        partner_email: isMale ? match.female_user_email : match.male_user_email, // 탈퇴한 사용자 신고를 위한 이메일 정보
        period_info: match.period,
        // 신고 가능 여부 (매칭 성공하고 아직 신고하지 않은 경우, 탈퇴한 사용자도 이메일 기반으로 신고 가능)
        can_report: match.matched === true && !reportInfo,
        // 신고 정보
        report_info: reportInfo
      };
    }));

    res.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('매칭 이력 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 매칭 이력 상세 조회
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.userId;

    const { data, error } = await supabase
      .from('matching_history')
      .select(`
        *,
        period:matching_log(id, application_start, application_end, finish)
      `)
      .eq('id', id)
      .or(`male_user_id.eq.${user_id},female_user_id.eq.${user_id}`)
      .single();

    if (error) {
      console.error('매칭 이력 상세 조회 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '매칭 이력 상세 조회에 실패했습니다.' 
      });
    }

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: '매칭 이력을 찾을 수 없습니다.' 
      });
    }

    // 응답 데이터 가공
    const isMale = data.male_user_id === user_id;
    const partnerUserId = isMale ? data.female_user_id : data.male_user_id;
    const partnerNickname = isMale ? data.female_nickname : data.male_nickname;

    // 상대방이 탈퇴하지 않은 경우에만 프로필 정보 조회
    let partnerProfile = null;
    if (partnerUserId) {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('nickname, gender, birth_year, height, job_type')
        .eq('user_id', partnerUserId)
        .single();
      partnerProfile = profileData;
    }

    const processedData = {
      id: data.id,
      period_id: data.period_id,
      matched_at: data.matched_at,
      matched: data.matched,
      partner_user_id: partnerUserId,
      partner_nickname: partnerProfile?.nickname || partnerNickname || '탈퇴한 사용자',
      partner_gender: partnerProfile?.gender || null,
      partner_birth_year: partnerProfile?.birth_year || null,
      partner_height: partnerProfile?.height || null,
      partner_job_type: partnerProfile?.job_type || null,
      period_info: data.period,
      can_report: data.matched === true // 탈퇴한 사용자도 이메일 기반으로 신고 가능
    };

    res.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('매칭 이력 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 