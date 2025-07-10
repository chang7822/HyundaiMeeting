import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const LoadingSpinner = ({ text = "로딩 중...", sidebarOpen = false }: { text?: string; sidebarOpen?: boolean }) => (
  <div style={{
    position: 'fixed',
    left: sidebarOpen ? 'calc(50% + 140px)' : '50%', // 사이드바 열렸을 때 280/2=140px 우측 이동
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2000,
    color: '#7C3AED',
    fontSize: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    boxShadow: '0 2px 16px rgba(80,60,180,0.08)',
    padding: '48px 36px',
    minWidth: 180,
    minHeight: 120,
  }}>
    <FaSpinner className="spin" style={{ marginBottom: 18, fontSize: 44, animation: 'spin 1s linear infinite' }} />
    {text}
    <style>
      {`
        .spin { display:inline-block; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}
    </style>
  </div>
);

export default LoadingSpinner; 