import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';

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

const Textarea = styled.textarea`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  min-height: 120px;
  resize: vertical;
  
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

const AppealPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ appeal: string }>();

  const onSubmit = (data: { appeal: string }) => {
    // 자기소개를 세션에 저장하고 회원가입 완료
    sessionStorage.setItem('userAppeal', data.appeal);
    // TODO: 실제 회원가입 API 호출
    alert('회원가입이 완료되었습니다!');
    navigate('/main');
  };

  return (
    <Container>
      <Card>
        <Title>자기소개</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Textarea
            {...register('appeal', {
              required: '자기소개를 입력해주세요.',
              maxLength: {
                value: 100,
                message: '100자 이내로 입력해주세요.',
              },
            })}
            placeholder="100자 이내로 자기소개를 작성해주세요..."
          />
          
          <Button type="submit">
            가입 완료
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default AppealPage; 