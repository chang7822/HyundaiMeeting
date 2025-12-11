import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { LoginCredentials } from '../../types/index.ts';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const LoginCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  
  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
  font-size: 1.8rem;
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

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

const CapsLockWarning = styled.div`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #856404;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: "⚠️";
    font-size: 0.9rem;
  }
`;

const LoginButton = styled.button`
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

const RegisterLink = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  color: #666;
  
  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  // Caps Lock 감지 함수
  const checkCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const key = event.key;
    const isCapsLock = event.getModifierState && event.getModifierState('CapsLock');
    
    // 알파벳 키를 눌렀을 때만 Caps Lock 상태 확인
    if (/^[a-zA-Z]$/.test(key)) {
      setIsCapsLockOn(isCapsLock);
    }
  };

  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);
    try {
      const result = await login(data);
      const nickname = result?.profile?.nickname || result?.user?.nickname;
      if (nickname) {
        toast.success(`${nickname}님, 환영합니다!`);
      } else {
        toast.success('로그인되었습니다!');
      }
      navigate('/main');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>로그인</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label>이메일</Label>
            <Input
              type="email"
              autoComplete="email"
              {...register('email', {
                required: '이메일을 입력해주세요.',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '올바른 이메일 형식을 입력해주세요.',
                },
              })}
              className={errors.email ? 'error' : ''}
              placeholder="이메일을 입력하세요"
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label>비밀번호</Label>
            <div style={{ position: 'relative' }}>
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password', {
                  required: '비밀번호를 입력해주세요.',
                  minLength: {
                    value: 6,
                    message: '비밀번호는 최소 6자 이상이어야 합니다.',
                  },
                })}
                className={errors.password ? 'error' : ''}
                placeholder="비밀번호를 입력하세요"
                style={{ paddingRight: 40 }}
                onKeyDown={checkCapsLock}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  margin: 0
                }}
                tabIndex={-1}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
            {isCapsLockOn && (
              <CapsLockWarning>
                Caps Lock이 켜져있습니다.
              </CapsLockWarning>
            )}
          </FormGroup>

          <LoginButton type="submit" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </LoginButton>
        </Form>

        <RegisterLink>
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </RegisterLink>
        
        <RegisterLink style={{ marginTop: '0.5rem' }}>
          비밀번호를 잊으셨나요? <Link to="/forgot-password">비밀번호 찾기</Link>
        </RegisterLink>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage; 