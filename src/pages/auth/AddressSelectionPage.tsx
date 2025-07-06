import React, { useState, useEffect } from 'react';
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

const AddressSelectionPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<{ residence: string }>({
    mode: 'onChange'
  });

  const watchedResidence = watch('residence');

  useEffect(() => {
    const savedResidence = sessionStorage.getItem('userResidence');
    if (savedResidence) setValue('residence', savedResidence);
  }, [setValue]);

  const onSubmit = (data: { residence: string }) => {
    sessionStorage.setItem('userResidence', data.residence);
    navigate('/register/nickname');
  };

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/nickname')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>주소 선택</Title>
        <Description>
          거주 지역을 입력해주세요.<br />
          시,군,구 단위로 입력하시면 됩니다.
        </Description>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Input
            type="text"
            {...register('residence', {
              required: '주소를 입력해주세요.',
              minLength: {
                value: 2,
                message: '주소는 최소 2자 이상이어야 합니다.',
              },
              maxLength: {
                value: 50,
                message: '주소는 최대 50자까지 가능합니다.',
              },
            })}
            className={errors.residence ? 'error' : ''}
            placeholder="예: 서울시 강남구, 경기도 성남시 분당구"
            maxLength={50}
          />
          {errors.residence && <ErrorMessage>{errors.residence.message}</ErrorMessage>}
          
          <Button type="submit" disabled={!isValid || !watchedResidence}>
            다음
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default AddressSelectionPage; 