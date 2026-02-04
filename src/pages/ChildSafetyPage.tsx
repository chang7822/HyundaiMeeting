import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 2rem;
  padding-top: calc(80px + env(safe-area-inset-top, 0px));
  
  @media (max-width: 768px) {
    padding: 1rem;
    padding-top: calc(60px + env(safe-area-inset-top, 0px));
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
  
  ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.5rem;
    }
  }
`;

const WarningBox = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  color: #856404;
  
  strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #856404;
  }
`;

const ContactBox = styled.div`
  background: #e7f3ff;
  border: 1px solid #2196F3;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  color: #0c5460;
  
  strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #0c5460;
  }
  
  a {
    color: #2196F3;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
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

const ChildSafetyPage = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <ContentWrapper>
        <BackButton onClick={() => navigate(-1)}>
          ← 뒤로가기
        </BackButton>
        
        <Title>아동 안전 표준</Title>
        <Subtitle>직쏠공 - 직장인 솔로 공모</Subtitle>

        <Section>
          <SectionTitle>아동 성적 학대 및 착취(CSAE) 방지 정책</SectionTitle>
          <SectionContent>
            직쏠공은 아동의 안전을 최우선으로 하며, 아동 성적 학대 및 착취(CSAE)를 절대 용납하지 않습니다. 
            우리는 모든 관련 법규를 준수하며, 아동 안전을 보호하기 위한 엄격한 정책과 절차를 시행하고 있습니다.
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>신고 방법</SectionTitle>
          <SectionContent>
            <strong>앱 내 신고 기능</strong>
            <ul>
              <li>채팅 페이지 또는 매칭 이력 페이지에서 "신고하기" 버튼을 클릭하세요.</li>
              <li>신고 유형을 선택하고 상세 내용을 작성한 후 제출하세요.</li>
              <li>신고는 즉시 관리자에게 전달되어 검토됩니다.</li>
            </ul>
            
            <strong>고객센터 문의</strong>
            <ul>
              <li>앱 내 "고객센터" 메뉴에서 문의사항을 작성하세요.</li>
              <li>카테고리에서 "신고문의"를 선택하세요.</li>
              <li>긴급한 경우 이메일로 직접 연락하실 수 있습니다.</li>
            </ul>
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>신고 처리 절차</SectionTitle>
          <SectionContent>
            <ol>
              <li><strong>신고 접수</strong>: 신고 내용이 접수되면 즉시 관리자가 검토합니다.</li>
              <li><strong>내용 검토</strong>: 신고 내용의 심각성과 근거를 확인합니다.</li>
              <li><strong>조치 실행</strong>: 필요시 계정 정지, 영구 제재 등의 조치를 취합니다.</li>
              <li><strong>관련 당국 신고</strong>: 아동 성적 학대 및 착취(CSAE) 관련 사안은 즉시 관련 당국에 신고합니다.</li>
            </ol>
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>관련 당국 신고</SectionTitle>
          <SectionContent>
            직쏠공은 아동 성적 학대 및 착취(CSAE) 관련 사안을 발견하거나 신고받은 경우, 
            관련 법규에 따라 즉시 다음 기관에 신고합니다:
            
            <ul>
              <li><strong>한국인터넷진흥원(KISA)</strong>: 불법정보 신고 (www.kisa.or.kr)</li>
              <li><strong>경찰청 사이버수사대</strong>: 사이버 범죄 신고 (cyberbureau.police.go.kr)</li>
              <li><strong>여성가족부</strong>: 아동 성착취 신고 (www.mogef.go.kr)</li>
            </ul>
            
            <WarningBox>
              <strong>중요</strong>
              아동 성적 학대 및 착취 관련 사안은 즉시 관련 당국에 신고되며, 
              법적 절차에 따라 처리됩니다.
            </WarningBox>
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>연락처</SectionTitle>
          <ContactBox>
            <strong>아동 안전 관련 문의 및 신고</strong>
            이메일: <a href="mailto:automatchingway@gmail.com">automatchingway@gmail.com</a>
            <br />
            <br />
            아동 성적 학대 및 착취(CSAE) 방지 관행 및 규정 준수에 관한 문의사항이 있으시면 
            위 이메일로 연락해주시기 바랍니다.
          </ContactBox>
        </Section>

        <Section>
          <SectionTitle>법적 준수</SectionTitle>
          <SectionContent>
            직쏠공은 다음 법규를 준수합니다:
            <ul>
              <li>아동·청소년의 성보호에 관한 법률</li>
              <li>정보통신망 이용촉진 및 정보보호 등에 관한 법률</li>
              <li>개인정보 보호법</li>
              <li>Google Play 아동 안전 정책</li>
            </ul>
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>지속적인 개선</SectionTitle>
          <SectionContent>
            직쏠공은 아동 안전을 보호하기 위해 정기적으로 정책과 절차를 검토하고 개선합니다. 
            사용자 여러분의 신고와 피드백은 더 안전한 서비스를 만드는 데 큰 도움이 됩니다.
          </SectionContent>
        </Section>
      </ContentWrapper>
    </Container>
  );
};

export default ChildSafetyPage;

