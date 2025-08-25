import React, { useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';

interface TermsAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 10px;
    align-items: flex-start;
    padding-top: 20px;
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  
  @media (max-width: 768px) {
    width: 95%;
    max-height: 90vh;
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    width: 98%;
    padding: 1rem;
    max-height: 95vh;
  }
`;

const ModalTitle = styled.h2`
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.2rem;
  }
`;

const TermsSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: #4F46E5;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 600;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 0.8rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0.7rem;
  }
`;

const TermsContent = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #495057;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    max-height: 150px;
    font-size: 0.85rem;
    padding: 0.8rem;
  }
  
  @media (max-width: 480px) {
    max-height: 120px;
    font-size: 0.8rem;
    padding: 0.7rem;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  
  @media (max-width: 768px) {
    padding: 0.8rem;
    margin-bottom: 0.8rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.7rem;
    margin-bottom: 0.7rem;
  }
`;

const Checkbox = styled.input`
  margin-right: 0.75rem;
  transform: scale(1.2);
  
  @media (max-width: 768px) {
    transform: scale(1.4);
    margin-right: 0.8rem;
  }
  
  @media (max-width: 480px) {
    transform: scale(1.5);
    margin-right: 0.9rem;
    min-width: 20px;
    min-height: 20px;
  }
`;

const CheckboxLabel = styled.label`
  font-weight: 600;
  color: #333;
  cursor: pointer;
  flex: 1;
`;

const AllAgreeContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #e7f3ff;
  border: 2px solid #4F46E5;
  border-radius: 8px;
  
  @media (max-width: 768px) {
    padding: 0.8rem;
    margin-bottom: 1.2rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.7rem;
    margin-bottom: 1rem;
  }
`;

const AllAgreeLabel = styled.label`
  font-weight: 700;
  color: #4F46E5;
  cursor: pointer;
  flex: 1;
  font-size: 1.1rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    gap: 0.8rem;
    margin-top: 1.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.6rem;
    margin-top: 1.2rem;
    flex-direction: column;
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.$variant === 'primary' ? `
    background: #4F46E5;
    color: white;
    
    &:hover {
      background: #3730A3;
    }
    
    &:disabled {
      background: #9CA3AF;
      cursor: not-allowed;
    }
  ` : `
    background: #F3F4F6;
    color: #374151;
    
    &:hover {
      background: #E5E7EB;
    }
  `}
  
  @media (max-width: 768px) {
    padding: 0.7rem 1.2rem;
    font-size: 0.95rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.8rem 1rem;
    font-size: 0.9rem;
    min-height: 44px; /* 터치 타겟 최소 크기 */
  }
`;

const TermsAgreementModal: React.FC<TermsAgreementModalProps> = ({ isOpen, onClose, onAgree }) => {
  const [agreements, setAgreements] = useState({
    privacy: false,
    terms: false,
    email: false,
    all: false
  });

  const handleCheckboxChange = (type: 'privacy' | 'terms' | 'email') => {
    const newAgreements = { ...agreements, [type]: !agreements[type] };
    newAgreements.all = newAgreements.privacy && newAgreements.terms && newAgreements.email;
    setAgreements(newAgreements);
  };

  const handleAllAgree = () => {
    const newAllState = !agreements.all;
    setAgreements({ privacy: newAllState, terms: newAllState, email: newAllState, all: newAllState });
  };

  const handleAgree = () => {
    if (agreements.privacy && agreements.terms && agreements.email) {
      const termsAgreement = {
        privacy: true,
        terms: true,
        email: true,
        agreedAt: new Date().toISOString()
      };
      sessionStorage.setItem('termsAgreement', JSON.stringify(termsAgreement));
      onAgree();
    } else {
      toast.error('모든 약관에 동의해주세요.');
    }
  };

  return (
    <ModalOverlay $isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>개인정보처리방침 및 이용약관 동의</ModalTitle>
        
        <AllAgreeContainer>
          <Checkbox
            type="checkbox"
            id="all-agree"
            checked={agreements.all}
            onChange={handleAllAgree}
          />
          <AllAgreeLabel htmlFor="all-agree">
            모든 약관에 동의합니다
          </AllAgreeLabel>
        </AllAgreeContainer>

        <TermsSection>
          <SectionTitle>개인정보처리방침</SectionTitle>
          <TermsContent>
            <strong>1. 개인정보의 수집 및 이용목적</strong><br />
            본 서비스는 다음과 같은 목적으로 개인정보를 수집하고 있습니다:<br />
            • 회원가입 및 서비스 제공<br />
            • 매칭 서비스 제공<br />
            • 고객 상담 및 문의 응대<br />
            • 서비스 개선 및 신규 서비스 개발<br /><br />
            
            <strong>2. 수집하는 개인정보 항목</strong><br />
            • 필수항목: 이메일, 비밀번호, 닉네임, 생년월일, 성별, 키, 체형, 직업, 결혼상태, 거주지역<br />
            • 선택항목: 자기소개, 선호사항(나이, 키, 체형, 직업, 결혼상태)<br />
            • 자동수집항목: IP주소, 쿠키, 서비스 이용기록, 접속로그<br /><br />
            
            <strong>3. 개인정보의 보유 및 이용기간</strong><br />
            회원 탈퇴 시까지 보유하며, 탈퇴 후에는 즉시 파기됩니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관됩니다.<br /><br />
            
            <strong>4. 개인정보의 제3자 제공</strong><br />
            매칭 서비스 제공을 위해 매칭 상대방에게 제한된 정보(닉네임, 나이, 키, 체형, 직업, 자기소개)를 제공할 수 있습니다.<br /><br />
            
            <strong>5. 개인정보의 파기</strong><br />
            회원 탈퇴 시 개인정보는 즉시 파기되며, 전자적 파일 형태로 저장된 개인정보는 복구 불가능한 방법으로 영구 삭제됩니다.
          </TermsContent>
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="privacy-agree"
              checked={agreements.privacy}
              onChange={() => handleCheckboxChange('privacy')}
            />
            <CheckboxLabel htmlFor="privacy-agree">
              개인정보처리방침에 동의합니다 (필수)
            </CheckboxLabel>
          </CheckboxContainer>
        </TermsSection>

        <TermsSection>
          <SectionTitle>이용약관</SectionTitle>
          <TermsContent>
            <strong>1. 서비스 이용</strong><br />
            • 본 서비스는 성인(만 19세 이상)만 이용할 수 있습니다.<br />
            • 허위 정보 입력 시 서비스 이용이 제한될 수 있습니다.<br />
            • 매칭 서비스는 무료로 제공되며, 추가 유료 서비스는 별도 안내됩니다.<br /><br />
            
            <strong>2. 회원의 의무</strong><br />
            • 타인을 기만하거나 불쾌감을 주는 행위 금지<br />
            • 상업적 목적의 이용 금지<br />
            • 개인정보 무단 수집 및 이용 금지<br />
            • 서비스 운영을 방해하는 행위 금지<br /><br />
            
            <strong>3. 서비스 제한</strong><br />
            • 위반 행위 시 경고, 일시정지, 영구정지 등의 조치가 취해질 수 있습니다.<br />
            • 신고 접수 시 해당 내용을 검토하여 적절한 조치를 취합니다.<br /><br />
            
            <strong>4. 면책조항</strong><br />
            • 매칭 결과에 대한 책임은 회원에게 있습니다.<br />
            • 서비스 이용 중 발생하는 분쟁은 회원 간 해결해야 합니다.<br />
            • 천재지변, 시스템 장애 등으로 인한 서비스 중단 시 책임을 지지 않습니다.<br /><br />
            
            <strong>5. 약관 변경</strong><br />
            약관 변경 시 사전 공지하며, 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.
          </TermsContent>
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="terms-agree"
              checked={agreements.terms}
              onChange={() => handleCheckboxChange('terms')}
            />
            <CheckboxLabel htmlFor="terms-agree">
              이용약관에 동의합니다 (필수)
            </CheckboxLabel>
          </CheckboxContainer>
        </TermsSection>

        <TermsSection>
          <SectionTitle>이메일 수신 동의</SectionTitle>
          <TermsContent>
            <strong>1. 이메일 수신 동의의 목적</strong><br />
            본 서비스는 다음과 같은 목적으로 이메일을 발송합니다:<br />
            • 회원가입 시 이메일 인증 (필수)<br />
            • 매칭 결과 발표 알림 (서비스 운영)<br />
            • 서비스 관련 중요 공지사항<br /><br />
            
            <strong>2. 수신 동의 항목</strong><br />
            • <strong>이메일 인증</strong>: 회원가입 시 이메일 주소 소유권 확인을 위한 인증번호 발송 (필수)<br />
            • <strong>매칭 결과 알림</strong>: 매칭 알고리즘 실행 후 결과 발표 시 알림 이메일 발송<br />
            • <strong>서비스 공지</strong>: 서비스 운영에 관한 중요 공지사항 발송<br /><br />
            
            <strong>3. 이메일 발송 시점</strong><br />
            • <strong>회원가입 시</strong>: 이메일 주소 입력 후 인증번호 발송<br />
            • <strong>매칭 결과 발표 시</strong>: 매칭 알고리즘 실행 완료 후 결과 알림 발송<br />
            • <strong>서비스 공지 시</strong>: 중요 공지사항 발생 시 발송<br /><br />
            
            <strong>4. 수신 거부 안내</strong><br />
            이메일 수신 동의는 서비스 이용을 위한 필수 항목입니다. 수신 거부 시 회원가입이 제한됩니다.
          </TermsContent>
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="email-agree"
              checked={agreements.email}
              onChange={() => handleCheckboxChange('email')}
            />
            <CheckboxLabel htmlFor="email-agree">
              이메일 수신에 동의합니다 (필수)
            </CheckboxLabel>
          </CheckboxContainer>
        </TermsSection>

        <ButtonGroup>
          <Button onClick={onClose}>
            취소
          </Button>
          <Button 
            $variant="primary" 
            onClick={handleAgree} 
            disabled={!agreements.privacy || !agreements.terms || !agreements.email}
          >
            동의하고 계속하기
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TermsAgreementModal;
