import React, { useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSend();
      // 엔터로 전송 시에도 포커스 유지
      inputRef.current?.focus();
    }
  };

  const handleSend = () => {
    onSend();
    // 버튼 클릭/터치 시 포커스 유지
    inputRef.current?.focus();
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
        ref={inputRef}
      />
      <button
        type="button"
        onClick={handleSend}
        onTouchEnd={handleSend}
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)', color: '#fff', border: 'none', borderRadius: 16, padding: '0 18px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', height: 40 }}
      >전송</button>
    </div>
  );
};

export default ChatInput; 