import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Capacitor } from '@capacitor/core';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 네이티브 앱에서만 광고 로드
    if (Capacitor.isNativePlatform()) {
      loadNativeAd();
    }

    return () => {
      // 모달 닫힐 때 광고 정리
      if (Capacitor.isNativePlatform()) {
        cleanupNativeAd();
      }
    };
  }, [isOpen]);

  const loadNativeAd = async () => {
    try {
      const admobModule = await import('@capgo/capacitor-admob');
      const { BannerAd } = admobModule;
      
      // 광고 ID 설정 (환경 변수로 테스트/실제 모드 제어)
      const isTesting = process.env.REACT_APP_ADMOB_TESTING !== 'false';
      const adUnitId = isTesting
        ? 'ca-app-pub-3940256099942544/6300978111' // Google 테스트 배너 ID
        : 'ca-app-pub-1352765336263182/3234219021'; // 종료 배너 광고 단위 ID
      
      // BannerAd 인스턴스 생성 및 표시
      const banner = new BannerAd({
        adUnitId: adUnitId,
      });

      await banner.show();

      setAdLoaded(true);
      setAdError(false);
    } catch (error) {
      console.error('[ExitConfirmModal] 광고 로드 실패:', error);
      setAdError(true);
      setAdLoaded(false);
    }
  };

  const cleanupNativeAd = async () => {
    try {
      // 배너 광고는 모달이 닫힐 때 자동으로 정리됨
      // 필요시 BannerAd 인스턴스의 hide() 메서드 호출
    } catch (error) {
      console.error('[ExitConfirmModal] 광고 정리 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>앱 종료</ModalHeader>
        
        <ModalBody>
          <Message>정말 앱을 종료하시겠습니까?</Message>
          
          {/* 네이티브 광고 영역 */}
          {Capacitor.isNativePlatform() && (
            <AdContainer id="native-ad-container">
              {!adLoaded && !adError && (
                <AdLoadingText>광고 로딩 중...</AdLoadingText>
              )}
              {adError && (
                <AdErrorText>광고를 불러올 수 없습니다</AdErrorText>
              )}
              {/* AdMob 네이티브 광고가 여기에 렌더링됨 */}
            </AdContainer>
          )}
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

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
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
  margin: 0 0 20px 0;
  text-align: center;
`;

const AdContainer = styled.div`
  min-height: 120px;
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  border: 1px solid #e5e7eb;
`;

const AdLoadingText = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

const AdErrorText = styled.div`
  font-size: 14px;
  color: #ef4444;
`;

const ButtonGroup = styled.div`
  display: flex;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button`
  flex: 1;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:active {
    opacity: 0.7;
  }
`;

const CancelButton = styled(Button)`
  color: #6b7280;
  border-right: 1px solid #e5e7eb;

  &:hover {
    background-color: #f9fafb;
  }
`;

const ConfirmButton = styled(Button)`
  color: #ef4444;
  font-weight: 700;

  &:hover {
    background-color: #fef2f2;
  }
`;
