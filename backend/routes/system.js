const express = require('express');
const router = express.Router();
const { supabase } = require('../database');

// 공개 시스템 상태 조회 (로그인 전/후 모두 사용)
router.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle();

    if (error) {
      console.error('[system][status] 조회 오류:', error);
      return res.status(500).json({ success: false, message: '시스템 상태 조회에 실패했습니다.' });
    }

    const enabled = !!(data && data.value && data.value.enabled === true);
    const message = (data && data.value && typeof data.value.message === 'string')
      ? data.value.message
      : '';

    res.json({
      success: true,
      maintenance: {
        enabled,
        message,
      },
    });
  } catch (error) {
    console.error('[system][status] 조회 오류:', error);
    res.status(500).json({ success: false, message: '시스템 상태 조회에 실패했습니다.' });
  }
});

// 앱 버전 정책 조회 (공개 API)
router.get('/version-policy', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'version_policy')
      .maybeSingle();

    if (error) {
      console.error('[system][version-policy] 조회 오류:', error);
      // 에러 시 기본값 반환 (앱이 정상 작동하도록)
      return res.json({
        ios: {
          minimumVersion: "0.1.0",
          latestVersion: "0.1.0",
          storeUrl: ""
        },
        android: {
          minimumVersion: "0.1.0",
          latestVersion: "0.1.0",
          storeUrl: "https://play.google.com/store/apps/details?id=com.solo.meeting&hl=ko"
        },
        messages: {
          forceUpdate: "필수 업데이트가 필요합니다.\n최신 버전으로 업데이트해주세요.",
          optionalUpdate: "새로운 버전을 사용하시겠어요?\n최신 기능과 개선 사항을 경험해보세요."
        }
      });
    }

    // 데이터가 없으면 기본값 반환
    if (!data || !data.value) {
      return res.json({
        ios: {
          minimumVersion: "0.1.0",
          latestVersion: "0.1.0",
          storeUrl: ""
        },
        android: {
          minimumVersion: "0.1.0",
          latestVersion: "0.1.0",
          storeUrl: "https://play.google.com/store/apps/details?id=com.solo.meeting&hl=ko"
        },
        messages: {
          forceUpdate: "필수 업데이트가 필요합니다.\n최신 버전으로 업데이트해주세요.",
          optionalUpdate: "새로운 버전을 사용하시겠어요?\n최신 기능과 개선 사항을 경험해보세요."
        }
      });
    }

    // 정상 데이터 반환
    res.json(data.value);
  } catch (error) {
    console.error('[system][version-policy] 예외 발생:', error);
    // 예외 시에도 기본값 반환
    res.json({
      ios: {
        minimumVersion: "0.1.0",
        latestVersion: "0.1.0",
        storeUrl: ""
      },
      android: {
        minimumVersion: "0.1.0",
        latestVersion: "0.1.0",
        storeUrl: "https://play.google.com/store/apps/details?id=com.solo.meeting&hl=ko"
      },
      messages: {
        forceUpdate: "필수 업데이트가 필요합니다.\n최신 버전으로 업데이트해주세요.",
        optionalUpdate: "새로운 버전을 사용하시겠어요?\n최신 기능과 개선 사항을 경험해보세요."
      }
    });
  }
});

module.exports = router;


