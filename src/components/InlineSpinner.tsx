import React from 'react';

interface InlineSpinnerProps {
  text?: string;
  size?: number;
}

const InlineSpinner: React.FC<InlineSpinnerProps> = ({ text = '로딩 중...', size = 24 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#4F46E5', fontWeight: 600 }}>
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid #e0e7ff',
        borderTopColor: '#5b21b6',
        animation: 'inline-spinner-rotate 0.8s linear infinite',
        display: 'inline-block',
      }}
    />
    <span>{text}</span>
    <style>
      {`
        @keyframes inline-spinner-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

export default InlineSpinner;

