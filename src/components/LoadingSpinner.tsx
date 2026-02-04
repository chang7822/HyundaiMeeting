import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

// 앱 시작 시점의 화면 높이 저장 (전역, 한 번만 계산)
const INITIAL_SCREEN_HEIGHT = window.innerHeight;

// 전역 배너 관리 (앱 전체에서 하나의 배너만 사용)
// window 객체에 저장하여 다른 컴포넌트에서도 접근 가능
declare global {
  interface Window {
    globalBannerAd: any;
    globalBannerShowing: boolean;
    globalBannerInitializing: boolean;
  }
}

if (typeof window !== 'undefined') {
  window.globalBannerAd = window.globalBannerAd || null;
  window.globalBannerShowing = window.globalBannerShowing || false;
  window.globalBannerInitializing = window.globalBannerInitializing || false;
}

// 예쁜 그라데이션 원형 스피너 SVG + 부드러운 애니메이션
const LoadingSpinner = ({ 
  text = "로딩 중...", 
  sidebarOpen = false,
  preloadedBanner 
}: { 
  text?: string; 
  sidebarOpen?: boolean;
  preloadedBanner?: any;
}) => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    // 네이티브 앱에서만 광고 표시
    if (!Capacitor.isNativePlatform()) return;

    isMountedRef.current = true;

    const loadNativeAd = async () => {
      try {
        // 이미 전역 배너가 표시 중이거나 초기화 중이면 재사용
        if (window.globalBannerShowing || window.globalBannerInitializing) {
          console.log('[LoadingSpinner] 전역 배너 이미 사용 중 - 재사용');
          return;
        }

        window.globalBannerInitializing = true;
        
        if (preloadedBanner && !window.globalBannerAd) {
          if (!isMountedRef.current) {
            window.globalBannerInitializing = false;
            return;
          }
          window.globalBannerAd = preloadedBanner;
          await preloadedBanner.show();
          window.globalBannerShowing = true;
          window.globalBannerInitializing = false;
          console.log('[LoadingSpinner] 사전로드 배너 표시 완료');
          return;
        }

        // 이미 전역 배너가 있으면 다시 표시
        if (window.globalBannerAd && !window.globalBannerShowing) {
          await window.globalBannerAd.show();
          window.globalBannerShowing = true;
          window.globalBannerInitializing = false;
          console.log('[LoadingSpinner] 기존 배너 재표시');
          return;
        }

        // Fallback: 사전로드 실패 시 즉시 로드
        if (!window.globalBannerAd) {
          const admobModule = await import('@capgo/capacitor-admob');
          if (!isMountedRef.current) {
            window.globalBannerInitializing = false;
            return;
          }
          
          const { BannerAd } = admobModule;
          const platform = Capacitor.getPlatform();
          const isIOS = platform === 'ios';
          const isTesting = process.env.REACT_APP_ADMOB_TESTING !== 'false';
          const adUnitId = isTesting
            ? 'ca-app-pub-3940256099942544/6300978111' // 테스트
            : isIOS
              ? 'ca-app-pub-1352765336263182/5438712556' // iOS 배너
              : 'ca-app-pub-1352765336263182/5676657338'; // Android 배너
          const banner = new BannerAd({ adUnitId });
          
          if (!isMountedRef.current) {
            window.globalBannerInitializing = false;
            return;
          }
          window.globalBannerAd = banner;
          await banner.show();
          window.globalBannerShowing = true;
          console.log('[LoadingSpinner] 새 배너 로드 및 표시 완료');
        }
        
        window.globalBannerInitializing = false;
      } catch (error) {
        console.error('[LoadingSpinner] 광고 로드 실패:', error);
        window.globalBannerShowing = false;
        window.globalBannerInitializing = false;
      }
    };

    loadNativeAd();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // 의존성 배열 비움 - 한 번만 실행

  // 컴포넌트가 완전히 언마운트될 때만 배너 숨김
  useEffect(() => {
    return () => {
      // LoadingSpinner가 완전히 사라질 때만 배너 숨김
      // 하지만 곧 다시 나타날 수 있으므로 숨기지 않음 (전역 관리)
      console.log('[LoadingSpinner] 컴포넌트 언마운트 (배너는 유지)');
    };
  }, []); // 빈 배열 - 컴포넌트 마운트 시 한 번만 등록

  // 네이티브: 고정된 화면 높이 기준, 배너(60px) + 여유(30px) 제외
  // 웹: 단순히 화면 중앙 (배너 없음)
  const isNative = Capacitor.isNativePlatform();
  const topPosition = isNative ? `${(INITIAL_SCREEN_HEIGHT / 2) - 90}px` : '50%';

  return (
  <>
    {/* 전체 배경 - 메인페이지와 동일한 그라데이션 */}
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      zIndex: 2000,
    }} />
    
    {/* 스피너 + 아이콘 */}
    <div style={{
      position: 'fixed',
      left: '50%',
      top: topPosition,
      transform: 'translate(-50%, -50%)',
      zIndex: 2001,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
    }}>
      {/* 앱 아이콘 */}
      <img 
        src="/icon-192.png" 
        alt="직쏠공" 
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '18px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      />
      
      {/* 그라데이션 원형 스피너 */}
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
        </defs>
        <circle
          cx="32" cy="32" r="26"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="32" cy="32" r="26"
          stroke="url(#spinner-gradient)"
          strokeWidth="6"
          fill="none"
          strokeDasharray="120 60"
          strokeLinecap="round"
          style={{
            transformOrigin: 'center',
            animation: 'spinner-rotate 1.1s linear infinite',
          } as React.CSSProperties}
        />
      </svg>
      
      <style>
        {`
          @keyframes spinner-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  </>
  );
};

export default LoadingSpinner; 