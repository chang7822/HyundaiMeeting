import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext.tsx';
import { FaHeart, FaComments, FaUser, FaCalendarAlt } from 'react-icons/fa';

const MainContainer = styled.div`
  margin-left: 280px;
  padding: 2rem;
  min-height: 100vh;
  background: #f8f9fa;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: 80px;
  }
`;

const WelcomeSection = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const WelcomeTitle = styled.h1`
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const WelcomeSubtitle = styled.p`
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ActionCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  }
`;

const ActionIcon = styled.div`
  font-size: 2rem;
  color: #667eea;
  margin-bottom: 1rem;
`;

const ActionTitle = styled.h3`
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
`;

const ActionDescription = styled.p`
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const MatchingButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1.1rem;
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

const MainPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleMatchingRequest = () => {
    navigate('/matching');
  };

  const quickActions = [
    {
      icon: <FaHeart />,
      title: '매칭 신청',
      description: '새로운 만남을 위한 매칭을 신청해보세요.',
      action: () => navigate('/matching')
    },
    {
      icon: <FaComments />,
      title: '채팅',
      description: '매칭된 상대방과 대화를 나누어보세요.',
      action: () => navigate('/chat')
    },
    {
      icon: <FaUser />,
      title: '프로필 관리',
      description: '내 프로필 정보를 수정하고 관리하세요.',
      action: () => navigate('/profile')
    },
    {
      icon: <FaCalendarAlt />,
      title: '매칭 일정',
      description: '예정된 매칭 일정을 확인하세요.',
      action: () => navigate('/matching')
    }
  ];

  return (
    <MainContainer>
      <WelcomeSection>
        <WelcomeTitle>안녕하세요, {user?.email?.split('@')[0]}님!</WelcomeTitle>
        <WelcomeSubtitle>
          진심어린 만남을 위한 현대차 만남 플랫폼에 오신 것을 환영합니다.
        </WelcomeSubtitle>
        
        <MatchingButton onClick={handleMatchingRequest}>
          매칭 신청하기
        </MatchingButton>
      </WelcomeSection>

      <QuickActions>
        {quickActions.map((action, index) => (
          <ActionCard key={index} onClick={action.action}>
            <ActionIcon>{action.icon}</ActionIcon>
            <ActionTitle>{action.title}</ActionTitle>
            <ActionDescription>{action.description}</ActionDescription>
          </ActionCard>
        ))}
      </QuickActions>

      <StatsSection>
        <StatCard>
          <StatNumber>0</StatNumber>
          <StatLabel>진행 중인 매칭</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>0</StatNumber>
          <StatLabel>완료된 매칭</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>0</StatNumber>
          <StatLabel>새로운 메시지</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>0</StatNumber>
          <StatLabel>프로필 조회수</StatLabel>
        </StatCard>
      </StatsSection>
    </MainContainer>
  );
};

export default MainPage; 