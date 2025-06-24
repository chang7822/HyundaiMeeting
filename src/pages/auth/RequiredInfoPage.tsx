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

const Select = styled.select`
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

const RequiredInfoPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ birthYear: number; gender: 'male' | 'female' }>();

  const onSubmit = (data: { birthYear: number; gender: 'male' | 'female' }) => {
    // 데이터를 세션에 저장하고 다음 단계로 이동
    sessionStorage.setItem('userBirthYear', data.birthYear.toString());
    sessionStorage.setItem('userGender', data.gender);
    navigate('/register/profile');
  };

  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({ length: 50 }, (_, i) => currentYear - 20 - i);

  return (
    <Container>
      <Card>
        <Title>필수 정보 입력</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Select {...register('birthYear', { required: '출생연도를 선택해주세요.' })}>
            <option value="">출생연도 선택</option>
            {birthYears.map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </Select>
          
          <Select {...register('gender', { required: '성별을 선택해주세요.' })}>
            <option value="">성별 선택</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </Select>
          
          <Button type="submit">
            다음
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default RequiredInfoPage; 