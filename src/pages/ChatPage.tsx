import React from 'react';
import styled from 'styled-components';

const ChatContainer = styled.div`
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

const ChatCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 1rem;
`;

const Description = styled.p`
  color: #666;
  line-height: 1.6;
`;

const ChatPage = () => {
  return (
    <ChatContainer>
      <ChatCard>
        <Title>채팅</Title>
        <Description>
          매칭된 상대방과의 채팅 기능이 준비 중입니다.
        </Description>
      </ChatCard>
    </ChatContainer>
  );
};

export default ChatPage; 