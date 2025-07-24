import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { FaArrowLeft, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

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
  @media (max-width: 600px) {
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
  }
`;

const PasswordSetupPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<{ password: string; confirmPassword: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const isMatch = !!confirmPassword && password === confirmPassword;
  const isNotMatch = !!confirmPassword && password !== confirmPassword;

  const onSubmit = (data: { password: string; confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    // 디버깅: 비밀번호 저장 확인
    // console.log('=== 비밀번호 저장 디버깅 ===');
    // console.log('저장할 비밀번호 길이:', data.password.length);
    
    // 비밀번호를 세션에 저장하고 다음 단계로 이동
    sessionStorage.setItem('userPassword', data.password);
    sessionStorage.setItem('userPasswordConfirm', data.confirmPassword);
    
    // 저장 확인
    const savedPassword = sessionStorage.getItem('userPassword');
    // console.log('저장된 비밀번호 길이:', savedPassword ? savedPassword.length : 0);
    // console.log('=== 비밀번호 저장 완료 ===');
    
    navigate('/register/required-info');
  };

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/email-verification')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>비밀번호 설정</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ position: 'relative' }}>
            <Input
              type={showPassword ? 'text' : 'password'}
              {...register('password', {
                required: '비밀번호를 입력해주세요.',
                minLength: {
                  value: 6,
                  message: '비밀번호는 최소 6자 이상이어야 합니다.',
                },
              })}
              placeholder="비밀번호를 입력하세요"
              style={{ paddingRight: 40 }}
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
          {errors.password && <span style={{ color: '#e74c3c', fontSize: '0.9rem' }}>{errors.password.message}</span>}
          <div style={{ position: 'relative' }}>
            <Input
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword', {
                required: '비밀번호 확인을 입력해주세요.',
              })}
              placeholder="비밀번호 확인을 입력하세요"
              style={{
                paddingRight: 40,
                borderColor: isMatch ? '#27ae60' : isNotMatch ? '#e74c3c' : undefined
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
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
              aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
            {isMatch && <FaCheckCircle style={{ position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)', color: '#27ae60' }} />}
            {isNotMatch && <FaTimesCircle style={{ position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)', color: '#e74c3c' }} />}
          </div>
          {errors.confirmPassword && <span style={{ color: '#e74c3c', fontSize: '0.9rem' }}>{errors.confirmPassword.message}</span>}
          <Button type="submit">
            다음
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default PasswordSetupPage; 