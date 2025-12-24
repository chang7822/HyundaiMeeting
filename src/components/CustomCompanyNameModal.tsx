import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';

interface CustomCompanyNameModalProps {
  isOpen: boolean;
  companyType: 'freelance' | 'other';
  initialValue?: string;
  onClose: () => void;
  onConfirm: (companyName: string) => void;
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
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.75rem 1.5rem 1.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  position: relative;
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

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #e74c3c;
  }
`;

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: block;
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

const CustomCompanyNameModal: React.FC<CustomCompanyNameModalProps> = ({
  isOpen,
  companyType,
  initialValue = '',
  onClose,
  onConfirm,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCompanyName(initialValue);
      setError('');
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    const trimmed = companyName.trim();
    if (!trimmed) {
      setError('회사명 또는 직업을 입력해주세요.');
      return;
    }
    if (trimmed.length > 50) {
      setError('회사명 또는 직업은 50자 이내로 입력해주세요.');
      return;
    }
    onConfirm(trimmed);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const title = companyType === 'freelance' 
    ? '프리랜서/자영업 정보 입력' 
    : '기타 회사 정보 입력';
  
  const description = companyType === 'freelance'
    ? '프로필에 표시될 회사명 또는 직업을 입력해주세요. (예: 프리랜서 디자이너, 카페 사장 등)'
    : '프로필에 표시될 회사명 또는 직업을 입력해주세요. (예: 회사명, 특정 직업 등)';

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton type="button" onClick={onClose} aria-label="닫기">
          ×
        </CloseButton>
        <ModalTitle>{title}</ModalTitle>
        <ModalSubtitle>{description}</ModalSubtitle>

        <Input
          type="text"
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            setError('');
          }}
          placeholder="회사명 또는 직업을 입력하세요"
          className={error ? 'error' : ''}
          maxLength={50}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Footer>
          <FooterButton
            type="button"
            $variant="secondary"
            onClick={onClose}
          >
            취소
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

export default CustomCompanyNameModal;

