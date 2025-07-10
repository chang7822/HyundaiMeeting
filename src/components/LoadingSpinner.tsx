import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const LoadingSpinner = ({ text = "로딩 중..." }) => (
  <div style={{
    textAlign: 'center',
    marginTop: 60,
    color: '#7C3AED',
    fontSize: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }}>
    <FaSpinner className="spin" style={{ marginBottom: 12, fontSize: 38, animation: 'spin 1s linear infinite' }} />
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