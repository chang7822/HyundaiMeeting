import React from 'react';

// 예쁜 그라데이션 원형 스피너 SVG + 부드러운 애니메이션
const LoadingSpinner = ({ text = "로딩 중...", sidebarOpen = false }: { text?: string; sidebarOpen?: boolean }) => (
  <div style={{
    position: 'fixed',
    left: sidebarOpen ? 'calc(50% + 140px)' : '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2000,
    color: '#7C3AED',
    fontSize: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.97)',
    borderRadius: 18,
    boxShadow: '0 4px 24px rgba(80,60,180,0.13)',
    padding: '54px 40px',
    minWidth: 180,
    minHeight: 120,
    border: '1.5px solid #ede7f6',
  }}>
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ marginBottom: 18, display: 'block' }}>
      <defs>
        <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <circle
        cx="32" cy="32" r="26"
        stroke="#ede7f6"
        strokeWidth="8"
        fill="none"
      />
      <circle
        cx="32" cy="32" r="26"
        stroke="url(#spinner-gradient)"
        strokeWidth="8"
        fill="none"
        strokeDasharray="120 60"
        strokeLinecap="round"
        style={{
          transformOrigin: 'center',
          animation: 'spinner-rotate 1.1s linear infinite',
        } as React.CSSProperties}
      />
    </svg>
    <div style={{ fontWeight: 600, color: '#4F46E5', fontSize: '1.08em', letterSpacing: '-0.01em', marginTop: 2 }}>{text}</div>
    <style>
      {`
        @keyframes spinner-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

export default LoadingSpinner; 