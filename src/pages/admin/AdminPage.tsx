import React from 'react';
import styled from 'styled-components';

const AdminContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
  background: #f8f9fa;
`;

const AdminCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 1rem;
`;

const Description = styled.p`
  color: #666;
  line-height: 1.6;
`;

const AdminPage = () => {
  return (
    <AdminContainer>
      <AdminCard>
        <Title>관리자 페이지</Title>
        <Description>
          관리자 페이지입니다.<br />
          사용자 관리, 매칭 관리, 시스템 설정 등의 기능이 준비 중입니다.
        </Description>
      </AdminCard>
    </AdminContainer>
  );
};

export default AdminPage; 