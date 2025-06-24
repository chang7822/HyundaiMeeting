import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const RegisterCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
  text-align: center;
  
  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 1rem;
  font-size: 2rem;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const StartButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  margin-bottom: 1rem;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const BackButton = styled.button`
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #667eea;
    color: white;
  }
`;

const InfoBox = styled.div`
  background: #f8f9fa;
  border-radius: 10px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: left;
  
  h3 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  li {
    color: #666;
    margin-bottom: 0.5rem;
    padding-left: 1.5rem;
    position: relative;
    
    &:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #28a745;
      font-weight: bold;
    }
  }
`;

const RegisterPage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/register/company');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <RegisterContainer>
      <RegisterCard>
        <Title>회원가입</Title>
        <Subtitle>
          현대차 만남 플랫폼에 오신 것을 환영합니다!<br />
          진심어린 만남을 위한 특별한 여정을 시작해보세요.
        </Subtitle>
        
        <InfoBox>
          <h3>회원가입 절차</h3>
          <ul>
            <li>회사 선택 및 이메일 인증</li>
            <li>비밀번호 설정</li>
            <li>기본 정보 입력</li>
            <li>프로필 설정</li>
            <li>주소 및 선호도 설정</li>
            <li>자기소개 작성</li>
          </ul>
        </InfoBox>
        
        <StartButton onClick={handleStart}>
          회원가입 시작하기
        </StartButton>
        
        <BackButton onClick={handleBack}>
          뒤로 가기
        </BackButton>
      </RegisterCard>
    </RegisterContainer>
  );
};

export default RegisterPage; 