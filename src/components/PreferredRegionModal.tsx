import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import regions from '../assets/korea_regions.json';
import { toast } from 'react-toastify';

interface PreferredRegionModalProps {
  isOpen: boolean;
  initialSelectedRegions: string[];
  onClose: () => void;
  onConfirm: (regions: string[]) => void;
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => (props.$isOpen ? 'flex' : 'none')};
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 16px;
    align-items: center;
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.75rem 1.5rem 1.5rem;
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  position: relative;

  @media (max-width: 480px) {
    max-width: 420px;
    padding: 1.5rem 1.25rem 1.25rem;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.75rem;
  text-align: left;
`;

const ModalSubtitle = styled.p`
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 1.25rem;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.1s;

  &:hover {
    background: #e5e7eb;
    color: #374151;
    transform: translateY(-1px);
  }
`;

const AllSelectButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #4f46e5;
  background: ${props => (props.$selected ? '#4f46e5' : '#f5f3ff')};
  color: ${props => (props.$selected ? '#ffffff' : '#111827')};
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 12px;
  text-align: center;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => (props.$selected ? '#4338ca' : '#e0e7ff')};
  }
`;

const RegionGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`;

const RegionButton = styled.button<{ $selected: boolean }>`
  padding: 8px 12px;
  border-radius: 999px;
  border: 1.5px solid #e5e7eb;
  background: ${props => (props.$selected ? '#6366f1' : '#f9fafb')};
  color: ${props => (props.$selected ? '#ffffff' : '#111827')};
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => (props.$selected ? '#4f46e5' : '#eef2ff')};
    border-color: #c7d2fe;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const FooterButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  min-width: 80px;
  padding: 9px 16px;
  border-radius: 9px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  ${props =>
    props.$variant === 'primary'
      ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(99,102,241,0.4);
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(79,70,229,0.45);
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      boxShadow: none;
    }
  `
      : `
    background: #f3f4f6;
    color: #374151;
    &:hover {
      background: #e5e7eb;
    }
  `}
`;

const EmptyText = styled.div`
  font-size: 0.9rem;
  color: #9ca3af;
  padding: 12px 4px;
`;

const PreferredRegionModal: React.FC<PreferredRegionModalProps> = ({
  isOpen,
  initialSelectedRegions,
  onClose,
  onConfirm,
}) => {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedRegions(initialSelectedRegions || []);
  }, [isOpen, initialSelectedRegions]);

  const allRegions = (regions as { sido: string }[]).map(r => r.sido);
  const allSelected =
    allRegions.length > 0 && selectedRegions.length === allRegions.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedRegions([]);
    } else {
      setSelectedRegions(allRegions);
    }
  };

  const handleToggleRegion = (sido: string) => {
    setSelectedRegions(prev =>
      prev.includes(sido)
        ? prev.filter(x => x !== sido)
        : [...prev, sido],
    );
  };

  const handleConfirm = () => {
    if (selectedRegions.length === 0) {
      // 최소 1개 선택 필수 - 토스트로 노출
      toast.error('선호 지역을 최소 1개 이상 선택해주세요.');
      return;
    }
    onConfirm(selectedRegions);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton type="button" onClick={onClose} aria-label="닫기">
          ×
        </CloseButton>
        <ModalTitle>선호 지역 선택</ModalTitle>
        <ModalSubtitle>
          매칭 시 참고되는 선호 지역(시/도 기준)을 선택해주세요. 상단의{' '}
          <strong>상관없음(모든 지역 선택)</strong>을 누르면 모든 지역을 선호하는 것으로
          처리돼요.
        </ModalSubtitle>

        <AllSelectButton
          type="button"
          $selected={allSelected}
          onClick={handleToggleAll}
        >
          {allSelected ? '모든 지역 선택 해제' : '상관없음 (모든 지역 선택)'}
        </AllSelectButton>

        {allRegions.length === 0 ? (
          <EmptyText>선택할 수 있는 지역이 없습니다.</EmptyText>
        ) : (
          <RegionGrid>
            {allRegions.map(sido => (
              <RegionButton
                key={sido}
                type="button"
                $selected={selectedRegions.includes(sido)}
                onClick={() => handleToggleRegion(sido)}
              >
                {sido}
              </RegionButton>
            ))}
          </RegionGrid>
        )}

        <Footer>
          <FooterButton
            type="button"
            $variant="secondary"
            onClick={() => setSelectedRegions([])}
          >
            초기화
          </FooterButton>
          <FooterButton
            type="button"
            $variant="primary"
            onClick={handleConfirm}
          >
            확인
          </FooterButton>
        </Footer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default PreferredRegionModal;


