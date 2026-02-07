import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';

interface PreferenceMultiSelectModalProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  options: string[];
  initialSelected: string[];
  initialNoPreference?: boolean;
  minCount: number;
  anyInactiveLabel: string; // 상관없음 (모든 ### 선택)
  anyActiveLabel: string;   // 모든 ### 선택 해제
  footerNote?: string; // 모달 하단에 표시할 설명 문구
  onClose: () => void;
  onConfirm: (selected: string[], isNoPreference: boolean) => void;
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
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

const AnySelectButton = styled.button<{ $selected: boolean }>`
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

const OptionGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`;

const OptionButton = styled.button<{ $selected: boolean }>`
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

const FooterNote = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
  line-height: 1.4;
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
      box-shadow: none;
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

const PreferenceMultiSelectModal: React.FC<PreferenceMultiSelectModalProps> = ({
  isOpen,
  title,
  description,
  options,
  initialSelected,
  initialNoPreference = false,
  minCount,
  anyInactiveLabel,
  anyActiveLabel,
  footerNote,
  onClose,
  onConfirm,
}) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [noPreference, setNoPreference] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedValues(initialSelected || []);
    setNoPreference(initialNoPreference || false);
  }, [isOpen, initialSelected, initialNoPreference]);

  const handleToggleAny = () => {
    if (!options.length) return;
    if (noPreference) {
      // 상관없음 해제 → 모든 선택 해제
      setNoPreference(false);
      setSelectedValues([]);
    } else {
      // 상관없음 활성화 → 모든 옵션 선택
      setNoPreference(true);
      setSelectedValues(options);
    }
  };

  const handleToggleOption = (value: string) => {
    const isDeselecting = selectedValues.includes(value);
    const next = isDeselecting
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    setSelectedValues(next);
    // 전체 선택 상태에서 하나라도 수동으로 빼면 전체선택 토글 해제
    if (isDeselecting && noPreference) {
      setNoPreference(false);
    }
    // 전부 선택된 상태가 되면 전체선택 토글과 동기화
    if (!isDeselecting && next.length === options.length) {
      setNoPreference(true);
    }
  };

  const handleConfirm = () => {
    if (!noPreference && selectedValues.length < minCount) {
      if (minCount === 1) {
        toast.error('최소 1개 이상 선택해주세요.');
      } else {
        toast.error(`최소 ${minCount}개 이상 선택해주세요.`);
      }
      return;
    }
    onConfirm(selectedValues, noPreference);
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
        <ModalTitle>{title}</ModalTitle>
        {description && <ModalSubtitle>{description}</ModalSubtitle>}

        <AnySelectButton
          type="button"
          $selected={noPreference}
          onClick={handleToggleAny}
        >
          {noPreference ? anyActiveLabel : anyInactiveLabel}
        </AnySelectButton>

        {options.length === 0 ? (
          <EmptyText>선택할 수 있는 옵션이 없습니다.</EmptyText>
        ) : (
          <OptionGrid>
            {options.map(opt => (
              <OptionButton
                key={opt}
                type="button"
                $selected={selectedValues.includes(opt)}
                onClick={() => handleToggleOption(opt)}
              >
                {opt}
              </OptionButton>
            ))}
          </OptionGrid>
        )}

        <Footer>
          <FooterButton
            type="button"
            $variant="secondary"
            onClick={() => {
              setSelectedValues([]);
              setNoPreference(false);
            }}
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
        {footerNote && <FooterNote>{footerNote}</FooterNote>}
      </ModalContent>
    </ModalOverlay>
  );
};

export default PreferenceMultiSelectModal;


