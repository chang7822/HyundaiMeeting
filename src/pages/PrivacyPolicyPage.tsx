import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 2rem;
  padding-top: calc(80px + var(--safe-area-inset-top));
  
  @media (max-width: 768px) {
    padding: 1rem;
    padding-top: calc(60px + var(--safe-area-inset-top));
  }
`;

const ContentWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 15px;
  padding: 2.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

const Title = styled.h1`
  color: #333;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.3rem;
  }
`;

const Subtitle = styled.p`
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 2rem;
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }
`;

const Section = styled.div`
  margin-bottom: 2.5rem;
  
  @media (max-width: 480px) {
    margin-bottom: 2rem;
  }
`;

const SectionTitle = styled.h2`
  color: #4F46E5;
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
    margin-bottom: 0.8rem;
  }
`;

const SectionContent = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.8;
  color: #495057;
  
  @media (max-width: 768px) {
    padding: 1.2rem;
    font-size: 0.9rem;
    line-height: 1.7;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    font-size: 0.85rem;
    line-height: 1.6;
  }
  
  strong {
    color: #333;
    font-weight: 600;
  }
  
  br {
    margin-bottom: 0.5rem;
  }
`;

const BackButton = styled.button`
  margin-bottom: 1.5rem;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e5e7eb;
  }
  
  @media (max-width: 480px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }
`;

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <ContentWrapper>
        <BackButton onClick={() => navigate(-1)}>
          ← 뒤로가기
        </BackButton>
        
        <Title>직쏠공 개인정보처리방침</Title>
        <Subtitle>최종 수정일: {new Date().toLocaleDateString('ko-KR')}</Subtitle>

        <Section>
          <SectionTitle>0. 서비스 제공자 정보</SectionTitle>
          <SectionContent>
            • <strong>서비스명</strong>: 직쏠공 (com.solo.meeting)<br />
            • <strong>운영자</strong>: 직쏠공 운영팀<br />
            • <strong>웹사이트</strong>: https://automatchingway.com<br />
            • <strong>문의</strong>: automatchingway@gmail.com
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>1. 개인정보의 수집 및 이용목적</SectionTitle>
          <SectionContent>
            직쏠공(com.solo.meeting)은 다음과 같은 목적으로 개인정보를 수집하고 있습니다:<br />
            • 회원가입 및 서비스 제공<br />
            • 매칭 서비스 제공<br />
            • 고객 상담 및 문의 응대<br />
            • 서비스 개선 및 신규 서비스 개발
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>2. 수집하는 개인정보 항목</SectionTitle>
          <SectionContent>
            • <strong>필수항목</strong>: 이메일, 비밀번호, 닉네임, 생년월일, 성별, 키, 체형, 직업, 결혼상태, 거주지역<br />
            • <strong>선택항목</strong>: 자기소개, 선호사항(나이, 키, 체형, 직업, 결혼상태)<br />
            • <strong>자동수집항목</strong>: IP주소, 쿠키, 서비스 이용기록, 접속로그
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>3. 개인정보의 보유 및 이용기간</SectionTitle>
          <SectionContent>
            회원 탈퇴 시까지 보유하며, 탈퇴 후에는 즉시 파기됩니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관됩니다.
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>4. 개인정보의 제3자 제공</SectionTitle>
          <SectionContent>
            매칭 서비스 제공을 위해 매칭 상대방에게 제한된 정보(닉네임, 나이, 키, 체형, 직업, 자기소개)를 제공할 수 있습니다.
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>5. 개인정보 보안 및 암호화</SectionTitle>
          <SectionContent>
            • 비밀번호는 암호화되어 저장되며, 관리자도 원본 비밀번호를 확인할 수 없습니다.<br />
            • 채팅 대화내용은 암호화되어 저장되며, 관리자도 내용을 확인할 수 없습니다.<br />
            • 개인정보는 안전한 암호화 기술을 통해 보호되며, 무단 접근을 방지합니다.
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>6. 개인정보의 파기</SectionTitle>
          <SectionContent>
            회원 탈퇴 시 개인정보는 즉시 파기되며, 전자적 파일 형태로 저장된 개인정보는 복구 불가능한 방법으로 영구 삭제됩니다.
          </SectionContent>
        </Section>
      </ContentWrapper>
    </Container>
  );
};

export default PrivacyPolicyPage;

