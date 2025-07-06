import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { matchingApi, chatApi } from '../services/api.ts';
import ChatHeader from '../components/Chat/ChatHeader.tsx';
import ChatWindow from '../components/Chat/ChatWindow.tsx';
import ChatInput from '../components/Chat/ChatInput.tsx';
import { toast } from 'react-toastify';
import { ChatMessage } from '../types/index.ts';
import { io, Socket } from 'socket.io-client';
import styled from 'styled-components';

const DEV_MODE = true; // 개발 중 true, 실서비스 시 false

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

const MainContainer = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
  min-height: 100vh;
  background: #f7f7fa;
  transition: margin-left 0.3s;
  display: flex;
  flex-direction: column;
  width: 100vw;
  @media (max-width: 768px) {
    margin-left: 0;
    width: 100vw;
    padding-top: 80px;
  }
`;

interface ChatPageProps {
  sidebarOpen: boolean;
}

const ChatPage: React.FC<ChatPageProps> = ({ sidebarOpen }) => {
  const { partnerUserId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ id: string | number; senderId: string; content: string; timestamp: string | Date; }[]>([]);
  const [input, setInput] = useState('');
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEnter, setCanEnter] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);

  // 1. period_id 확보 및 권한 체크
  useEffect(() => {
    if (!user?.id || !partnerUserId) return;
    setLoading(true);
    matchingApi.getMatchingPeriod().then(period => {
      if (!period || !period.id) {
        toast.error('매칭 회차 정보가 없습니다.');
        setLoading(false);
        setCanEnter(false);
        return;
      }
      setPeriodId(period.id);
      setCanEnter(true);
      setLoading(false);
      console.log('[ChatPage] periodId:', period.id, 'user:', user.id, 'partner:', partnerUserId);
    }).catch(() => {
      toast.error('매칭 회차 정보 조회에 실패했습니다.');
      setLoading(false);
      setCanEnter(false);
    });
  }, [user?.id, partnerUserId]);

  // 1. 소켓 연결 및 해제
  useEffect(() => {
    if (!user?.id || !partnerUserId || !periodId) return;
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    const sorted = [user.id, partnerUserId].sort();
    const roomId = `${periodId}_${sorted[0]}_${sorted[1]}`;
    socket.emit('join', roomId);
    // 메시지 수신 시 optimistic UI 임시 메시지 대체
    const handleSocketMessage = (data: any) => {
      setMessages(prev => {
        // 임시 메시지(내가 방금 보낸 것)와 내용/타임스탬프/보낸사람이 같으면 대체
        const idx = prev.findIndex(
          msg =>
            msg.id?.toString().startsWith('local-') &&
            msg.content === data.content &&
            msg.senderId === (data.senderId || data.sender_id) &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2000
        );
        if (idx !== -1) {
          const newArr = [...prev];
          newArr[idx] = { ...data, senderId: (data.senderId || data.sender_id) as string };
          return newArr;
        }
        // 중복 방지
        if (prev.some(msg => String(msg.id) === String(data.id))) return prev;
        return [...prev, { ...data, senderId: (data.senderId || data.sender_id) as string }];
      });
    };
    socket.on('chat message', handleSocketMessage);
    return () => {
      socket.off('chat message', handleSocketMessage);
      socket.disconnect();
    };
  }, [user?.id, partnerUserId, periodId]);

  // 2. 메시지 최초 불러오기(최초 1회만, senderId 통일)
  useEffect(() => {
    if (!user?.id || !partnerUserId || !periodId) return;
    chatApi.getMessages(periodId as string, partnerUserId as string, user.id as string)
      .then((msgs: any[]) => setMessages(
        msgs.map(msg => ({
          ...msg,
          senderId: String(msg.senderId || msg.sender_id || ''), // 항상 string
        }))
      ))
      .catch(() => setMessages([]));
  }, [user?.id, partnerUserId, periodId]);

  // 3. 메시지 전송
  const handleSend = async () => {
    if (!input.trim() || !user?.id || !partnerUserId || !periodId) return;
    const socket = socketRef.current;
    if (socket) {
      const newMessage = {
        id: `local-${Date.now()}`,
        period_id: periodId,
        sender_id: user.id,
        receiver_id: partnerUserId,
        sender_nickname: profile?.nickname || '',
        receiver_nickname: '',
        content: input,
        timestamp: new Date(),
        matchId: '',
        senderId: String(user.id),
      } as any;
      setMessages(prev => [...prev, newMessage]);
      socket.emit('chat message', newMessage);
      setInput('');
    }
  };

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) return null;
  if (!canEnter) return null;

  // 더미 프로필(실제 연동 시 partnerProfile 사용)
  const dummyPartner = {
    nickname: '상대방',
    avatar: '',
    job: '연구원',
    mbti: 'ENFP',
  };

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <ChatHeader partner={dummyPartner} />
      <div style={{ flex: 1, width: '100%' }}>
        <ChatWindow messages={messages} chatWindowRef={chatWindowRef} userId={user?.id || ''} />
      </div>
      <div style={{ width: '100%' }}>
        <ChatInput value={input} onChange={setInput} onSend={handleSend} />
      </div>
    </MainContainer>
  );
};

export default ChatPage; 