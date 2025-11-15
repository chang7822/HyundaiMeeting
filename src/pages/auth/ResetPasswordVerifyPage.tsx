import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { authApi } from '../../services/api.ts';
import { FaArrowLeft } from 'react-icons/fa';

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

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  text-align: center;
  letter-spacing: 2px;
  margin-bottom: 1rem;
  
  &:focus {
    outline: none;
    border-color: #667eea;
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
  width: 100%;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
  margin-top: 0.5rem;
  
  &:hover {
    background: #f7f7fa;
    color: #764ba2;
  }
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  border: 2px solid #667eea;
  color: #667eea;
  font-size: 1.8rem;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s, color 0.2s, border 0.2s;
  &:hover {
    background: #667eea;
    color: #fff;
    border: 2px solid #667eea;
  }
`;

const SuccessMessage = styled.div`
  color: #27ae60;
  background: #d5f4e6;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const ResetPasswordVerifyPage = () => {
  const navigate = useNavigate();
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // 세션 스토리지에서 이메일 가져오기
    const resetEmail = sessionStorage.getItem('resetEmail');
    if (!resetEmail) {
      toast.error('잘못된 접근입니다.');
      navigate('/forgot-password');
      return;
    }
    setEmail(resetEmail);
  }, [navigate]);

  const handleVerificationSubmit = async () => {
    if (!verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await authApi.verifyResetCode(email, verificationCode);
      // 재설정 토큰을 세션 스토리지에 저장
      sessionStorage.setItem('resetToken', response.resetToken);
      toast.success('인증이 완료되었습니다!');
      navigate('/reset-password');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '인증번호가 올바르지 않습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await authApi.forgotPassword(email);
      toast.success('인증번호가 재발송되었습니다.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '재발송에 실패했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null; // 로딩 중이거나 리다이렉트 중
  }

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/forgot-password')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>인증번호 입력</Title>
        
        <SuccessMessage>
          {email}로 인증번호를 발송했습니다.<br />
          메일함을 확인하여 인증번호를 입력해주세요.<br />
          인증번호는 30분간 유효합니다.
        </SuccessMessage>
        
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
        
        <SecondaryButton
          onClick={handleResendCode}
          disabled={isResending}
        >
          {isResending ? '재발송 중...' : '인증번호 재발송'}
        </SecondaryButton>
      </Card>
    </Container>
  );
};

export default ResetPasswordVerifyPage;


