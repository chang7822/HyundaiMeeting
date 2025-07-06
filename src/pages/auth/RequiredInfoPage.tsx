import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
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
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Select = styled.select<{ hasError?: boolean }>`
  width: 100%;
  padding: 12px;
  border: 2px solid ${props => props.hasError ? '#e74c3c' : '#e1e5e9'};
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#e74c3c' : '#667eea'};
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

const RequiredInfoPage = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<{ birthYear: number; gender: 'male' | 'female' }>({
    mode: 'onChange'
  });

  const watchedBirthYear = watch('birthYear');
  const watchedGender = watch('gender');

  useEffect(() => {
    const savedBirthYear = sessionStorage.getItem('userBirthYear');
    if (savedBirthYear) setValue('birthYear', Number(savedBirthYear), { shouldValidate: true, shouldDirty: true });
    const savedGender = sessionStorage.getItem('userGender');
    if (savedGender) setValue('gender', savedGender as 'male' | 'female', { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  const onSubmit = (data: { birthYear: number; gender: 'male' | 'female' }) => {
    // 추가 유효성 검사
    if (!data.birthYear || !data.gender) {
      toast.error('출생연도와 성별을 모두 선택해주세요.');
      return;
    }

    // 출생연도 유효성 검사 (19세 이상)
    const currentYear = new Date().getFullYear();
    const age = currentYear - data.birthYear;
    if (age < 19) {
      toast.error('만 19세 이상만 가입 가능합니다.');
      return;
    }

    // 디버깅: 필수 정보 저장 확인
    console.log('=== 필수 정보 저장 디버깅 ===');
    console.log('저장할 birthYear:', data.birthYear);
    console.log('저장할 gender:', data.gender);

    // 데이터를 세션에 저장하고 다음 단계로 이동
    sessionStorage.setItem('userBirthYear', data.birthYear.toString());
    sessionStorage.setItem('userGender', data.gender);
    
    // 저장 확인
    const savedBirthYear = sessionStorage.getItem('userBirthYear');
    const savedGender = sessionStorage.getItem('userGender');
    console.log('저장된 birthYear:', savedBirthYear);
    console.log('저장된 gender:', savedGender);
    console.log('=== 필수 정보 저장 완료 ===');
    
    toast.success('정보가 저장되었습니다.');
    navigate('/register/profile');
  };

  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({ length: 50 }, (_, i) => currentYear - 19 - i);

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/password')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>필수 정보 입력</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Select 
              {...register('birthYear', { 
                required: '출생연도를 선택해주세요.',
                validate: value => value > 0 || '출생연도를 선택해주세요.'
              })}
              hasError={!!errors.birthYear}
            >
              <option value="">출생연도 선택</option>
              {birthYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </Select>
            {errors.birthYear && <ErrorMessage>{errors.birthYear.message}</ErrorMessage>}
          </div>
          
          <div>
            <Select 
              {...register('gender', { 
                required: '성별을 선택해주세요.',
                validate: value => value === 'male' || value === 'female' || '성별을 선택해주세요.'
              })}
              hasError={!!errors.gender}
            >
              <option value="">성별 선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </Select>
            {errors.gender && <ErrorMessage>{errors.gender.message}</ErrorMessage>}
          </div>
          
          <Button type="submit" disabled={!isValid || !watchedBirthYear || !watchedGender}>
            다음
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default RequiredInfoPage; 