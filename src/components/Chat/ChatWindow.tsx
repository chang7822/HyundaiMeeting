import React from 'react';

interface Message {
  id: string | number;
  senderId: string;
  content: string;
  timestamp: string | Date;
}

interface ChatWindowProps {
  messages: Message[];
  chatWindowRef: React.RefObject<HTMLDivElement | null>;
  userId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, chatWindowRef, userId }) => {
  // 날짜 구분선 컴포넌트
  const DateDivider: React.FC<{ date: Date }> = ({ date }) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const day = days[date.getDay()];
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '24px 0 12px 0',
        color: '#aaa',
        fontSize: '0.97rem',
        fontWeight: 500,
        letterSpacing: '0.01em'
      }}>
        <div style={{ flex: 1, height: 1, background: '#e0e0e0', marginRight: 12, opacity: 0.7 }} />
        <span style={{ whiteSpace: 'nowrap' }}>{`${y}. ${m}/${d} (${day})`}</span>
        <div style={{ flex: 1, height: 1, background: '#e0e0e0', marginLeft: 12, opacity: 0.7 }} />
      </div>
    );
  };

  return (
    <div ref={chatWindowRef} style={{ overflowY: 'auto', height: '100%', padding: '16px 0' }}>
      {messages.map((msg, idx) => {
        const msgDate = new Date(msg.timestamp);
        const prevMsg = messages[idx - 1];
        const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;
        const isNewDay =
          !prevDate ||
          msgDate.getFullYear() !== prevDate.getFullYear() ||
          msgDate.getMonth() !== prevDate.getMonth() ||
          msgDate.getDate() !== prevDate.getDate();
        return (
          <React.Fragment key={msg.id}>
            {isNewDay && <DateDivider date={msgDate} />}
            <div style={{
              display: 'flex', flexDirection: msg.senderId === userId ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: 12
            }}>
              <div style={{
                maxWidth: '70%',
                background: msg.senderId === userId ? 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)' : '#fff',
                color: msg.senderId === userId ? '#fff' : '#333',
                borderRadius: 16,
                padding: 'clamp(8px, 2vw, 14px) clamp(12px, 3vw, 22px)',
                fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
                boxShadow: '0 2px 8px rgba(80,60,180,0.06)',
                marginLeft: msg.senderId === userId ? 0 : 24,
                marginRight: msg.senderId === userId ? 24 : 0,
                wordBreak: 'break-all',
              }}>{msg.content}</div>
              <div style={{ fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', color: '#aaa', margin: msg.senderId === userId ? '0 0 0 16px' : '0 16px 0 0', alignSelf: 'flex-end', minWidth: 38, textAlign: 'center' }}>
                <span style={{ display: 'inline-block', marginTop: 8 }}>
                  {(() => {
                    const date = typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp;
                    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                  })()}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ChatWindow; 