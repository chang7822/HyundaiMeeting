import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { matchingApi, chatApi, userApi } from '../services/api.ts';
import ChatHeader from '../components/Chat/ChatHeader.tsx';
import ChatWindow from '../components/Chat/ChatWindow.tsx';
import ChatInput from '../components/Chat/ChatInput.tsx';
import { toast } from 'react-toastify';
import { ChatMessage } from '../types/index.ts';
import { io, Socket } from 'socket.io-client';
import styled from 'styled-components';
import ProfileCard from '../components/ProfileCard.tsx';
import Modal from 'react-modal';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

const DEV_MODE = true; // 개발 중 true, 실서비스 시 false

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

const MainContainer = styled.div`
  flex: 1;
  min-height: 100vh;
  background: #f7f7fa;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
`;

const ChatHeaderWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2px 8px rgba(80,60,180,0.06);
`;

const ChatInputWrapper = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  z-index: 100;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(80,60,180,0.06);
`;

const ChatWindowWrapper = styled.div`
  flex: 1;
  width: 100vw;
  margin-top: 64px; /* 헤더 높이 */
  margin-bottom: 72px; /* 입력창 높이 */
  overflow-y: auto;
  height: calc(100vh - 64px - 72px);
  background: #f7f7fa;
`;

const ChatPage: React.FC = () => {
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
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [joinDone, setJoinDone] = useState(false);

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
      console.log('[ChatPage][DEBUG] periodId:', period.id, 'user:', user.id, 'partner:', partnerUserId);
    }).catch(() => {
      toast.error('매칭 회차 정보 조회에 실패했습니다.');
      setLoading(false);
      setCanEnter(false);
    });
  }, [user?.id, partnerUserId]);

  // 매칭된 상대방 id만 채팅방 진입 허용
  useEffect(() => {
    if (!user?.id || !partnerUserId) return;
    let ignore = false;
    const checkMatching = async () => {
      try {
        const res = await matchingApi.getMatchingStatus(user.id);
        const status = res?.status;
        if (!status || !status.matched || !status.partner_user_id) {
          toast.error('매칭된 상대방이 없습니다.');
          if (!ignore) navigate('/main');
          return;
        }
        if (status.partner_user_id !== partnerUserId) {
          toast.error('로그인 정보가 변경되었습니다. 다시 로그인 해주세요.');
          if (!ignore) navigate('/login');
          return;
        }
      } catch (e) {
        toast.error('매칭 상태 확인에 실패했습니다.');
        if (!ignore) navigate('/main');
      }
    };
    checkMatching();
    return () => { ignore = true; };
  }, [user?.id, partnerUserId, navigate]);

  // 1. 소켓 연결 및 해제
  useEffect(() => {
    if (!user?.id || !partnerUserId || !periodId) return;
    setJoinDone(false); // 초기화
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    const sorted = [user.id, partnerUserId].sort();
    const roomId = `${periodId}_${sorted[0]}_${sorted[1]}`;
    console.log('[ChatPage][SOCKET] 연결 시도:', SOCKET_URL);
    socket.on('connect', () => {
      console.log('[ChatPage][SOCKET] connect 성공:', socket.id);
      socket.emit('join', roomId);
      console.log('[ChatPage][SOCKET] join emit:', roomId);
    });
    socket.on('joined', (joinedRoomId) => {
      if (joinedRoomId === roomId) {
        setJoinDone(true);
        console.log('[ChatPage][SOCKET] join 완료:', joinedRoomId);
      }
    });
    // 메시지 수신 시 optimistic UI 임시 메시지 대체
    const handleSocketMessage = (data: any) => {
      console.log('[ChatPage][SOCKET] chat message 수신:', data);
      // senderId를 항상 string으로 통일
      const senderId = String(data.senderId ?? data.sender_id ?? '');
      setMessages(prev => {
        // 임시 메시지(내가 방금 보낸 것)와 내용/타임스탬프/보낸사람이 같으면 대체
        const idx = prev.findIndex(
          msg =>
            msg.id?.toString().startsWith('local-') &&
            msg.content === data.content &&
            msg.senderId === senderId &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2000
        );
        if (idx !== -1) {
          const newArr = [...prev];
          newArr[idx] = { ...data, senderId };
          return newArr;
        }
        // 중복 방지
        if (prev.some(msg => String(msg.id) === String(data.id))) return prev;
        return [...prev, { ...data, senderId }];
      });
    };
    socket.on('chat message', handleSocketMessage);
    socket.on('disconnect', () => {
      setJoinDone(false);
      console.log('[ChatPage][SOCKET] disconnect:', socket.id);
    });
    return () => {
      socket.off('chat message', handleSocketMessage);
      socket.off('joined');
      socket.disconnect();
      setJoinDone(false);
      console.log('[ChatPage][SOCKET] disconnect 호출');
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
    if (!input.trim() || !user?.id || !partnerUserId || !periodId || !joinDone) return;
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
      console.log('[ChatPage][SOCKET] chat message emit:', newMessage);
      socket.emit('chat message', newMessage);
      setInput('');
    }
  };

  // 스크롤 제어 useEffect 수정
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // partnerUserId가 바뀔 때마다 상대방 프로필 fetch
  useEffect(() => {
    if (!partnerUserId) return;
    userApi.getUserProfile(partnerUserId)
      .then(setPartnerProfile)
      .catch(() => setPartnerProfile(null));
  }, [partnerUserId]);

  if (loading) return <LoadingSpinner sidebarOpen={false} />;
  if (!canEnter) return null;

  const handleBack = () => {
    navigate('/main');
  };
  const handleShowProfile = () => {
    setShowProfileModal(true);
  };
  const handleReport = () => {
    alert('신고가 접수되었습니다. (추후 실제 신고 처리 예정)');
  };

  return (
    <MainContainer>
      {/* 헤더 고정 */}
      <ChatHeaderWrapper>
        <ChatHeader
          partner={{
            nickname: partnerProfile?.nickname || '상대방',
            birthYear: partnerProfile?.birth_year,
            gender: partnerProfile?.gender,
            job: partnerProfile?.job_type,
            mbti: partnerProfile?.mbti,
          }}
          onBack={handleBack}
          onReport={handleReport}
          onShowProfile={handleShowProfile}
        />
      </ChatHeaderWrapper>
      {/* 대화내용 스크롤 영역 */}
      <ChatWindowWrapper>
        <ChatWindow messages={messages} chatWindowRef={chatWindowRef} userId={user?.id || ''} />
      </ChatWindowWrapper>
      {/* 입력창 고정 */}
      <ChatInputWrapper>
        <ChatInput value={input} onChange={setInput} onSend={joinDone ? handleSend : () => {}} />
      </ChatInputWrapper>
      {/* 프로필 모달 등 기존 모달 코드 동일 */}
      <Modal
        isOpen={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}
        style={{
          content: {
            maxWidth: 380,
            minWidth: 220,
            width: 'fit-content',
            maxHeight: '80vh',
            margin: 'auto',
            borderRadius: 16,
            padding: 0,
            overflowY: 'visible',
            overflowX: 'visible',
            boxShadow: '0 4px 24px rgba(80,60,180,0.13)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }
        }}
        contentLabel="상대방 프로필"
      >
        <button
          onClick={() => setShowProfileModal(false)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#ede7f6',
            color: '#764ba2',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            fontWeight: 700,
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(80,60,180,0.08)'
          }}
          title="닫기"
        >
          ×
        </button>
        {partnerProfile ? (
          <ProfileCard
            nickname={partnerProfile.nickname}
            birthYear={partnerProfile.birth_year}
            gender={partnerProfile.gender === 'male' ? '남성' : partnerProfile.gender === 'female' ? '여성' : partnerProfile.gender || ''}
            job={partnerProfile.job_type}
            mbti={partnerProfile.mbti}
            maritalStatus={partnerProfile.marital_status}
            appeal={partnerProfile.appeal}
            interests={partnerProfile.interests}
            appearance={partnerProfile.appearance}
            personality={partnerProfile.personality}
            height={partnerProfile.height}
            body_type={partnerProfile.body_type}
            residence={partnerProfile.residence}
            drinking={partnerProfile.drinking}
            smoking={partnerProfile.smoking}
            religion={partnerProfile.religion}
          />
        ) : (
          <div style={{padding:32}}>프로필 정보를 불러오는 중입니다...</div>
        )}
      </Modal>
    </MainContainer>
  );
};

export default ChatPage; 