import React, { useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { matchingApi } from '../services/api.ts';

const MatchingContainer = styled.div`
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

const MatchingCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 1rem;
`;

const Description = styled.p`
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const RequestButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const MatchingPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleMatchingRequest = async () => {
    setIsLoading(true);
    try {
      await matchingApi.requestMatching();
      toast.success('매칭 신청이 완료되었습니다!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '매칭 신청에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MatchingContainer>
      <MatchingCard>
        <Title>매칭 신청</Title>
        <Description>
          새로운 만남을 위한 매칭을 신청하시겠습니까?<br />
          AI 알고리즘이 최적의 상대방을 찾아드립니다.
        </Description>
        
        <RequestButton onClick={handleMatchingRequest} disabled={isLoading}>
          {isLoading ? '매칭 신청 중...' : '매칭 신청하기'}
        </RequestButton>
      </MatchingCard>
    </MatchingContainer>
  );
};

export default MatchingPage; 