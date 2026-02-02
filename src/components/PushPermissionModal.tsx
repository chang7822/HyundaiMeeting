import React from 'react';
import styled from 'styled-components';
import { FaBell, FaComments } from 'react-icons/fa';

interface PushPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  padding: 30px 24px 20px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const IconWrapper = styled.div`
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
`;

const Title = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  margin: 0 0 8px;
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.4;
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const BenefitList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
`;

const BenefitItem = styled.li`
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  font-size: 0.95rem;
  color: #333;
  line-height: 1.5;

  &:last-child {
    margin-bottom: 0;
  }

  svg {
    color: #667eea;
    margin-right: 12px;
    margin-top: 2px;
    flex-shrink: 0;
    font-size: 1.1rem;
  }
`;

const WarningBox = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 24px;
  font-size: 0.85rem;
  color: #856404;
  line-height: 1.5;

  strong {
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.$primary ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  ` : `
    background: #f5f5f5;
    color: #666;
    
    &:hover {
      background: #e5e5e5;
    }
    
    &:active {
      background: #d5d5d5;
    }
  `}
`;

const PushPermissionModal: React.FC<PushPermissionModalProps> = ({ isOpen, onAllow, onDeny }) => {
  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalContainer>
        <ModalHeader>
          <IconWrapper>
            <FaBell />
          </IconWrapper>
          <Title>알림 허용 안내</Title>
          <Subtitle>직쏠공에서 알림을 보내고자 합니다</Subtitle>
        </ModalHeader>

        <ModalBody>
          <BenefitList>
            <BenefitItem>
              <FaComments />
              <span>
                <strong>매칭 상대방과의 원활한 채팅</strong>을 위해 알림 허용이 필요합니다
              </span>
            </BenefitItem>
            <BenefitItem>
              <FaBell />
              <span>
                <strong>매칭 결과</strong> 및 <strong>중요한 공지사항</strong>을 실시간으로 받아보실 수 있습니다
              </span>
            </BenefitItem>
          </BenefitList>

          <WarningBox>
            <strong>⚠️ 거부 시 안내</strong>
            알림을 거부하시면, 추후 알림 설정을 위해 <strong>아이폰 설정 &gt; 직쏠공 &gt; 알림</strong>에서 수동으로 허용하셔야 합니다.
          </WarningBox>

          <ButtonGroup>
            <Button onClick={onDeny}>
              나중에
            </Button>
            <Button $primary onClick={onAllow}>
              알림 허용
            </Button>
          </ButtonGroup>
        </ModalBody>
      </ModalContainer>
    </Overlay>
  );
};

export default PushPermissionModal;
