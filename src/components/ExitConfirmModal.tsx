import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Capacitor } from '@capacitor/core';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  preloadedBanner?: any;
}

// Styled components 먼저 정의
const Overlay = styled.div<{ $isNative?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 10000;
`;

const ModalContainer = styled.div<{ $isNative?: boolean }>`
  position: fixed;
  left: 50%;
  top: ${props => props.$isNative ? 'auto' : '50%'};
  bottom: ${props => props.$isNative ? '120px' : 'auto'}; /* 광고(60px) + 여유(60px) */
  transform: ${props => props.$isNative ? 'translateX(-50%)' : 'translate(-50%, -50%)'};
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

  useEffect(() => {
    if (!isOpen) {
      // 모달이 닫힐 때 광고 정리
      if (Capacitor.isNativePlatform() && bannerAdRef.current) {
        cleanupNativeAd();
      }
      return;
    }

    // 네이티브 앱에서만 광고 로드
    if (Capacitor.isNativePlatform()) {
      loadNativeAd();
    }

    return () => {
      // 컴포넌트 언마운트 시 광고 정리
      if (Capacitor.isNativePlatform() && bannerAdRef.current) {
        cleanupNativeAd();
      }
    };
  }, [isOpen, preloadedBanner]);

  const loadNativeAd = async () => {
    try {
      // 사전 로드된 광고가 있으면 바로 표시
      if (preloadedBanner) {
        bannerAdRef.current = preloadedBanner;
        await preloadedBanner.show();
        console.log('[ExitConfirmModal] 사전 로드된 배너 광고 표시');
        return;
      }

      // 사전 로드 실패 시 즉시 로드
      console.log('[ExitConfirmModal] 광고 즉시 로드 시작');
      const admobModule = await import('@capgo/capacitor-admob');
      const { BannerAd } = admobModule;
      
      const isTesting = process.env.REACT_APP_ADMOB_TESTING !== 'false';
      const adUnitId = isTesting
        ? 'ca-app-pub-3940256099942544/6300978111'
        : 'ca-app-pub-1352765336263182/3234219021';
      
      const banner = new BannerAd({ adUnitId });
      bannerAdRef.current = banner;
      await banner.show();
    } catch (error) {
      console.error('[ExitConfirmModal] 광고 로드 실패:', error);
    }
  };

  const cleanupNativeAd = async () => {
    try {
      if (bannerAdRef.current) {
        // 배너 광고 숨기기
        await bannerAdRef.current.hide();
        bannerAdRef.current = null;
      }
    } catch (error) {
      console.error('[ExitConfirmModal] 광고 정리 실패:', error);
    }
  };

  if (!isOpen) return null;

  // 네이티브 앱에서는 항상 광고 배너 공간 확보 (광고 로드 여부와 무관)
  const isNative = Capacitor.isNativePlatform();

  return (
    <Overlay onClick={onCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()} $isNative={isNative}>
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
