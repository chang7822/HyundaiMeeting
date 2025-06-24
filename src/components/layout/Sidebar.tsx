import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { 
  FaHome, 
  FaHeart, 
  FaComments, 
  FaUser, 
  FaSignOutAlt,
  FaBars,
  FaTimes
} from 'react-icons/fa';

const SidebarContainer = styled.div<{ isOpen: boolean }>`
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
  
  @media (max-width: 768px) {
    transform: translateX(${props => props.isOpen ? '0' : '-100%'});
    width: 100%;
    max-width: 280px;
  }
  
  @media (min-width: 769px) {
    transform: translateX(0);
  }
`;

const MobileOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileToggle = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1001;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  
  @media (min-width: 769px) {
    display: none;
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

const NavItem = styled.div<{ active: boolean }>`
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

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/main', icon: <FaHome />, text: '홈' },
    { path: '/matching', icon: <FaHeart />, text: '매칭' },
    { path: '/chat', icon: <FaComments />, text: '채팅' },
    { path: '/profile', icon: <FaUser />, text: '프로필' },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <MobileToggle onClick={toggleSidebar}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </MobileToggle>
      
      <MobileOverlay isOpen={isOpen} onClick={() => setIsOpen(false)} />
      
      <SidebarContainer isOpen={isOpen}>
        <SidebarHeader>
          <Logo>현대차 만남</Logo>
          <UserInfo>{user?.email}</UserInfo>
        </SidebarHeader>
        
        <NavMenu>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              active={location.pathname === item.path}
              onClick={() => handleNavClick(item.path)}
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