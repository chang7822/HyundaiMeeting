/**
 * iOS 홈화면 웹앱 추가 가이드 모달 (이미지 슬라이드)
 * 랜딩페이지, 메인페이지(푸시알림 안내) 등에서 공통 사용
 */
import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { Capacitor } from '@capacitor/core';
import img0 from '../image/image0.png';
import img1 from '../image/image1.png';
import img2 from '../image/image2.png';
import img3 from '../image/image3.png';
import img4 from '../image/image4.png';
import img5 from '../image/image5.png';
import img6 from '../image/image6.png';

const IOS_WEBAPP_STEPS: Array<{ img: string; desc: string }> = [
  { img: img0, desc: 'Safari 화면 하단의 ⋯ 버튼을 눌러주세요.' },
  { img: img1, desc: '공유 버튼을 눌러주세요.' },
  { img: img2, desc: '화면 하단의 ⋯(더 보기) 버튼을 눌러주세요.' },
  { img: img3, desc: '"홈 화면에 추가"를 눌러주세요.' },
  { img: img4, desc: '"웹 앱으로 열기" 토글이 켜져 있는지 확인한 뒤 "추가" 버튼을 누르세요.' },
  { img: img5, desc: '홈 화면에 직쏠공 아이콘이 추가되었습니다. 이제 앱처럼 사용할 수 있어요!' },
  { img: img6, desc: '푸시 알림을 켜야 매칭 상대와 원활한 채팅이 가능합니다. 메인 페이지에서 푸시 알림 토글을 켜고, 권한 허용을 해주세요.' },
];

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
`;

const Content = styled.div`
  background: #f9fafb;
  border-radius: 18px;
  padding: 16px 14px 18px;
  max-width: 420px;
  width: 92vw;
  height: 95vh;
  max-height: 95vh;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  letter-spacing: -0.01em;
  margin: 0;
`;

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 999px;
  &:hover { background: rgba(209, 213, 219, 0.5); color: #111827; }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Desc = styled.p`
  font-size: 0.95rem;
  color: #1f2937;
  line-height: 1.55;
  margin: 0 0 10px 0;
  text-align: center;
  padding: 10px 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
  border-radius: 10px;
  border-left: 4px solid #667eea;
`;

const ImageWrap = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
  margin-bottom: 12px;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;

`;

const Dots = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  padding-bottom: 4px;
`;

const Dot = styled.span<{ $active?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.$active ? '#667eea' : '#e5e7eb'};
  transition: all 0.25s ease;
  cursor: pointer;
  ${p => p.$active && 'transform: scale(1.3);'}
  &:hover { background: ${p => p.$active ? '#667eea' : '#c4b5fd'}; }
`;

const Arrow = styled.button<{ $dir: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${p => p.$dir === 'left' ? 'left: 4px;' : 'right: 4px;'}
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.95);
  color: #374151;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-50%) scale(1.08);
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  }
  &:active { transform: translateY(-50%) scale(0.98); }
`;

const IosWebAppGuideModal: React.FC<{ isOpen: boolean; onClose: () => void; title?: string }> = ({
  isOpen,
  onClose,
  title = 'iOS 홈화면에 웹앱 추가하기',
}) => {
  const [step, setStep] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  if (!isOpen) return null;

  const handleSwipe = (start: number, end: number) => {
    const diff = start - end;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && step < IOS_WEBAPP_STEPS.length - 1) setStep(s => s + 1);
      else if (diff < 0 && step > 0) setStep(s => s - 1);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Content onClick={e => e.stopPropagation()}>
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose} aria-label="닫기">×</CloseBtn>
        </Header>
        <Body>
          <Desc>{IOS_WEBAPP_STEPS[step].desc}</Desc>
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
            {!Capacitor.isNativePlatform() && step > 0 && (
              <Arrow $dir="left" type="button" onClick={e => { e.stopPropagation(); setStep(s => s - 1); }} aria-label="이전">‹</Arrow>
            )}
            {!Capacitor.isNativePlatform() && step < IOS_WEBAPP_STEPS.length - 1 && (
              <Arrow $dir="right" type="button" onClick={e => { e.stopPropagation(); setStep(s => s + 1); }} aria-label="다음">›</Arrow>
            )}
            <ImageWrap
              onTouchStart={e => { swipeStartX.current = e.touches[0].clientX; }}
              onTouchEnd={e => {
                const start = swipeStartX.current;
                if (start != null) {
                  handleSwipe(start, e.changedTouches[0].clientX);
                  swipeStartX.current = null;
                }
              }}
              onMouseDown={e => { swipeStartX.current = e.clientX; }}
              onMouseUp={e => {
                const start = swipeStartX.current;
                if (start != null) {
                  handleSwipe(start, e.clientX);
                  swipeStartX.current = null;
                }
              }}
            >
              {IOS_WEBAPP_STEPS.map((s, i) => (
                <img
                  key={i}
                  src={s.img}
                  alt={`단계 ${i + 1}`}
                  draggable={false}
                  decoding="async"
                  style={{
                    position: i === 0 ? 'relative' : 'absolute',
                    inset: 0,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    opacity: i === step ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: i === step ? 'auto' : 'none',
                  }}
                />
              ))}
            </ImageWrap>
          </div>
          <Dots>
            {IOS_WEBAPP_STEPS.map((_, i) => (
              <Dot key={i} $active={i === step} onClick={() => setStep(i)} role="button" aria-label={`${i + 1}번째`} />
            ))}
          </Dots>
        </Body>
      </Content>
    </Overlay>
  );
};

export default IosWebAppGuideModal;
