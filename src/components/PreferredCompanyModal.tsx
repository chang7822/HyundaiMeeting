import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { Company } from '../types/index.ts';
import { companyApi } from '../services/api.ts';

interface PreferredCompanyModalProps {
  isOpen: boolean;
  initialSelectedIds: string[];
  onClose: () => void;
  onConfirm: (selectedIds: string[], selectedNames: string[]) => void;
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

const CompanyGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`;

const CompanyButton = styled.button<{ $selected: boolean }>`
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

const PreferredCompanyModal: React.FC<PreferredCompanyModalProps> = ({
  isOpen,
  initialSelectedIds,
  onClose,
  onConfirm,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedIds(initialSelectedIds || []);
    setLoading(true);
    companyApi
      .getCompanies()
      .then(data => {
        setCompanies(data || []);
      })
      .catch(() => {
        toast.error('회사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, initialSelectedIds]);

  const activeCompanies = companies.filter(c => c.isActive);
  const allSelected =
    activeCompanies.length > 0 &&
    selectedIds.length === activeCompanies.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeCompanies.map(c => c.id));
    }
  };

  const handleToggleCompany = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      toast.error('선호 회사를 최소 1개 이상 선택해주세요.');
      return;
    }
    const selectedCompanies = activeCompanies.filter(c =>
      selectedIds.includes(c.id),
    );
    const selectedNames = selectedCompanies.map(c => c.name);
    onConfirm(selectedIds, selectedNames);
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
        <ModalTitle>선호 회사 선택</ModalTitle>
        <ModalSubtitle>
          매칭 시 참고되는 선호 회사를 선택해주세요. 상단의{' '}
          <strong>상관없음(모두선택)</strong>을 누르면 모든 회사를 선호하는 것으로
          처리돼요.
        </ModalSubtitle>

        <AllSelectButton
          type="button"
          $selected={allSelected}
          onClick={handleToggleAll}
        >
          {allSelected ? '모든 회사 선택 해제' : '상관없음 (모든 회사 선택)'}
        </AllSelectButton>

        {loading ? (
          <EmptyText>회사 목록을 불러오는 중입니다...</EmptyText>
        ) : activeCompanies.length === 0 ? (
          <EmptyText>선택할 수 있는 회사가 아직 없습니다.</EmptyText>
        ) : (
          <CompanyGrid>
            {activeCompanies.map(company => (
              <CompanyButton
                key={company.id}
                type="button"
                $selected={selectedIds.includes(company.id)}
                onClick={() => handleToggleCompany(company.id)}
              >
                {company.name}
              </CompanyButton>
            ))}
          </CompanyGrid>
        )}

        <Footer>
          <FooterButton
            type="button"
            $variant="secondary"
            onClick={() => setSelectedIds([])}
          >
            초기화
          </FooterButton>
          <FooterButton
            type="button"
            $variant="primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            확인
          </FooterButton>
        </Footer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default PreferredCompanyModal;


