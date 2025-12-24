import React from 'react';
import { FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import styled from 'styled-components';
import { ProfileIcon } from '../ProfileCard.tsx';
import { getDisplayCompanyName } from '../../utils/companyDisplay.ts';

interface ChatHeaderProps {
  partner: {
    nickname: string;
    birthYear?: number;
    gender?: string;
    job?: string;
    company?: string;
    residence?: string;
    mbti?: string;
  };
  onBack?: () => void;
  onReport?: () => void;
  onShowProfile?: () => void;
}

const HeaderBg = styled.div`
  width: 100%;
  background: linear-gradient(135deg, #f7f7fa 0%, #e9e6f7 100%);
  padding: 0;
  margin: 0;
`;
const Card = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(80,60,180,0.10);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px 14px 18px;
  width: 100%;
  min-height: 68px;
  position: relative;
  margin: 0;
  @media (max-width: 700px) {
    width: 100vw;
    padding: 14px 10px 10px 10px;
  }
`;
const IconBtn = styled.button`
  background: none;
  border: none;
  color: #bbb;
  font-size: 1.5rem;
  margin: 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #4F46E5; }
`;
const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
  flex: 1;
  cursor: pointer;
`;
const InfoCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
`;
const Name = styled.div<{ $gender?: string }>`
  font-weight: 700;
  font-size: 1.18rem;
  color: ${({ $gender }) =>
    $gender === 'male' || $gender === '남성'
      ? '#7C3AED'
      : $gender === 'female' || $gender === '여성'
      ? '#F472B6'
      : '#bbb'};
  margin-bottom: 2px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;
const SubRow = styled.div`
  display: flex;
  gap: 12px;
  font-size: 0.98rem;
  color: #888;
  flex-wrap: wrap;
`;
const SubItem = styled.span`
  background: #f3f0fa;
  color: #764ba2;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 0.97rem;
  font-weight: 500;
`;

const ChatHeader: React.FC<ChatHeaderProps> = ({ partner, onBack, onReport, onShowProfile }) => {
  return (
    <HeaderBg>
      <Card>
        <IconBtn onClick={onBack} title="뒤로가기" style={{marginRight:8}}><FaArrowLeft /></IconBtn>
        <InfoRow
          onClick={e => {
            if ((e.target as HTMLElement).closest('button')) return;
            onShowProfile && onShowProfile();
          }}
          style={{cursor: onShowProfile ? 'pointer' : 'default'}}
        >
          <ProfileIcon gender={partner.gender || ''} />
          <InfoCol>
            <Name $gender={partner.gender}>{partner.nickname}</Name>
            <SubRow>
              {partner.birthYear && <SubItem>{partner.birthYear}년생</SubItem>}
              {getDisplayCompanyName(partner.company, (partner as any).custom_company_name) && <SubItem>{getDisplayCompanyName(partner.company, (partner as any).custom_company_name)}</SubItem>}
              {partner.residence && <SubItem>{partner.residence}</SubItem>}
              {partner.mbti && <SubItem>{partner.mbti}</SubItem>}
            </SubRow>
          </InfoCol>
        </InfoRow>
        <IconBtn onClick={onReport} title="신고" style={{marginLeft:8}}><FaExclamationTriangle /></IconBtn>
      </Card>
    </HeaderBg>
  );
};

export default ChatHeader; 