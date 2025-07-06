import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { toast } from 'react-toastify';
import { 
  FaHome, 
  FaHeart, 
  FaComments, 
  FaUser, 
  FaSignOutAlt,
  FaBars,
  FaChevronLeft,
  FaStar
} from 'react-icons/fa';
import { NavLink } from 'react-router-dom';
import { matchingApi } from '../../services/api.ts';

const SidebarContainer = styled.div<{ $isOpen: boolean }>`
  width: 280px;
  height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  transition: transform 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  transform: translateX(${props => props.$isOpen ? '0' : '-100%'});
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 280px;
  }
`;

const MobileOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const SidebarCloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 1100;
  background: transparent;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: rgba(255,255,255,0.12);
  }
`;

const SidebarHeader = styled.div`
  padding: 2rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const UserInfo = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const NavMenu = styled.nav`
  padding: 1rem 0;
`;

const NavItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active: boolean }>`
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  border-left: 3px solid ${props => props.active ? 'white' : 'transparent'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const NavText = styled.span`
  font-weight: 500;
`;

const LogoutSection = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Sidebar: React.FC<{ isOpen: boolean; onToggle: () => void }> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // 매칭 상태 및 partnerUserId 상태 관리
  const [matchingStatus, setMatchingStatus] = useState<any>(null);
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const [canChat, setCanChat] = useState(false);
  const [period, setPeriod] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      matchingApi.getMatchingStatus(user.id).then(res => {
        setMatchingStatus(res.status);
        if (res.status && res.status.matched === true && res.status.partner_user_id) {
          setPartnerUserId(res.status.partner_user_id);
          // 회차 마감 전인지 추가 체크
          matchingApi.getMatchingPeriod().then(periodData => {
            setPeriod(periodData);
            const now = new Date();
            const finish = periodData.finish ? new Date(periodData.finish) : null;
            if (!finish || now < finish) {
              setCanChat(true);
            } else {
              setCanChat(false);
            }
          }).catch(() => {
            setCanChat(false);
          });
        } else {
          setPartnerUserId(null);
          setCanChat(false);
        }
      }).catch(() => {
        setPartnerUserId(null);
        setCanChat(false);
      });
    }
  }, [user?.id]);

  const navItems = [
    { path: '/main', icon: <FaHome />, text: '홈' },
    { path: '/profile', icon: <FaUser />, text: '프로필' },
    { path: '/preference', icon: <FaStar />, text: '선호 스타일' },
    { path: '/admin/matching-log', icon: <span role="img" aria-label="calendar">📅</span>, text: '매칭 회차 관리' },
    // 채팅 메뉴 항상 보이게, 조건에 따라 비활성화
    {
      path: partnerUserId ? `/chat/${partnerUserId}` : '#',
      icon: <FaComments />,
      text: '상대방과 채팅하기',
      disabled: !canChat,
    },
    // '카테고리 관리' 메뉴 항상 노출
    {
      path: '/admin/category-manager',
      icon: <span role="img" aria-label="tree">🌳</span>,
      text: '카테고리 관리',
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    if (window.innerWidth <= 768) onToggle();
  };

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다!');
    navigate('/');
  };

  return (
    <>
      {!isOpen && (
        <SidebarCloseButton onClick={onToggle} style={{ position: 'fixed', left: 20, top: 20, background: '#667eea', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          <FaBars />
        </SidebarCloseButton>
      )}
      <MobileOverlay $isOpen={isOpen} onClick={onToggle} />
      <SidebarContainer $isOpen={isOpen}>
        {isOpen && (
          <SidebarCloseButton onClick={onToggle}>
            <FaChevronLeft />
          </SidebarCloseButton>
        )}
        <SidebarHeader>
          <Logo>현대차 만남</Logo>
          <UserInfo>{user?.email}</UserInfo>
        </SidebarHeader>
        <NavMenu>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              active={location.pathname === item.path}
              onClick={() => !item.disabled && handleNavClick(item.path)}
              style={item.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
            >
              {item.icon}
              <NavText>{item.text}</NavText>
            </NavItem>
          ))}
        </NavMenu>
        <LogoutSection>
          <LogoutButton onClick={handleLogout}>
            <FaSignOutAlt />
            로그아웃
          </LogoutButton>
        </LogoutSection>
      </SidebarContainer>
    </>
  );
};

export default Sidebar; 