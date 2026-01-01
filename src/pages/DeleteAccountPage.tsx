import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext.tsx';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
`;

const Content = styled.div`
  max-width: 800px;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 40px;
  color: #333;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    padding: 30px 20px;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 10px;
  color: #667eea;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #666;
  text-align: center;
  margin-bottom: 30px;
`;

const Section = styled.section`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #667eea;
`;

const StepList = styled.ol`
  padding-left: 20px;
  margin: 15px 0;
  
  li {
    margin-bottom: 12px;
    line-height: 1.6;
    color: #555;
  }
`;

const DataList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 15px 0;
  
  li {
    margin-bottom: 10px;
    padding-left: 25px;
    position: relative;
    line-height: 1.6;
    color: #555;
    
    &:before {
      content: '•';
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
      font-size: 1.2rem;
    }
  }
`;

const WarningBox = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
  color: #856404;
  
  strong {
    display: block;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }
`;

const InfoBox = styled.div`
  background: #e7f3ff;
  border: 1px solid #2196F3;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
  color: #0c5460;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 12px 30px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 10px 5px;
  min-width: 150px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #667eea;
  border: 2px solid #667eea;

  &:hover {
    background: #f8f9fa;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 30px;
  gap: 10px;
`;

const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth() as any;

  const handleGoToProfile = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  return (
    <Container>
      <Content>
        <Title>직쏠공 계정 삭제 안내</Title>
        <Subtitle>직장인 솔로 공모 - 계정 및 데이터 삭제 방법</Subtitle>

        <Section>
          <SectionTitle>📋 계정 삭제 방법</SectionTitle>
          <StepList>
            <li>
              <strong>1단계: 로그인</strong>
              <br />
              직쏠공 앱 또는 웹사이트에 로그인해주세요.
            </li>
            <li>
              <strong>2단계: 프로필 페이지 이동</strong>
              <br />
              하단 메뉴에서 "프로필" 메뉴를 선택하거나, 사이드바에서 "내 정보"를 클릭해주세요.
            </li>
            <li>
              <strong>3단계: 회원 탈퇴</strong>
              <br />
              프로필 페이지 하단의 "회원 탈퇴" 버튼을 클릭해주세요.
            </li>
            <li>
              <strong>4단계: 비밀번호 확인</strong>
              <br />
              보안을 위해 현재 비밀번호를 입력해주세요.
            </li>
            <li>
              <strong>5단계: 탈퇴 완료</strong>
              <br />
              탈퇴가 완료되면 모든 개인 데이터가 삭제됩니다.
            </li>
          </StepList>

          <WarningBox>
            <strong>⚠️ 주의사항</strong>
            현재 매칭이 진행 중인 경우, 해당 회차가 종료된 후에만 탈퇴가 가능합니다.
          </WarningBox>
        </Section>

        <Section>
          <SectionTitle>🗑️ 삭제되는 데이터</SectionTitle>
          <p style={{ marginBottom: 10, color: '#555' }}>
            계정 삭제 시 다음 데이터가 <strong>즉시 완전히 삭제</strong>됩니다:
          </p>
          <DataList>
            <li>계정 정보 (이메일, 비밀번호 등)</li>
            <li>프로필 정보 (닉네임, 성별, 생년, 키, 거주지, 회사 정보 등)</li>
            <li>암호화된 과거 채팅 메시지 (모든 1:1 대화 내용)</li>
            <li>매칭 신청 정보</li>
            <li>인증 토큰 (로그인 세션 정보)</li>
          </DataList>
        </Section>

        <Section>
          <SectionTitle>📦 보관되는 데이터</SectionTitle>
          <p style={{ marginBottom: 10, color: '#555' }}>
            다음 데이터는 <strong>법적 의무 및 서비스 운영</strong>을 위해 보관됩니다:
          </p>
          <DataList>
            <li>
              <strong>신고 이력 (reports)</strong>
              <br />
              <span style={{ fontSize: '0.9rem', color: '#777' }}>
                부정행위 방지 및 서비스 안전 관리를 위해 보관됩니다.
              </span>
            </li>
            <li>
              <strong>매칭 통계 로그 (matching_log)</strong>
              <br />
              <span style={{ fontSize: '0.9rem', color: '#777' }}>
                개인 식별 정보 없이 시스템 통계 목적으로만 보관됩니다.
              </span>
            </li>
            <li>
              <strong>매칭 이력 (matching_history)</strong>
              <br />
              <span style={{ fontSize: '0.9rem', color: '#777' }}>
                사용자 ID는 익명화되지만, 매칭 통계를 위한 스냅샷 정보는 보존됩니다.
              </span>
            </li>
          </DataList>

          <InfoBox>
            <strong>ℹ️ 보관 기간</strong>
            <br />
            보관되는 데이터는 관련 법령에 따라 1년동안 보관되며, 
            개인을 식별할 수 없는 형태로 처리됩니다.
          </InfoBox>
        </Section>

        <Section>
          <SectionTitle>💬 문의</SectionTitle>
          <p style={{ color: '#555', lineHeight: 1.6 }}>
            계정 삭제와 관련하여 추가 문의사항이 있으시면 
            앱 내 고객센터 문의사항 또는 다음 이메일로 연락해주세요.
            <br />
            <strong>이메일:</strong> automatchingway@gmail.com
          </p>
        </Section>

        <ButtonContainer>
          {isAuthenticated ? (
            <Button onClick={handleGoToProfile}>
              프로필 페이지로 이동
            </Button>
          ) : (
            <Button onClick={handleGoToProfile}>
              로그인하기
            </Button>
          )}
          <SecondaryButton onClick={() => navigate('/')}>
            홈으로 돌아가기
          </SecondaryButton>
        </ButtonContainer>
      </Content>
    </Container>
  );
};

export default DeleteAccountPage;

