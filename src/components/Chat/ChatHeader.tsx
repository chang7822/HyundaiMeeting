import React from 'react';

interface ChatHeaderProps {
  partner: {
    nickname: string;
    avatar?: string;
    job?: string;
    mbti?: string;
  };
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ partner }) => {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '16px 18px', background: '#fff', borderBottom: '1.5px solid #e0e7ff',
      boxShadow: '0 2px 8px rgba(80,60,180,0.04)', position: 'sticky', top: 0, zIndex: 10
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e9e6f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        {/* 아바타 이미지(추후) */}
        <span style={{ fontSize: 22, color: '#7C3AED' }}>👤</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '1.08rem', color: '#4F46E5' }}>{partner.nickname}</div>
        <div style={{ fontSize: '0.93rem', color: '#555', marginTop: 2 }}>{partner.job} · {partner.mbti}</div>
      </div>
      <button style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 600, fontSize: 15, cursor: 'pointer', padding: 8 }}
        onClick={() => alert('프로필 모달(추후 구현)')}
      >프로필</button>
    </div>
  );
};

export default ChatHeader; 