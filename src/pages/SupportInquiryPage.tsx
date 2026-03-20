import React, { useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createSupportInquiry } from '../services/api';

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
    padding-top: var(--mobile-top-padding, 80px);
  }
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  line-height: 1.5;
`;

const Form = styled.form`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
`;

const Required = styled.span`
  color: #e74c3c;
  margin-left: 4px;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #e74c3c;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  min-height: 150px;
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
  font-size: 14px;
  margin-top: 6px;
`;

const CharCount = styled.div`
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 30px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  ${props => props.$variant === 'primary' ? `
    background: #667eea;
    color: white;
    
    &:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-1px);
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

const InfoBox = styled.div`
  background: #f0f8ff;
  border: 1px solid #bee3f8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #2b6cb0;
  margin-bottom: 8px;
`;

const InfoList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: #2c5aa0;
  
  li {
    margin-bottom: 4px;
    font-size: 14px;
  }
`;

// ===================================
// 인터페이스
// ===================================

interface InquiryFormData {
  category: string;
  title: string;
  content: string;
}

interface SupportInquiryPageProps {
  sidebarOpen?: boolean;
}

// ===================================
// 컴포넌트
// ===================================

const SupportInquiryPage: React.FC<SupportInquiryPageProps> = ({ sidebarOpen = true }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<InquiryFormData>({
    defaultValues: {
      category: '일반문의',
      title: '',
      content: ''
    }
  });

  const watchedTitle = watch('title', '');
  const watchedContent = watch('content', '');

  const onSubmit = async (data: InquiryFormData) => {
    try {
      setIsSubmitting(true);
      
      await createSupportInquiry({
        title: data.title.trim(),
        content: data.content.trim(),
        category: data.category
      });
      
      toast.success('문의가 성공적으로 등록되었습니다!');
      navigate('/support/my-inquiries');
      
    } catch (error: any) {
      console.error('문의 등록 오류:', error);
      toast.error(error.response?.data?.message || '문의 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Header>
        <Title>고객센터 문의하기</Title>
        <Subtitle>
          궁금한 점이나 문제가 있으시면 언제든지 문의해주세요. 
          빠른 시일 내에 답변드리겠습니다.
        </Subtitle>
      </Header>

      <InfoBox>
        <InfoTitle>📋 문의 전 확인사항</InfoTitle>
        <InfoList>
          <li>자주 묻는 질문(FAQ)을 먼저 확인해보세요</li>
          <li>구체적인 상황을 상세히 설명해주시면 더 정확한 답변을 받으실 수 있습니다</li>
          <li>평일 기준 1-2일 내에 답변드립니다</li>
        </InfoList>
      </InfoBox>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Label>
            문의 유형<Required>*</Required>
          </Label>
          <Select {...register('category', { required: '문의 유형을 선택해주세요.' })}>
            <option value="일반문의">일반문의</option>
            <option value="기술문의">기술문의</option>
            <option value="계정문의">계정문의</option>
            <option value="매칭문의">매칭문의</option>
            <option value="신고문의">신고문의</option>
            <option value="기타">기타</option>
          </Select>
          {errors.category && <ErrorMessage>{errors.category.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>
            제목<Required>*</Required>
          </Label>
          <Input
            {...register('title', {
              required: '제목을 입력해주세요.',
              maxLength: {
                value: 200,
                message: '제목은 200자 이내로 입력해주세요.'
              }
            })}
            placeholder="문의 제목을 입력해주세요"
            className={errors.title ? 'error' : ''}
          />
          <CharCount>{watchedTitle.length}/200</CharCount>
          {errors.title && <ErrorMessage>{errors.title.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>
            문의 내용<Required>*</Required>
          </Label>
          <Textarea
            {...register('content', {
              required: '문의 내용을 입력해주세요.',
              minLength: {
                value: 10,
                message: '문의 내용은 10자 이상 입력해주세요.'
              }
            })}
            placeholder="문의하실 내용을 자세히 작성해주세요.&#10;&#10;• 발생한 문제나 상황을 구체적으로 설명해주세요&#10;• 오류 메시지가 있다면 정확히 입력해주세요&#10;• 문제가 발생한 시점이나 상황을 알려주세요"
            className={errors.content ? 'error' : ''}
          />
          <CharCount>{watchedContent.length}자</CharCount>
          {errors.content && <ErrorMessage>{errors.content.message}</ErrorMessage>}
        </FormGroup>

        <ButtonGroup>
          <Button type="button" $variant="secondary" onClick={handleCancel}>
            취소
          </Button>
          <Button 
            type="submit" 
            $variant="primary" 
            disabled={isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '문의 등록'}
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  );
};

export default SupportInquiryPage;
