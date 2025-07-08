import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const LandingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 20px;
`;

const Logo = styled.div`
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  margin-bottom: 3rem;
  max-width: 600px;
  line-height: 1.6;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
  
  background: ${props => props.$primary ? 'white' : 'transparent'};
  color: ${props => props.$primary ? '#667eea' : 'white'};
  border: 2px solid white;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Features = styled.div`
  margin-top: 4rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  width: 100%;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    margin-top: 2rem;
  }
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }
  
  p {
    line-height: 1.6;
    opacity: 0.9;
  }
`;

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <LandingContainer>
      <Logo>울산 사내 솔로 공모</Logo>
      <Subtitle>
        현대자동차(울산) 사내 만남을 위한 플랫폼입니다.<br />
        사진교환, 얼평은 이제 그만! 진심으로 만나요.
      </Subtitle>
      
      <ButtonContainer>
        <Button onClick={() => navigate('/login')}>
          로그인
        </Button>
        <Button $primary onClick={() => navigate('/register')}>
          회원가입
        </Button>
      </ButtonContainer>
      
      <Features>
        <FeatureCard>
          <h3>🔒 안전한 만남</h3>
          <p>100% 사내 메일을 통해 인증 받은 현대차 임직원만을 위한 확실한 만남을 경험하세요.</p>
        </FeatureCard>
        
        <FeatureCard>
          <h3>🎯 취향 저격</h3>
          <p>서로의 취향과 선호도를 반영하여 최적의 매칭을 제공합니다.</p>
        </FeatureCard>
        
        <FeatureCard>
          <h3>💝 특별한 경험</h3>
          <p>사진 공개 없이 진심어린 소통으로 검증된 동료들과의 새로운 인연을 만들어보세요.</p>
        </FeatureCard>
      </Features>
    </LandingContainer>
  );
};

export default LandingPage; 