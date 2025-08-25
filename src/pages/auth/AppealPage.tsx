import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { authApi } from '../../services/api.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
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
  width: 100%;
  max-width: 95vw;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  margin: 0 auto;
  @media (min-width: 600px) {
    max-width: 600px;
  }
  @media (min-width: 900px) {
    max-width: 800px;
  }
  @media (min-width: 1200px) {
    max-width: 1000px;
  }
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
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingText = styled.div`
  text-align: center;
  color: #666;
  margin-top: 1rem;
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

const AppealPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appeal, setAppeal] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ appeal: string }>();

  useEffect(() => {
    const savedAppeal = sessionStorage.getItem('userAppeal');
    if (savedAppeal) setAppeal(savedAppeal);
  }, []);

  const onSubmit = async (data: { appeal: string }) => {
    setIsSubmitting(true);
    
    try {
      sessionStorage.setItem('userAppeal', data.appeal);
      // sessionStorage에서 모든 데이터 수집
      const email = sessionStorage.getItem('userEmail');
      const password = sessionStorage.getItem('userPassword');
      const company = sessionStorage.getItem('userCompany');
      const birthYear = sessionStorage.getItem('userBirthYear');
      const gender = sessionStorage.getItem('userGender');
      const height = sessionStorage.getItem('userHeight');
      const residence = sessionStorage.getItem('userResidence');
      const maritalStatus = sessionStorage.getItem('userMaritalStatus');
      const nickname = sessionStorage.getItem('userNickname');
      const profileDataStr = sessionStorage.getItem('userProfileData');
      const preferencesStr = sessionStorage.getItem('userPreferences');
      
      // 디버깅: 모든 sessionStorage 값 출력
      // console.log('=== 회원가입 디버깅 ===');
      // console.log('email:', email);
      // console.log('password:', password ? '***' : 'null');
      // console.log('company:', company);
      // console.log('birthYear:', birthYear);
      // console.log('gender:', gender);
      // console.log('height:', height);
      // console.log('residence:', residence);
      // console.log('maritalStatus:', maritalStatus);
      // console.log('nickname:', nickname);
      // console.log('profileDataStr:', profileDataStr);
      // console.log('preferencesStr:', preferencesStr);
      // console.log('=== 디버깅 끝 ===');
      
      // 필수 데이터 검증
      if (!email || !password || !birthYear || !gender || !nickname) {
        // console.log('=== 필수 데이터 누락 ===');
        // console.log('email 누락:', !email);
        // console.log('password 누락:', !password);
        // console.log('birthYear 누락:', !birthYear);
        // console.log('gender 누락:', !gender);
        // console.log('nickname 누락:', !nickname);
        toast.error('필수 정보가 누락되었습니다. 처음부터 다시 시작해주세요.');
        navigate('/register');
        return;
      }
      
      // 프로필 데이터 파싱
      const profileData = profileDataStr ? JSON.parse(profileDataStr) : { selected: {} };
      
      // 선호도 데이터 파싱
      const preferences = preferencesStr ? JSON.parse(preferencesStr) : {};
      
      // 약관 동의 정보 가져오기
      const termsAgreementStr = sessionStorage.getItem('termsAgreement');
      const termsAgreement = termsAgreementStr ? JSON.parse(termsAgreementStr) : null;
      
      if (!termsAgreement) {
        toast.error('약관 동의 정보가 없습니다. 회원가입을 다시 시작해주세요.');
        navigate('/register');
        return;
      }

      // 통합 회원가입 API 호출
      const result = await authApi.registerComplete({
        email,
        password,
        nickname,
        gender,
        birthYear: parseInt(birthYear),
        height: height ? parseInt(height) : undefined,
        residence: residence || undefined,
        company: company || undefined,
        maritalStatus: maritalStatus || undefined,
        jobType: profileData.jobType || undefined,
        appeal: data.appeal,
        profileData,
        preferences,
        termsAgreement
      });
      
      // 성공 시 sessionStorage 정리 및 토큰 저장
      sessionStorage.clear();
      localStorage.setItem('token', result.token);
      
      // 자동 로그인 처리
      try {
        await login({ email, password });
        toast.success('회원가입이 완료되었습니다! 메인페이지로 이동합니다.');
        navigate('/main');
      } catch (loginError) {
        console.error('자동 로그인 실패:', loginError);
        // 자동 로그인 실패 시에도 토큰이 있으므로 메인페이지로 이동
        toast.success('회원가입이 완료되었습니다!');
        navigate('/main');
      }
      
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      const errorMessage = error.response?.data?.error || '회원가입 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // form validation 에러 발생 시 토스트로 안내
  const onError = (formErrors: any) => {
    if (formErrors.appeal && formErrors.appeal.message) {
      toast.error(formErrors.appeal.message);
    }
  };

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/nickname')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>자기소개</Title>
        <Form onSubmit={handleSubmit(onSubmit, onError)}>
          <Textarea
            value={appeal}
            {...register('appeal', {
              required: '자기소개를 입력해주세요.',
              maxLength: {
                value: 100,
                message: '100자 이내로 입력해주세요.',
              },
              onChange: e => {
                setAppeal(e.target.value);
                sessionStorage.setItem('userAppeal', e.target.value);
              }
            })}
            placeholder="100자 이내로 자기소개를 작성해주세요..."
            disabled={isSubmitting}
          />
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '가입 완료'}
          </Button>
          
          {isSubmitting && (
            <LoadingText>
              회원가입을 진행하고 있습니다. 잠시만 기다려주세요...
            </LoadingText>
          )}
        </Form>
      </Card>
    </Container>
  );
};

export default AppealPage; 