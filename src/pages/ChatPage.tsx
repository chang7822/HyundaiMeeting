import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { matchingApi, chatApi, userApi, reportApi } from '../services/api.ts';
import ChatHeader from '../components/Chat/ChatHeader.tsx';
import ChatWindow from '../components/Chat/ChatWindow.tsx';
import ChatInput from '../components/Chat/ChatInput.tsx';
import { toast } from 'react-toastify';

import { io, Socket } from 'socket.io-client';
import styled from 'styled-components';
import ProfileCard from '../components/ProfileCard.tsx';
import Modal from 'react-modal';
import InlineSpinner from '../components/InlineSpinner.tsx';
import ReportModal from '../components/ReportModal.tsx';



const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://192.168.0.13:3001';

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
`;

const MainContainer = styled.div`
  flex: 1;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  width: 100vw;
  max-width: 1200px;
  height: 100vh;
  overflow: hidden;
  position: relative;
  
  /* 모바일: visualViewport 높이 사용 */
  @supports (-webkit-touch-callout: none) {
    @media (max-width: 768px) {
      height: 100dvh; /* dynamic viewport height */
    }
  }
  
  @media (max-width: 1200px) {
    max-width: 100vw;
  }
`;

const ChatHeaderWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  max-width: 1200px;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2px 8px rgba(80,60,180,0.06);
  
  @media (max-width: 1200px) {
    left: 0;
    transform: none;
    max-width: 100vw;
  }
`;

const ChatInputWrapper = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  max-width: 1200px;
  z-index: 100;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(80,60,180,0.06);
  
  @media (max-width: 1200px) {
    left: 0;
    transform: none;
    max-width: 100vw;
  }
`;

const ChatWindowWrapper = styled.div`
  flex: 1;
  width: 100vw;
  max-width: 1200px;
  margin: 0 auto;
  margin-top: 100px;
  margin-bottom: 72px;
  overflow-y: auto;
  overflow-x: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-overflow-scrolling: touch;
  
  /* PC 및 태블릿: 고정 높이 */
  @media (min-width: 769px) {
    height: calc(100vh - 64px - 72px);
  }
  
  /* 모바일: 키보드에 따라 동적으로 변하는 높이 */
  @media (max-width: 768px) {
    height: calc(100vh - 136px);
    
    /* iOS Safari의 dynamic viewport */
    @supports (-webkit-touch-callout: none) {
      height: calc(100dvh - 136px);
    }
  }
  
  @media (max-width: 1200px) {
    max-width: 100vw;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
`;

const ChatPage: React.FC = () => {
  const { partnerUserId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ id: string | number; senderId: string; content: string; timestamp: string | Date; }[]>([]);
  const [input, setInput] = useState('');
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  // 추가: 입력창 ref
  const inputRef = useRef<HTMLInputElement>(null!);
  const [loading, setLoading] = useState(true);
  const [canEnter, setCanEnter] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [joinDone, setJoinDone] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [isPartnerBanned, setIsPartnerBanned] = useState(false);
  const [chatEndTime, setChatEndTime] = useState<Date | null>(null);

  // 1. period_id 확보 및 권한 체크
  useEffect(() => {
    if (!user?.id || !partnerUserId) return;
    setLoading(true);
    matchingApi.getMatchingPeriod().then(periodResp => {
      const period = periodResp?.current || periodResp;
      if (!period || !period.id) {
        toast.error('매칭 회차 정보가 없습니다.');
        setLoading(false);
        setCanEnter(false);
        return;
      }
      
      // 채팅방 마감 시간 체크
      if (period.finish) {
        const finishTime = new Date(period.finish);
        const now = new Date();
        
        if (now >= finishTime) {
          toast.error('채팅 기간이 마감되었습니다.');
          navigate('/main');
          return;
        }
        setChatEndTime(finishTime);
      } else {
        setChatEndTime(null);
      }
      
      setPeriodId(String(period.id));
      setCanEnter(true);
      setLoading(false);
      // console.log('[ChatPage][DEBUG] periodId:', period.id, 'typeof:', typeof period.id, 'stringified:', String(period.id));
    }).catch(() => {
      toast.error('매칭 회차 정보 조회에 실패했습니다.');
      setLoading(false);
      setCanEnter(false);
    });
  }, [user?.id, partnerUserId, navigate]);

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
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false,
    });
    socketRef.current = socket;
    const sorted = [user.id, partnerUserId].sort();
    const roomId = `${periodId}_${sorted[0]}_${sorted[1]}`;
    // console.log('[ChatPage][SOCKET] 연결 시도:', SOCKET_URL);
    socket.on('connect', () => {
      // console.log('[ChatPage][SOCKET] connect 성공:', socket.id);
      socket.emit('join', roomId);
      // console.log('[ChatPage][SOCKET] join emit:', roomId);
    });
    socket.on('joined', (joinedRoomId) => {
      if (joinedRoomId === roomId) {
        setJoinDone(true);
        // console.log('[ChatPage][SOCKET] join 완료:', joinedRoomId);
      }
    });
    // 메시지 수신 시 optimistic UI 임시 메시지 대체
    const handleSocketMessage = (data: any) => {
      // console.log('[ChatPage][SOCKET] chat message 수신:', data);
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

    // 상대가 내 메시지를 읽었을 때 읽음 상태 업데이트
    const handleRead = (data: any) => {
      if (!data || !data.period_id || !data.reader_id || !data.partner_id) return;
      // 이 방(periodId) + 내가 보낸 메시지를 상대가 읽은 경우만 처리
      if (String(data.period_id) !== String(periodId)) return;
      const myId = String(user.id);
      const partnerId = String(partnerUserId);
      const readerId = String(data.reader_id);
      const partnerIdFromEvent = String(data.partner_id);
      // partner_id === 나, reader_id === 상대 인 경우에만 (상대가 내 메시지를 읽음)
      if (partnerIdFromEvent !== myId || readerId !== partnerId) return;

      setMessages(prev =>
        prev.map(msg =>
          msg.senderId === myId
            ? { ...msg, is_read: true }
            : msg
        )
      );
    };

    socket.on('chat message', handleSocketMessage);
    socket.on('read', handleRead);
    socket.on('disconnect', () => {
      setJoinDone(false);
      // console.log('[ChatPage][SOCKET] disconnect:', socket.id);
    });
    return () => {
      socket.off('chat message', handleSocketMessage);
      socket.off('read', handleRead);
      socket.off('joined');
      socket.disconnect();
      setJoinDone(false);
      // console.log('[ChatPage][SOCKET] disconnect 호출');
    };
  }, [user?.id, partnerUserId, periodId]);

  // 2. 메시지 최초 불러오기(최초 1회만, senderId 통일) + 읽음 처리
  useEffect(() => {
    if (!user?.id || !partnerUserId || !periodId) return;
    chatApi.getMessages(periodId as string, partnerUserId as string, user.id as string)
      .then((msgs: any[]) => {
        setMessages(
          msgs.map(msg => ({
            ...msg,
            senderId: String(msg.senderId || msg.sender_id || ''), // 항상 string
          }))
        );
        // 채팅방 입장 시 읽음 처리
        chatApi.markAsRead(periodId as string, partnerUserId as string, user.id as string)
          .catch(err => console.warn('읽음 처리 실패:', err));
      })
      .catch(() => setMessages([]));
  }, [user?.id, partnerUserId, periodId]);

  // 2-1. 실시간으로 새 메시지가 올 때마다 읽음 처리 (현재 채팅방 기준) + 읽음 이벤트 emit
  useEffect(() => {
    if (!user?.id || !partnerUserId || !periodId) return;
    if (!messages.length) return;

    const myId = String(user.id);
    const partnerId = String(partnerUserId);

    // 내가 받은 "안읽은" 메시지가 있을 때만 처리
    const hasUnreadFromPartner = messages.some(
      (m: any) => m.senderId === partnerId && m.is_read !== true
    );
    if (!hasUnreadFromPartner) return;

    chatApi
      .markAsRead(periodId as string, partnerUserId as string, user.id as string)
      .then(() => {
        const socket = socketRef.current;
        if (socket) {
          socket.emit('read', {
            period_id: periodId,
            reader_id: myId,
            partner_id: partnerId,
          });
        }
      })
      .catch(() => {
        // 조용히 무시 (UI 깜빡임 방지)
      });
  }, [messages, user?.id, partnerUserId, periodId]);

  // 3. 메시지 전송
  const handleSend = async () => {
    if (!input.trim() || !user?.id || !partnerUserId || !periodId || !joinDone) return;
    
    // 상대방이 정지된 경우 메시지 전송 차단 및 안내
    if (isPartnerBanned) {
      toast.error('정지된 사용자에게 메시지를 전송할 수 없습니다.');
      return;
    }
    
    // 채팅방 마감 시간 체크 (초기 진입 시 받아온 finish 기준, 추가 네트워크 호출 없이 로컬에서만 확인)
    if (chatEndTime) {
      const now = new Date();
      if (now >= chatEndTime) {
        toast.error('채팅 기간이 마감되었습니다.');
        navigate('/main');
        return;
      }
    }
    
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
      // console.log('[ChatPage][SOCKET] chat message emit:', newMessage);
      socket.emit('chat message', newMessage);
      setInput('');
      // 메시지 전송 후 입력창에 포커스
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // 스크롤 제어 useEffect 수정
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // partnerUserId가 바뀔 때마다 상대방 프로필 및 정지 상태 확인
  useEffect(() => {
    if (!partnerUserId) return;
    
    userApi.getUserProfile(partnerUserId)
      .then(profile => {
        setPartnerProfile(profile);
        // 상대방 정지 상태 확인
        if (profile?.user) {
          const isBanned = profile.user.is_banned === true;
          const bannedUntil = profile.user.banned_until ? new Date(profile.user.banned_until) : null;
          const now = new Date();
          const isBanActive = isBanned && (!bannedUntil || bannedUntil > now);
          setIsPartnerBanned(isBanActive);
        } else {
          setIsPartnerBanned(false);
        }
      })
      .catch(() => {
        setPartnerProfile(null);
        setIsPartnerBanned(false);
      });
  }, [partnerUserId]);

  if (!canEnter) return null;

  const handleBack = () => {
    navigate('/main');
  };
  const handleShowProfile = async () => {
    if (partnerUserId) {
      try {
        const latest = await userApi.getUserProfile(partnerUserId);
        setPartnerProfile(latest);
      } catch (e) {
        console.error('[ChatPage] 프로필 모달용 상대 프로필 조회 중 오류:', e);
      }
    }
    setShowProfileModal(true);
  };
  const handleReport = () => {
    // console.log('[ChatPage][handleReport] periodId:', periodId, 'parseInt:', parseInt(periodId || '0'));
    if (!periodId || parseInt(periodId) <= 0) {
      toast.error('매칭 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setReportModal(true);
  };

  return (
    <PageContainer>
      <MainContainer>
        {loading && (
          <LoadingOverlay>
            <InlineSpinner text="채팅방을 준비하고 있습니다..." />
          </LoadingOverlay>
        )}
        {/* 헤더 고정 */}
        <ChatHeaderWrapper>
        <ChatHeader
          partner={{
            nickname: partnerProfile?.nickname || '상대방',
            birthYear: partnerProfile?.birth_year,
            gender: partnerProfile?.gender,
            job: partnerProfile?.job_type,
            company: partnerProfile?.company,
            residence: partnerProfile?.residence,
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
        <ChatInput 
          value={input} 
          onChange={setInput} 
          onSend={joinDone ? handleSend : () => {}} 
          disabled={isPartnerBanned}
          disabledMessage={isPartnerBanned ? "상대방이 정지되어 채팅을 할 수 없습니다." : ""}
        />
      </ChatInputWrapper>
      {/* 프로필 모달 등 기존 모달 코드 동일 */}
      <Modal
        isOpen={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}
        style={{
          overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          content: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            maxWidth: 380,
            minWidth: 220,
            maxHeight: '80vh',
            borderRadius: 16,
            padding: 0,
            overflowY: 'visible',
            overflowX: 'visible',
            boxShadow: '0 4px 24px rgba(80,60,180,0.13)',
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
            company={partnerProfile.company || undefined}
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
      
      {/* 신고 모달 */}
      <ReportModal
        isOpen={reportModal}
        onClose={() => setReportModal(false)}
        reportedUser={{
          id: partnerUserId || '',
          nickname: partnerProfile?.nickname || '상대방'
        }}
        periodId={periodId ? parseInt(periodId) : -1}
        onSuccess={() => {
          setReportModal(false);
          toast.success('신고가 성공적으로 접수되었습니다.');
        }}
      />
        </MainContainer>
      </PageContainer>
    );
  };

export default ChatPage; 