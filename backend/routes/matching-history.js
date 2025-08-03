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
    const { data, error } = await supabase
      .from('matching_history')
      .select(`
        *,
        period:matching_log(id, application_start, application_end, finish),
        male_profile:user_profiles!male_user_id(nickname, gender),
        female_profile:user_profiles!female_user_id(nickname, gender)
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

    // 응답 데이터 가공
    const processedData = data.map(match => {
      const isMale = match.male_user_id === user_id;
      const partnerUserId = isMale ? match.female_user_id : match.male_user_id;
      const partnerNickname = isMale ? match.female_nickname : match.male_nickname;
      const partnerProfile = isMale ? match.female_profile : match.male_profile;
      
      return {
        id: match.id,
        period_id: match.period_id,
        round_number: periodToRoundMap[match.period_id] || match.period_id, // 순차적 회차 번호 사용
        matched_at: match.matched_at,
        matched: match.matched,
        partner_user_id: partnerUserId,
        partner_nickname: partnerNickname || partnerProfile?.nickname,
        partner_gender: partnerProfile?.gender,
        period_info: match.period,
        // 신고 가능 여부 (매칭 성공한 경우만)
        can_report: match.matched === true
      };
    });

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
        period:matching_log(id, application_start, application_end, finish),
        male_profile:user_profiles!male_user_id(nickname, gender, birth_year, height, job_type),
        female_profile:user_profiles!female_user_id(nickname, gender, birth_year, height, job_type)
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
    const partnerProfile = isMale ? data.female_profile : data.male_profile;

    const processedData = {
      id: data.id,
      period_id: data.period_id,
      matched_at: data.matched_at,
      matched: data.matched,
      partner_user_id: partnerUserId,
      partner_nickname: partnerNickname || partnerProfile?.nickname,
      partner_gender: partnerProfile?.gender,
      partner_birth_year: partnerProfile?.birth_year,
      partner_height: partnerProfile?.height,
      partner_job_type: partnerProfile?.job_type,
      period_info: data.period,
      can_report: data.matched === true
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