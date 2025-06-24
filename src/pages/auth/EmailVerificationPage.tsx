import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { authApi } from '../../services/api.ts';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const Card = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #e74c3c;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  margin-top: 1rem;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const VerificationSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e1e5e9;
`;

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

const SuccessMessage = styled.div`
  color: #27ae60;
  background: #d5f4e6;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
`;

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>();

  const onSubmit = async (data: { email: string }) => {
    setIsLoading(true);
    try {
      sessionStorage.setItem('userEmail', data.email);
      await authApi.verifyEmail(data.email);
      setIsVerificationSent(true);
      toast.success('인증 메일이 발송되었습니다!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '이메일 발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    try {
      const email = sessionStorage.getItem('userEmail') || '';
      await authApi.confirmVerification(email, verificationCode);
      toast.success('이메일 인증이 완료되었습니다!');
      navigate('/register/password');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '인증번호가 올바르지 않습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Container>
      <Card>
        <Title>이메일 인증</Title>
        
        {!isVerificationSent ? (
          <Form onSubmit={handleSubmit(onSubmit)}>
            <Input
              type="email"
              {...register('email', {
                required: '이메일을 입력해주세요.',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '올바른 이메일 형식을 입력해주세요.',
                },
              })}
              className={errors.email ? 'error' : ''}
              placeholder="회사 이메일을 입력하세요"
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '발송 중...' : '인증 메일 발송'}
            </Button>
          </Form>
        ) : (
          <div>
            <SuccessMessage>
              인증 메일이 발송되었습니다!<br />
              메일함을 확인하여 인증번호를 입력해주세요.
            </SuccessMessage>
            
            <VerificationSection>
              <Input
                type="text"
                placeholder="인증번호 6자리를 입력하세요"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
              
              <Button 
                onClick={handleVerificationSubmit}
                disabled={isVerifying || !verificationCode}
              >
                {isVerifying ? '인증 중...' : '인증 확인'}
              </Button>
              
              <Button 
                onClick={() => setIsVerificationSent(false)}
                style={{ 
                  background: 'transparent', 
                  color: '#667eea', 
                  border: '2px solid #667eea',
                  marginTop: '0.5rem'
                }}
              >
                이메일 다시 입력
              </Button>
            </VerificationSection>
          </div>
        )}
      </Card>
    </Container>
  );
};

export default EmailVerificationPage; 