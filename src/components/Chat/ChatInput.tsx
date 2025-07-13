import React, { forwardRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(({ value, onChange, onSend }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSend();
    }
  };
  return (
    <div style={{ display: 'flex', padding: '12px 14px', background: '#fff', borderTop: '1.5px solid #e0e7ff' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요..."
        style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', padding: '10px 12px', borderRadius: 16, background: '#f3f3fa', marginRight: 8 }}
        ref={ref}
      />
      <button
        type="button"
        onClick={onSend}
        onTouchEnd={onSend}
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)', color: '#fff', border: 'none', borderRadius: 16, padding: '0 18px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', height: 40 }}
      >전송</button>
    </div>
  );
});

export default ChatInput; 