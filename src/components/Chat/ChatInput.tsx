import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, disabled = false, disabledMessage = '' }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
      // 엔터로 전송 시에도 포커스 유지
      inputRef.current?.focus();
    }
  };

  // 자동 높이 조절 함수
  const adjustHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 40), 120);
      inputRef.current.style.height = `${newHeight}px`;
    }
  };

  // value가 변경될 때마다 높이 조절
  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleSend = () => {
    onSend();
    // 버튼 클릭/터치 시 포커스 유지
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderTop: '1.5px solid #e0e7ff' }}>
      {disabled && disabledMessage && (
        <div style={{
          padding: '8px 14px',
          background: '#fef2f2',
          color: '#dc2626',
          fontSize: '0.9rem',
          textAlign: 'center',
          borderBottom: '1px solid #fecaca'
        }}>
          {disabledMessage}
        </div>
      )}
      <div style={{ display: 'flex', padding: '12px 14px' }}>
        <textarea
          value={value}
          onChange={e => disabled ? null : onChange(e.target.value)}
          onKeyDown={disabled ? undefined : handleKeyDown}
          placeholder={disabled ? "채팅이 비활성화되었습니다..." : "메시지를 입력하세요..."}
          disabled={disabled}
          style={{ 
            flex: 1, 
            border: 'none', 
            outline: 'none', 
            fontSize: '1rem', 
            padding: '10px 12px', 
            borderRadius: 16, 
            background: disabled ? '#f5f5f5' : '#f3f3fa', 
            marginRight: 8,
            resize: 'none',
            height: 40,
            fontFamily: 'inherit',
            lineHeight: '1.4',
            overflowY: 'auto',
            cursor: disabled ? 'not-allowed' : 'text',
            color: disabled ? '#999' : 'inherit'
          }}
          ref={inputRef}
          rows={1}
        />
        <button
          type="button"
          onClick={disabled ? undefined : handleSend}
          onTouchEnd={disabled ? undefined : handleSend}
          disabled={disabled}
          style={{ 
            background: disabled ? '#ccc' : 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)', 
            color: disabled ? '#666' : '#fff', 
            border: 'none', 
            borderRadius: 16, 
            padding: '0 18px', 
            fontWeight: 600, 
            fontSize: '1rem', 
            cursor: disabled ? 'not-allowed' : 'pointer', 
            height: 40,
            opacity: disabled ? 0.6 : 1
          }}
        >전송</button>
      </div>
    </div>
  );
};

export default ChatInput; 