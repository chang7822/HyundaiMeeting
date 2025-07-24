import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
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
  margin-bottom: 1rem;
`;

const Description = styled.p`
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
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

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.25rem;
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
  @media (max-width: 600px) {
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
  }
`;

const NicknameSetupPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<{ nickname: string }>();

  useEffect(() => {
    const savedNickname = sessionStorage.getItem('userNickname');
    if (savedNickname) setValue('nickname', savedNickname);
  }, [setValue]);

  const onSubmit = (data: { nickname: string }) => {
    try {
      // console.log('=== 닉네임 저장 디버깅 ===');
      // console.log('저장할 닉네임:', data.nickname);
      
      // 세션에 저장
      sessionStorage.setItem('userNickname', data.nickname);
      
      // 저장 확인
      const savedNickname = sessionStorage.getItem('userNickname');
      // console.log('저장된 닉네임:', savedNickname);
      // console.log('=== 닉네임 저장 완료 ===');
    } catch (error) {
      console.error('Error saving nickname:', error);
    }
    
    navigate('/register/appeal');
  };

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/preference')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>닉네임 설정</Title>
        <Description>
          다른 사용자들에게 보여질 닉네임을 설정해주세요.<br />
          한 번 설정하면 변경이 어려우니 신중하게 선택해주세요.
        </Description>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Input
            type="text"
            {...register('nickname', {
              required: '닉네임을 입력해주세요.',
              minLength: {
                value: 2,
                message: '닉네임은 최소 2자 이상이어야 합니다.',
              },
              maxLength: {
                value: 10,
                message: '닉네임은 최대 10자까지 가능합니다.',
              },
              pattern: {
                value: /^[가-힣a-zA-Z0-9]+$/,
                message: '한글, 영문, 숫자만 사용 가능합니다.',
              },
            })}
            className={errors.nickname ? 'error' : ''}
            placeholder="닉네임을 입력하세요 (2-10자)"
            maxLength={10}
          />
          {errors.nickname && <ErrorMessage>{errors.nickname.message}</ErrorMessage>}
          
          <Button type="submit">
            다음
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default NicknameSetupPage; 