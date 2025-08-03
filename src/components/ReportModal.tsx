import React, { useState } from 'react';
import styled from 'styled-components';
import { reportApi } from '../services/api.ts';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: {
    id: string;
    nickname: string;
  };
  periodId: number;
  onSuccess?: () => void;
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.isOpen ? 'flex' : 'none'};
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.variant === 'primary' ? `
    background: #7C3AED;
    color: white;
    
    &:hover {
      background: #6D28D9;
    }
    
    &:disabled {
      background: #9CA3AF;
      cursor: not-allowed;
    }
  ` : `
    background: #F3F4F6;
    color: #374151;
    
    &:hover {
      background: #E5E7EB;
    }
  `}
`;

const InfoText = styled.div`
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #92400E;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportedUser,
  periodId,
  onSuccess
}) => {
  const [reportType, setReportType] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportTypes = [
    { value: 'inappropriate_behavior', label: '부적절한 행동' },
    { value: 'spam', label: '스팸/도배' },
    { value: 'fake_profile', label: '허위 프로필' },
    { value: 'harassment', label: '괴롭힘/폭력' },
    { value: 'commercial', label: '상업적 목적' },
    { value: 'other', label: '기타' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportType || !reportReason) {
      alert('신고 유형과 신고 사유를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await reportApi.createReport({
        reported_user_id: reportedUser.id,
        period_id: periodId,
        report_type: reportType,
        report_reason: reportReason,
        report_details: reportDetails
      });
      
      alert('신고가 성공적으로 접수되었습니다.');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error('신고 등록 오류:', error);
      alert(error.response?.data?.message || '신고 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReportType('');
    setReportReason('');
    setReportDetails('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>사용자 신고</Title>
        
        <InfoText>
          <strong>신고 대상:</strong> {reportedUser.nickname}<br />
          신고는 신중하게 접수해주시기 바랍니다. 허위 신고는 제재 대상이 될 수 있습니다.
        </InfoText>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>신고 유형 *</Label>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              required
            >
              <option value="">신고 유형을 선택하세요</option>
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>신고 사유 *</Label>
            <Select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              required
            >
              <option value="">신고 사유를 선택하세요</option>
              {reportType === 'inappropriate_behavior' && (
                <>
                  <option value="sexual_harassment">성적 괴롭힘</option>
                  <option value="verbal_abuse">언어폭력</option>
                  <option value="stalking">스토킹</option>
                  <option value="threat">협박/위협</option>
                </>
              )}
              {reportType === 'spam' && (
                <>
                  <option value="repeated_messages">반복적인 메시지</option>
                  <option value="advertising">광고성 메시지</option>
                  <option value="bot_behavior">봇과 같은 행동</option>
                </>
              )}
              {reportType === 'fake_profile' && (
                <>
                  <option value="fake_photos">허위 사진</option>
                  <option value="fake_info">허위 정보</option>
                  <option value="stolen_identity">도용된 신원</option>
                </>
              )}
              {reportType === 'harassment' && (
                <>
                  <option value="bullying">괴롭힘</option>
                  <option value="discrimination">차별</option>
                  <option value="hate_speech">혐오 발언</option>
                </>
              )}
              {reportType === 'commercial' && (
                <>
                  <option value="business_promotion">사업 홍보</option>
                  <option value="sales_activity">판매 활동</option>
                  <option value="recruitment">채용 홍보</option>
                </>
              )}
              {reportType === 'other' && (
                <>
                  <option value="system_abuse">시스템 악용</option>
                  <option value="rule_violation">이용약관 위반</option>
                  <option value="other_reason">기타 사유</option>
                </>
              )}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>상세 내용 (선택사항)</Label>
            <TextArea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="신고 내용에 대한 구체적인 설명을 작성해주세요..."
              maxLength={1000}
            />
          </FormGroup>

          <ButtonGroup>
            <Button type="button" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? '신고 중...' : '신고하기'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ReportModal; 