import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { getAdminSupportInquiry, addAdminSupportReply } from '../../services/api.ts';

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
  }
`;

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
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
  padding: 4px;
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

const InquiryTitleText = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
`;

const InquiryMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return `
          background: #fef3c7;
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
          background: #f3f4f6;
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

const UserInfo = styled.div`
  font-size: 14px;
  color: #6b7280;
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
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
`;

const ReplyItem = styled.div<{ $isAdmin?: boolean }>`
  background: ${props => props.$isAdmin ? '#f0f8ff' : '#fff5f5'};
  border: 1px solid ${props => props.$isAdmin ? '#bee3f8' : '#fecaca'};
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
  color: ${props => props.$isAdmin ? '#1e40af' : '#dc2626'};
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

const ActionSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;



const ReplyForm = styled.form``;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 14px;
  min-height: 120px;
  resize: vertical;
  transition: border-color 0.2s ease;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #e74c3c;
  }
`;

const ErrorMessage = styled.span`
  display: block;
  color: #e74c3c;
  font-size: 12px;
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  ${props => props.variant === 'primary' ? `
    background: #667eea;
    color: white;
    
    &:hover:not(:disabled) {
      background: #5a67d8;
    }
    
    &:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
    }
  ` : `
    background: #f7fafc;
    color: #4a5568;
    border: 1px solid #e2e8f0;
    
    &:hover {
      background: #edf2f7;
    }
  `}
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

// ===================================
// 인터페이스
// ===================================

interface AdminSupportDetailPageProps {
  sidebarOpen?: boolean;
}

interface ReplyFormData {
  content: string;
}

interface SupportInquiry {
  id: number;
  title: string;
  content: string;
  category: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
  };
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
// 메인 컴포넌트
// ===================================

const AdminSupportDetailPage: React.FC<AdminSupportDetailPageProps> = ({ sidebarOpen = true }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [inquiry, setInquiry] = useState<SupportInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReplyFormData>();

  const loadInquiry = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await getAdminSupportInquiry(parseInt(id));
      setInquiry(response.data);
    } catch (error: any) {
      console.error('문의 상세 조회 오류:', error);
      toast.error('문의 내용을 불러오는데 실패했습니다.');
      navigate('/admin/support');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiry();
  }, [id]);

  const onSubmit = async (data: ReplyFormData) => {
    if (!inquiry) return;

    try {
      setIsSubmitting(true);
      await addAdminSupportReply(inquiry.id, data.content.trim());
      toast.success('답변이 등록되었습니다.');
      reset();
      loadInquiry(); // 새로고침
    } catch (error: any) {
      console.error('답변 등록 오류:', error);
      toast.error(error.response?.data?.message || '답변 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleBack = () => {
    navigate('/admin/support');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '답변 대기';
      case 'completed': return '답변 완료';
      case 'closed': return '종료';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container $sidebarOpen={sidebarOpen}>
        <Content>
          <LoadingSpinner />
        </Content>
      </Container>
    );
  }

  if (!inquiry) {
    return (
      <Container $sidebarOpen={sidebarOpen}>
        <Content>
          <div>문의를 찾을 수 없습니다.</div>
        </Content>
      </Container>
    );
  }

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Header>
          <BackButton onClick={handleBack}>←</BackButton>
          <Title>문의 상세</Title>
        </Header>

        <InquiryCard>
          <InquiryHeader>
            <InquiryTitleText>{inquiry.title}</InquiryTitleText>
            <InquiryMeta>
              <CategoryBadge>{inquiry.category}</CategoryBadge>
              <StatusBadge status={inquiry.status}>
                {getStatusText(inquiry.status)}
              </StatusBadge>
              <UserInfo>
                {inquiry.user?.email || '알 수 없는 사용자'}
              </UserInfo>
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
                    {reply.is_admin_reply ? '👨‍💼 관리자' : '👤 사용자'}
                  </ReplyAuthor>
                  <ReplyDate>{formatDate(reply.created_at)}</ReplyDate>
                </ReplyHeader>
                <ReplyContent>{reply.content}</ReplyContent>
              </ReplyItem>
            ))}
          </RepliesSection>
        )}

        <ActionSection>
          <SectionTitle>🔧 관리자 작업</SectionTitle>
          


          <SectionTitle>✍️ 답변 작성</SectionTitle>
          <ReplyForm onSubmit={handleSubmit(onSubmit)}>
            <FormGroup>
              <Label>답변 내용</Label>
              <Textarea
                {...register('content', {
                  required: '답변 내용을 입력해주세요.',
                  minLength: {
                    value: 10,
                    message: '10자 이상 입력해주세요.'
                  }
                })}
                placeholder="사용자에게 전달할 답변을 입력해주세요..."
                className={errors.content ? 'error' : ''}
              />
              {errors.content && <ErrorMessage>{errors.content.message}</ErrorMessage>}
            </FormGroup>
            
            <ButtonGroup>
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => reset()}
              >
                초기화
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                disabled={isSubmitting}
              >
                {isSubmitting ? '등록 중...' : '답변 등록 (자동 완료처리)'}
              </Button>
            </ButtonGroup>
          </ReplyForm>
        </ActionSection>
      </Content>
    </Container>
  );
};

export default AdminSupportDetailPage;
