import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { authApi } from '../../services/api.ts';
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';

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

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
`;

const PasswordInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  padding-right: 45px;
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
  
  &.success {
    border-color: #2ecc40;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 1.1rem;
  
  &:hover {
    color: #333;
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

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 0.8rem;
`;

const SuccessMessage = styled.span`
  color: #2ecc40;
  font-size: 0.8rem;
`;

const InfoMessage = styled.div`
  background: #e8f4fd;
  border: 1px solid #bee5eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #0c5460;
  font-size: 0.9rem;
  line-height: 1.4;
`;

interface FormData {
  password: string;
  confirmPassword: string;
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const password = watch('password');

  useEffect(() => {
    // 세션 스토리지에서 이메일과 토큰 가져오기
    const resetEmail = sessionStorage.getItem('resetEmail');
    const token = sessionStorage.getItem('resetToken');
    
    if (!resetEmail || !token) {
      toast.error('잘못된 접근입니다.');
      navigate('/forgot-password');
      return;
    }
    
    setEmail(resetEmail);
    setResetToken(token);
  }, [navigate]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authApi.resetPassword(email, resetToken, data.password);
      
      // 세션 스토리지 정리
      sessionStorage.removeItem('resetEmail');
      sessionStorage.removeItem('resetToken');
      
      toast.success('비밀번호가 성공적으로 변경되었습니다!');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !resetToken) {
    return null; // 로딩 중이거나 리다이렉트 중
  }

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/reset-password-verify')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>새 비밀번호 설정</Title>
        
        <InfoMessage>
          새로운 비밀번호를 입력해주세요.<br />
          비밀번호는 8자 이상이어야 합니다.
        </InfoMessage>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label>새 비밀번호</Label>
            <PasswordInputWrapper>
              <Input
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: '비밀번호를 입력해주세요.',
                  minLength: {
                    value: 8,
                    message: '비밀번호는 8자 이상이어야 합니다.',
                  },
                })}
                className={errors.password ? 'error' : password && password.length >= 8 ? 'success' : ''}
                placeholder="새 비밀번호를 입력하세요"
              />
              <ToggleButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </PasswordInputWrapper>
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
            {password && password.length >= 8 && !errors.password && (
              <SuccessMessage>사용 가능한 비밀번호입니다.</SuccessMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label>비밀번호 확인</Label>
            <PasswordInputWrapper>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword', {
                  required: '비밀번호 확인을 입력해주세요.',
                  validate: (value) =>
                    value === password || '비밀번호가 일치하지 않습니다.',
                })}
                className={errors.confirmPassword ? 'error' : watch('confirmPassword') && watch('confirmPassword') === password ? 'success' : ''}
                placeholder="비밀번호를 다시 입력하세요"
              />
              <ToggleButton
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </PasswordInputWrapper>
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>}
            {watch('confirmPassword') && watch('confirmPassword') === password && !errors.confirmPassword && (
              <SuccessMessage>비밀번호가 일치합니다.</SuccessMessage>
            )}
          </FormGroup>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default ResetPasswordPage;


