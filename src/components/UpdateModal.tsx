/**
 * 앱 업데이트 모달 컴포넌트
 * 
 * - 강제 업데이트: 닫기 버튼 없음, 반드시 업데이트해야 함
 * - 선택적 업데이트: 나중에 버튼 있음, 사용자가 선택 가능
 */

import React from 'react';
import styled from 'styled-components';
import { FaStore } from 'react-icons/fa';
import type { VersionCheckResult } from '../utils/versionCheck.ts';
import { openStore } from '../utils/versionCheck.ts';

interface UpdateModalProps {
  isOpen: boolean;
  result: VersionCheckResult;
  onClose?: () => void; // 선택적 업데이트에만 사용
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 32px 28px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.5);
  text-align: center;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 32px;
`;

const Title = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px;
`;

const Message = styled.p`
  font-size: 0.95rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 8px;
  white-space: pre-line;
`;

const VersionInfo = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 16px 0 24px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 0.85rem;
`;

const VersionItem = styled.div`
  display: flex;
  flex-direction: column;
  
  .label {
    color: #9ca3af;
    font-size: 0.75rem;
    margin-bottom: 4px;
  }
  
  .version {
    color: #1f2937;
    font-weight: 600;
    font-size: 0.9rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
`;

const UpdateButton = styled.button`
  width: 100%;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const LaterButton = styled.button`
  width: 100%;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  background: white;
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
`;

/**
 * 강제 업데이트 모달
 */
export const ForceUpdateModal: React.FC<UpdateModalProps> = ({ isOpen, result }) => {
  if (!isOpen) return null;

  const handleUpdate = () => {
    if (result.storeUrl) {
      openStore(result.storeUrl);
    }
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <IconWrapper>
          <FaStore />
        </IconWrapper>
        
        <Title>필수 업데이트</Title>
        
        <Message>{result.message}</Message>
        
        <VersionInfo>
          <VersionItem>
            <div className="label">현재 버전</div>
            <div className="version">v{result.currentVersion}</div>
          </VersionItem>
          <VersionItem>
            <div className="label">최신 버전</div>
            <div className="version">v{result.latestVersion}</div>
          </VersionItem>
        </VersionInfo>
        
        <Message style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '12px' }}>
          업데이트 후 앱을 사용할 수 있습니다
        </Message>
        
        <ButtonGroup>
          <UpdateButton onClick={handleUpdate}>
            <FaStore />
            <span>업데이트하러 가기</span>
          </UpdateButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

/**
 * 선택적 업데이트 모달
 */
export const OptionalUpdateModal: React.FC<UpdateModalProps> = ({ isOpen, result, onClose }) => {
  if (!isOpen) return null;

  const handleUpdate = () => {
    if (result.storeUrl) {
      openStore(result.storeUrl);
    }
    onClose?.();
  };

  const handleLater = () => {
    onClose?.();
  };

  return (
    <ModalOverlay onClick={handleLater}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <IconWrapper>
          <FaStore />
        </IconWrapper>
        
        <Title>새 버전 사용 가능</Title>
        
        <Message>{result.message}</Message>
        
        <VersionInfo>
          <VersionItem>
            <div className="label">현재 버전</div>
            <div className="version">v{result.currentVersion}</div>
          </VersionItem>
          <VersionItem>
            <div className="label">최신 버전</div>
            <div className="version">v{result.latestVersion}</div>
          </VersionItem>
        </VersionInfo>
        
        <Message style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          최신 기능과 개선 사항을 경험해보세요
        </Message>
        
        <ButtonGroup>
          <UpdateButton onClick={handleUpdate}>
            <FaStore />
            <span>지금 업데이트</span>
          </UpdateButton>
          <LaterButton onClick={handleLater}>
            나중에
          </LaterButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};
