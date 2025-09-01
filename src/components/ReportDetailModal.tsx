import React from 'react';
import styled from 'styled-components';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportInfo: {
    id: number;
    report_type: string;
    report_details: string;
    status: string;
    created_at: string;
  };
  partnerNickname: string;
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const Title = styled.h2`
  color: #333;
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 600;
`;

const InfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
`;

const Value = styled.div`
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 1rem;
  border: 1px solid #e9ecef;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  
  ${props => {
    switch (props.$status) {
      case 'pending':
        return `
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        `;
      case 'rejected':
        return `
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        `;
      case 'resolved':
      case 'temporary_ban':
      case 'permanent_ban':
      case 'warning':
      case 'no_action':
        return `
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        `;
      default:
        return `
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        `;
    }
  }}
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: #6c757d;
  color: white;
  
  &:hover {
    background: #5a6268;
  }
`;

const getReportTypeLabel = (type: string) => {
  const types: { [key: string]: string } = {
    'inappropriate_behavior': '부적절한 행동',
    'spam': '스팸/도배',
    'fake_profile': '허위 프로필',
    'harassment': '괴롭힘/폭력',
    'commercial': '상업적 목적',
    'other': '기타'
  };
  return types[type] || type;
};

const getStatusLabel = (status: string) => {
  const statuses: { [key: string]: string } = {
    'pending': '처리 대기',
    'resolved': '접수완료',
    'rejected': '신고 반려',
    'temporary_ban': '접수완료',
    'permanent_ban': '접수완료',
    'warning': '접수완료',
    'no_action': '접수완료'
  };
  return statuses[status] || '접수완료';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  reportInfo,
  partnerNickname
}) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay $isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>신고 내역</Title>
        
        <InfoSection>
          <InfoItem>
            <Label>신고 대상</Label>
            <Value>{partnerNickname}</Value>
          </InfoItem>
          
          <InfoItem>
            <Label>신고 유형</Label>
            <Value>{getReportTypeLabel(reportInfo.report_type)}</Value>
          </InfoItem>
          
          <InfoItem>
            <Label>신고 내용</Label>
            <Value>
              {reportInfo.report_details || '상세 내용이 없습니다.'}
            </Value>
          </InfoItem>
          
          <InfoItem>
            <Label>처리 상태</Label>
            <Value>
              <StatusBadge $status={reportInfo.status}>
                {getStatusLabel(reportInfo.status)}
              </StatusBadge>
            </Value>
          </InfoItem>
          
          <InfoItem>
            <Label>신고 일시</Label>
            <Value>{formatDate(reportInfo.created_at)}</Value>
          </InfoItem>
        </InfoSection>

        <ButtonGroup>
          <Button onClick={onClose}>
            닫기
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ReportDetailModal;
