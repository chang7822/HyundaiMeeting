import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Capacitor } from '@capacitor/core';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  preloadedBanner?: any;
}

// 앱 시작 시점의 화면 높이 저장 (전역, 한 번만 계산)
const INITIAL_SCREEN_HEIGHT = window.innerHeight;

// Styled components 먼저 정의
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 10000;
`;

const ModalContainer = styled.div<{ $isNative?: boolean; $topPosition?: string }>`
  position: fixed;
  left: 50%;
  top: ${props => props.$topPosition || '50%'};
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  width: calc(100% - 40px);
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  font-size: 20px;
  font-weight: 700;
  color: #111;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const Message = styled.p`
  font-size: 16px;
  color: #374151;
  line-height: 1.5;
  margin: 0;
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  border-top: 1px solid #e5e7eb;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 16px;
  background: white;
  color: #6b7280;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f9fafb;
  }

  &:active {
    background-color: #f3f4f6;
  }
`;

const ConfirmButton = styled.button`
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border-left: 1px solid #e5e7eb;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    opacity: 0.8;
  }
`;

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onConfirm, onCancel, preloadedBanner }) => {
  const bannerAdRef = React.useRef<any>(null);
  const isMountedRef = React.useRef(true);
  const isShowingRef = React.useRef(false); // 배너 표시 상태 추적

  useEffect(() => {
    if (!isOpen) {
      // 모달이 닫힐 때 배너 숨김
      if (bannerAdRef.current && isShowingRef.current) {
        bannerAdRef.current.hide().catch((e: any) => {
          console.error('[ExitConfirmModal] 배너 숨김 실패:', e);
        });
        isShowingRef.current = false;
      }
      return;
    }

    isMountedRef.current = true;

    // 네이티브 앱에서만 광고 로드
    if (Capacitor.isNativePlatform()) {
      loadNativeAd();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [isOpen, preloadedBanner]);

  const loadNativeAd = async () => {
    try {
      // 이미 배너가 표시 중이면 그대로 유지
      if (isShowingRef.current && bannerAdRef.current) {
        return;
      }

      // 기존 배너가 있으면 다시 표시
      if (bannerAdRef.current && !isShowingRef.current) {
        await bannerAdRef.current.show();
        isShowingRef.current = true;
        return;
      }
      
      // 사전 로드된 광고가 있으면 바로 표시
      if (preloadedBanner && !bannerAdRef.current) {
        if (!isMountedRef.current) return;
        bannerAdRef.current = preloadedBanner;
        await preloadedBanner.show();
        isShowingRef.current = true;
        return;
      }

      // 사전 로드 실패 시 즉시 로드
      const admobModule = await import('@capgo/capacitor-admob');
      if (!isMountedRef.current) return; // 언마운트되었으면 중단
      
      const { BannerAd } = admobModule;
      
      const platform = Capacitor.getPlatform();
      const isIOS = platform === 'ios';
      const isTesting = process.env.REACT_APP_ADMOB_TESTING !== 'false';
      const adUnitId = isTesting
        ? 'ca-app-pub-3940256099942544/6300978111' // 테스트
        : isIOS
          ? 'ca-app-pub-1352765336263182/5438712556' // iOS 배너
          : 'ca-app-pub-1352765336263182/5676657338'; // Android 배너
      
      if (!isMountedRef.current) return; // 언마운트되었으면 중단
      const banner = new BannerAd({ adUnitId });
      bannerAdRef.current = banner;
      await banner.show();
      isShowingRef.current = true; // 표시 상태 기록
    } catch (error) {
      console.error('[ExitConfirmModal] 광고 로드 실패:', error);
      isShowingRef.current = false;
    }
  };

  // 컴포넌트가 완전히 언마운트될 때 배너 정리
  React.useEffect(() => {
    return () => {
      if (bannerAdRef.current) {
        if (isShowingRef.current) {
          bannerAdRef.current.hide().catch((e: any) => {
            console.error('[ExitConfirmModal] 광고 숨김 실패:', e);
          });
        }
        bannerAdRef.current = null;
        isShowingRef.current = false;
      }
    };
  }, []);

  if (!isOpen) return null;

  // 네이티브: 고정된 화면 높이 기준, 배너(60px) + 여유(30px) 제외
  // 웹: 단순히 화면 중앙 (배너 없음)
  const isNative = Capacitor.isNativePlatform();
  const topPosition = isNative ? `${(INITIAL_SCREEN_HEIGHT / 2) - 90}px` : '50%';

  return (
    <Overlay onClick={onCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()} $isNative={isNative} $topPosition={topPosition}>
        <ModalHeader>앱 종료</ModalHeader>
        
        <ModalBody>
          <Message>정말 앱을 종료하시겠습니까?</Message>
        </ModalBody>

        <ButtonGroup>
          <CancelButton onClick={onCancel}>
            취소
          </CancelButton>
          <ConfirmButton onClick={onConfirm}>
            종료
          </ConfirmButton>
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );
};

export default ExitConfirmModal;
