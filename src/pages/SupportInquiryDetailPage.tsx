import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getSupportInquiry } from '../services/api.ts';

// ===================================
// 스타일드 컴포넌트
// ===================================

const Container = styled.div<{ $sidebarOpen?: boolean }>`
  flex: 1;
  margin-left: ${props => props.$sidebarOpen ? '280px' : '0'};
  padding: 2rem;
  min-height: 100vh;
  background: #f8f9fa;
  transition: margin-left 0.3s;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: 80px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f3f4f6;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
`;

const InquiryCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto 24px auto;
`;

const InquiryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const InquiryTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
`;

const InquiryMeta = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  
  ${props => {
    switch (props.$status) {
      case 'pending':
        return `
          background: #fef3cd;
          color: #92400e;
        `;
      case 'completed':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'closed':
        return `
          background: #f3f4f6;
          color: #374151;
        `;
      default:
        return `
          background: #e5e7eb;
          color: #6b7280;
        `;
    }
  }}
`;

const CategoryBadge = styled.span`
  padding: 4px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const InquiryDate = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const InquiryContent = styled.div`
  font-size: 16px;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #667eea;
`;

const RepliesSection = styled.div`
  margin-bottom: 24px;
  max-width: 800px;
  margin: 0 auto 24px auto;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
`;

const ReplyItem = styled.div<{ $isAdmin?: boolean }>`
  background: ${props => props.$isAdmin ? '#f0f8ff' : 'white'};
  border: 1px solid ${props => props.$isAdmin ? '#bee3f8' : '#e5e7eb'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
`;

const ReplyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ReplyAuthor = styled.span<{ $isAdmin?: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$isAdmin ? '#2563eb' : '#374151'};
`;

const ReplyDate = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const ReplyContent = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  white-space: pre-wrap;
`;



const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  &::after {
    content: '';
    width: 24px;
    height: 24px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyReplies = styled.div`
  text-align: center;
  padding: 24px;
  color: #6b7280;
  font-size: 14px;
`;

// ===================================
// 인터페이스
// ===================================

interface SupportInquiryDetailPageProps {
  sidebarOpen?: boolean;
}



interface SupportInquiry {
  id: number;
  title: string;
  content: string;
  category: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
  replies: Reply[];
}

interface Reply {
  id: number;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
  user?: {
    email: string;
  };
}

// ===================================
// 컴포넌트
// ===================================

const SupportInquiryDetailPage: React.FC<SupportInquiryDetailPageProps> = ({ sidebarOpen = true }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [inquiry, setInquiry] = useState<SupportInquiry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInquiry = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await getSupportInquiry(parseInt(id));
      setInquiry(response.data);
    } catch (error: any) {
      console.error('문의 상세 조회 오류:', error);
      toast.error('문의 내용을 불러오는데 실패했습니다.');
      navigate('/support/my-inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiry();
  }, [id]);



  const handleBack = () => {
    navigate('/support/my-inquiries');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '답변 대기';
      case 'completed': return '답변 완료';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      {loading ? (
        <LoadingSpinner />
      ) : !inquiry ? (
        <div>문의를 찾을 수 없습니다.</div>
      ) : (
        <>
          <Header>
            <BackButton onClick={handleBack}>←</BackButton>
            <Title>문의 상세</Title>
          </Header>

          <InquiryCard>
            <InquiryHeader>
              <InquiryTitle>{inquiry.title}</InquiryTitle>
              <InquiryMeta>
                <CategoryBadge>{inquiry.category}</CategoryBadge>
                <StatusBadge $status={inquiry.status}>
                  {getStatusText(inquiry.status)}
                </StatusBadge>
                <InquiryDate>{formatDate(inquiry.created_at)}</InquiryDate>
              </InquiryMeta>
            </InquiryHeader>
            <InquiryContent>{inquiry.content}</InquiryContent>
          </InquiryCard>

          {inquiry.replies && inquiry.replies.length > 0 && (
            <RepliesSection>
              <SectionTitle>💬 답변 내역</SectionTitle>
              {inquiry.replies.map((reply) => (
                <ReplyItem key={reply.id} $isAdmin={reply.is_admin_reply}>
                  <ReplyHeader>
                    <ReplyAuthor $isAdmin={reply.is_admin_reply}>
                      {reply.is_admin_reply ? '👨‍💼 관리자' : '👤 나'}
                    </ReplyAuthor>
                    <ReplyDate>{formatDate(reply.created_at)}</ReplyDate>
                  </ReplyHeader>
                  <ReplyContent>{reply.content}</ReplyContent>
                </ReplyItem>
              ))}
            </RepliesSection>
          )}
        </>
      )}
    </Container>
  );
};

export default SupportInquiryDetailPage;
