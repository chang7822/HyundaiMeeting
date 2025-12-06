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
        period:matching_log(id, application_start, application_end, finish, matching_announce, status)
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

    // 🔒 매칭 결과 공지(matching_announce) 이전 회차는 이력에서 제외
    const now = new Date();
    const visibleData = (data || []).filter(match => {
      const period = match.period;
      if (!period) return false;

      // 1순위: status 기준 (스케줄러에서 발표완료/종료로 관리)
      if (period.status === '발표완료' || period.status === '종료') {
        return true;
      }

      // 2순위: matching_announce 시간이 현재 시각을 지났는지 확인
      if (period.matching_announce) {
        try {
          const announceTime = new Date(period.matching_announce);
          if (!isNaN(announceTime.getTime()) && announceTime <= now) {
            return true;
          }
        } catch (e) {
          console.error('matching_announce 파싱 오류:', e);
        }
      }

      // 그 외(발표 전/시간 정보 없음)는 노출하지 않음
      return false;
    });

    // 각 매칭에 대한 신고 정보 조회
    const processedData = await Promise.all(visibleData.map(async (match) => {
      const isMale = match.male_user_id === user_id;
      const partnerUserId = isMale ? match.female_user_id : match.male_user_id;
      const partnerNickname = isMale ? match.female_nickname : match.male_nickname;
      const partnerEmail = isMale ? match.female_user_email : match.male_user_email;
      
      // 탈퇴한 사용자의 경우 원래 ID를 추적하기 위해 매칭 기록에서 확인
      // (reports 테이블에는 원래 user_id가 남아있음)
      
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
      
      // 해당 매칭에 대한 신고 내역 조회 (탈퇴한 사용자 포함)
      let reportInfo = null;
      if (match.matched === true) {
        // 먼저 정확한 reported_user_id로 조회 시도 (상대방이 탈퇴하지 않은 경우)
        if (partnerUserId) {
          const { data: reportData } = await supabase
            .from('reports')
            .select('id, report_type, report_details, status, created_at')
            .eq('reporter_id', user_id)
            .eq('reported_user_id', partnerUserId)
            .eq('period_id', match.period_id)
            .single();
          
          reportInfo = reportData;
        }
        
        // 위에서 찾지 못한 경우, 이메일 기반으로 조회 (탈퇴 후 재가입한 경우 포함)
        if (!reportInfo && partnerEmail) {
          const { data: reportData } = await supabase
            .from('reports')
            .select('id, report_type, report_details, status, created_at')
            .eq('reporter_id', user_id)
            .eq('reported_user_email', partnerEmail)
            .eq('period_id', match.period_id)
            .single();
          
          reportInfo = reportData;
        }
        
        // 마지막으로, 같은 period_id에서 내가 신고한 기록 중 reported_user_id가 null인 것 조회
        if (!reportInfo) {
          const { data: reportData } = await supabase
            .from('reports')
            .select('id, report_type, report_details, status, created_at')
            .eq('reporter_id', user_id)
            .eq('period_id', match.period_id)
            .is('reported_user_id', null)
            .single();
          
          reportInfo = reportData;
        }
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
        period:matching_log(id, application_start, application_end, finish, matching_announce, status)
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

    // 🔒 매칭 결과 공지 이전에는 상세 조회도 불가
    const period = data.period;
    const now = new Date();
    let canView = false;

    if (period) {
      if (period.status === '발표완료' || period.status === '종료') {
        canView = true;
      } else if (period.matching_announce) {
        try {
          const announceTime = new Date(period.matching_announce);
          if (!isNaN(announceTime.getTime()) && announceTime <= now) {
            canView = true;
          }
        } catch (e) {
          console.error('matching_announce 파싱 오류(상세):', e);
        }
      }
    }

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: '매칭 결과 발표 전에는 매칭 이력을 조회할 수 없습니다.'
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