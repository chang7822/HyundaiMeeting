import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Modal from 'react-modal';
import { FaSyncAlt, FaComments, FaTimes, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ProfileDetailModal from './ProfileDetailModal.tsx';
import { apiUrl, adminMatchingApi, adminChatApi } from '../../services/api.ts';
import InlineSpinner from '../../components/InlineSpinner.tsx';
import { getDisplayCompanyName } from '../../utils/companyDisplay.ts';

// read_at은 DB에서 timestamp without time zone으로 저장되어 'Z' 없이 반환됨 → UTC로 해석하도록 보정
function parseAsUtc(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  return new Date(s + 'Z');
}

const KST_OPTS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' };

const Container = styled.div<{ $sidebarOpen: boolean }>`
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(80,60,180,0.08);
  padding: 32px 24px;
  max-width: 1200px;
  margin-left: ${props => (window.innerWidth > 768 && props.$sidebarOpen) ? '280px' : '0'};
  
  @media (max-width: 768px) {
    margin: 0;
    margin-top: 5rem;
    padding: 1.25rem;
    border-radius: 0;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    margin-bottom: 16px;
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #7C3AED;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #5b21b6;
    transform: translateY(-1px);
  }
  
  svg {
    transition: transform 0.3s;
  }
  
  &:hover svg {
    transform: rotate(180deg);
  }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.85rem;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
  
  th, td {
    border-bottom: 1px solid #eee;
    padding: 10px 8px;
    text-align: center;
  }
  
  th {
    background: #f7f7fa;
    font-weight: 600;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NicknameBtn = styled.button`
  background: none;
  border: none;
  color: #4F46E5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: #7C3AED; }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const UserDetail = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.3;
`;

const MessageCount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #7C3AED;
  margin-left: 8px;
  font-weight: 500;
`;

const MobileCardList = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 1.5rem;
  }
`;

const MobileCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
`;

const PeriodBadge = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const CoupleRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
`;

const UserCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const UserName = styled.button`
  background: none;
  border: none;
  color: #4F46E5;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  text-decoration: underline;
  text-align: left;
  padding: 0;
  
  &:hover {
    color: #7C3AED;
  }
`;

const UserMeta = styled.div`
  font-size: 0.7rem;
  color: #6b7280;
  line-height: 1.4;
`;

const Divider = styled.div`
  font-size: 1.5rem;
  color: #dc2626;
  font-weight: 700;
`;

const StyledSelect = styled.select`
  padding: 10px 36px 10px 14px;
  border-radius: 8px;
  border: 1.5px solid #7C3AED;
  background: #f7f7fa url('data:image/svg+xml;utf8,<svg fill="%237C3AED" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7.293 8.293a1 1 0 011.414 0L10 9.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z"/></svg>') no-repeat right 12px center/18px 18px;
  font-size: 1.05rem;
  font-weight: 500;
  color: #4F46E5;
  outline: none;
  min-width: 120px;
  cursor: pointer;
  transition: border 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(80,60,180,0.04);
  
  &:hover, &:focus {
    border: 1.5px solid #5b21b6;
    box-shadow: 0 2px 8px rgba(80,60,180,0.10);
    background-color: #ede7f6;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    font-size: 0.9rem;
    padding: 8px 32px 8px 12px;
  }
`;

const ChatModalContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 70vh;
  max-height: 600px;
`;

const ChatHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 2px solid #e5e7eb;
  flex-shrink: 0;
`;

const ChatTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  color: #4F46E5;
  font-weight: 700;
`;

const ChatSubtitle = styled.div`
  font-size: 0.9rem;
  color: #6b7280;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f9fafb;
  min-height: 0;
`;

const MessageBubble = styled.div<{ $isSender: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$isSender ? 'flex-end' : 'flex-start'};
  margin-bottom: 16px;
`;

const MessageSender = styled.div<{ $isSender?: boolean }>`
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 600;
  width: 100%;
  text-align: ${props => props.$isSender ? 'right' : 'left'};
`;

const MessageContentRow = styled.div<{ $isSender: boolean }>`
  display: flex;
  align-items: flex-end;
  gap: 6px;
  width: 100%;
  justify-content: ${props => props.$isSender ? 'flex-end' : 'flex-start'};
`;

const MessageContent = styled.div<{ $isSender: boolean; $isPrivate?: boolean }>`
  max-width: 70%;
  min-width: ${props => props.$isPrivate ? '120px' : 'auto'};
  padding: 10px 14px;
  border-radius: 12px;
  background: ${props => props.$isSender ? '#7C3AED' : 'white'};
  color: ${props => props.$isPrivate ? 'transparent' : (props.$isSender ? 'white' : '#1f2937')};
  word-break: ${props => props.$isPrivate ? 'keep-all' : 'break-word'};
  white-space: ${props => props.$isPrivate ? 'nowrap' : 'pre-wrap'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  user-select: ${props => props.$isPrivate ? 'none' : 'auto'};
  
  /* 비공개 메시지는 흐릿한 배경으로 표시 */
  ${props => props.$isPrivate && `
    opacity: 0.6;
    background: ${props.$isSender ? '#7C3AED' : '#e5e7eb'};
  `}
`;

const MessageTime = styled.div<{ $isSender?: boolean }>`
  font-size: 0.7rem;
  color: #9ca3af;
  margin-top: 4px;
  width: 100%;
  text-align: ${props => props.$isSender ? 'right' : 'left'};
`;

const UnreadBadge = styled.span`
  font-size: 0.65rem;
  color: #ef4444;
  font-weight: 700;
  padding: 2px 5px;
  background: #fee2e2;
  border-radius: 10px;
  margin-bottom: 2px;
`;

const ReadStatus = styled.span`
  font-size: 0.65rem;
  color: #10b981;
  margin-bottom: 2px;
`;

const EmptyChat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 0.9rem;
`;

const PrivacyNotice = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #92400e;
  
  svg {
    color: #fbbf24;
    font-size: 1.2rem;
    flex-shrink: 0;
  }
`;

const DevModeNotice = styled.div`
  background: #dbeafe;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #1e40af;
  
  svg {
    color: #3b82f6;
    font-size: 1.2rem;
    flex-shrink: 0;
  }
`;

const PeriodButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    color: #7C3AED;
    text-decoration: underline;
  }
`;

Modal.setAppElement('#root');

const MatchingResultPage = ({ sidebarOpen = true }: { sidebarOpen?: boolean }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState<string>('all');
  const hasInitializedPeriod = useRef(false);
  const userHasInteractedWithPeriod = useRef(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSearch, setNicknameSearch] = useState(''); // 디바운스된 검색어
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatModal, setChatModal] = useState<{
    open: boolean;
    loading: boolean;
    messages: any[];
    users: any;
    isDevMode?: boolean;
  }>({
    open: false,
    loading: false,
    messages: [],
    users: null,
    isDevMode: false
  });

  // 회차 목록 불러오기
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await adminMatchingApi.getMatchingLogs();
        setLogs(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('회차 목록 조회 오류:', error);
        setLogs([]); // 에러 시 빈 배열로 설정
      }
    };
    loadLogs();
  }, []);

  // 진입 시 최초 1회만 가장 최근 회차로 기본 선택 (사용자가 이미 회차를 변경했으면 덮어쓰지 않음)
  useEffect(() => {
    if (logs.length > 0 && !hasInitializedPeriod.current && !userHasInteractedWithPeriod.current) {
      const lastLog = logs[logs.length - 1];
      if (lastLog?.id != null) {
        setPeriodId(String(lastLog.id));
        hasInitializedPeriod.current = true;
      }
    }
  }, [logs]);
  // 닉네임 입력 디바운스 (300ms) — 입력 멈춤 후에만 검색
  useEffect(() => {
    const t = setTimeout(() => setNicknameSearch(nicknameInput.trim()), 300);
    return () => clearTimeout(t);
  }, [nicknameInput]);

  // 매칭 결과 불러오기
  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      try {
        const response = await adminMatchingApi.getMatchingHistory(periodId, nicknameSearch || undefined);
        setResults(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('매칭 결과 조회 오류:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, [periodId, nicknameSearch]);

  // 회차 인덱스 → 연속 번호로 변환 함수
  const getPeriodDisplayNumber = (period_id: number|string) => {
    const idx = logs.findIndex(log => String(log.id) === String(period_id));
    return idx >= 0 ? idx + 1 : period_id;
  };

  // 프로필/선호스타일 파싱 함수 (신청현황 페이지와 동일)
  const parseArray = (val: any) => {
    if (!val) return [];
    try { return Array.isArray(val) ? val : JSON.parse(val); } catch { return []; }
  };

  // 모달 열기 (남/여 모두 지원)
  const openModal = (user: any) => {
    setModalUser(user);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalUser(null);
  };

  // 출생년도 표시 (뒤 두 자리)
  const formatBirthYear = (birthYear: number) => {
    if (!birthYear) return '-';
    const yearStr = String(birthYear);
    return yearStr.slice(-2) + '년생';
  };

  // 채팅 모달 열기
  const openChatModal = async (maleUserId: number, femaleUserId: number) => {
    if (!maleUserId || !femaleUserId) {
      toast.warn('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setChatModal({ open: true, loading: true, messages: [], users: null, isDevMode: false });
    
    try {
      const data: any = await adminChatApi.getChatMessages(maleUserId, femaleUserId);
      setChatModal({
        open: true,
        loading: false,
        messages: data.messages || [],
        users: data.users,
        isDevMode: data.isDevMode || false
      });
    } catch (error) {
      console.error('채팅 조회 오류:', error);
      toast.error('채팅 내역을 불러오는데 실패했습니다.');
      setChatModal({ open: false, loading: false, messages: [], users: null, isDevMode: false });
    }
  };

  const closeChatModal = () => {
    setChatModal({ open: false, loading: false, messages: [], users: null, isDevMode: false });
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <TitleRow>
        <Title>매칭 결과(커플) 리스트</Title>
        <RefreshButton onClick={() => window.location.reload()}>
          <FaSyncAlt />
          새로고침
        </RefreshButton>
      </TitleRow>
      
      <FilterRow>
        <span>회차:</span>
        <StyledSelect
          value={periodId}
          onChange={e => {
            userHasInteractedWithPeriod.current = true;
            setPeriodId(e.target.value);
          }}
        >
          <option value="all">전체</option>
          {logs.map((log, idx) => (
            <option key={log.id} value={log.id}>{idx+1}회차</option>
          ))}
        </StyledSelect>
        <span>닉네임:</span>
        <input value={nicknameInput} onChange={e=>setNicknameInput(e.target.value)} placeholder="닉네임 검색" style={{padding:'6px 10px',borderRadius:6,border:'1.5px solid #bbb',minWidth:120}}/>
      </FilterRow>
      
      <TableWrapper>
        {loading ? (
          <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="매칭 결과를 불러오는 중입니다..." />
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>회차</th>
                  <th>남성</th>
                  <th>여성</th>
                </tr>
              </thead>
              <tbody>
                {results.map(row => (
                  <tr key={row.id}>
                    <td>
                      <PeriodButton 
                        onClick={() => openChatModal(row.male_user_id, row.female_user_id)}
                        title="채팅 내역 보기"
                      >
                        {getPeriodDisplayNumber(row.period_id)}
                      </PeriodButton>
                    </td>
                    <td>
                      <UserInfo>
                        <div>
                          <NicknameBtn onClick={()=>openModal(row.male)}>
                            {row.male?.nickname || '-'}
                          </NicknameBtn>
                          {row.male?.message_count != null && (
                            <MessageCount>
                              <FaComments />
                              {row.male.message_count}
                            </MessageCount>
                          )}
                        </div>
                        <UserDetail>
                          {formatBirthYear(row.male?.birth_year)}
                          {row.male?.residence && ` · ${row.male.residence}`}
                          {getDisplayCompanyName(row.male?.company, row.male?.custom_company_name) && 
                            ` · ${getDisplayCompanyName(row.male?.company, row.male?.custom_company_name)}`}
                        </UserDetail>
                      </UserInfo>
                    </td>
                    <td>
                      <UserInfo>
                        <div>
                          <NicknameBtn onClick={()=>openModal(row.female)}>
                            {row.female?.nickname || '-'}
                          </NicknameBtn>
                          {row.female?.message_count != null && (
                            <MessageCount>
                              <FaComments />
                              {row.female.message_count}
                            </MessageCount>
                          )}
                        </div>
                        <UserDetail>
                          {formatBirthYear(row.female?.birth_year)}
                          {row.female?.residence && ` · ${row.female.residence}`}
                          {getDisplayCompanyName(row.female?.company, row.female?.custom_company_name) && 
                            ` · ${getDisplayCompanyName(row.female?.company, row.female?.custom_company_name)}`}
                        </UserDetail>
                      </UserInfo>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            {/* 모바일 카드 뷰 */}
            <MobileCardList>
              {results.map(row => (
                <MobileCard key={row.id}>
                  <CardHeader>
                    <PeriodBadge 
                      onClick={() => openChatModal(row.male_user_id, row.female_user_id)}
                      style={{ cursor: 'pointer' }}
                      title="채팅 내역 보기"
                    >
                      {getPeriodDisplayNumber(row.period_id)}회차
                    </PeriodBadge>
                  </CardHeader>
                  <CoupleRow>
                    <UserCard>
                      <UserName onClick={() => openModal(row.male)}>
                        {row.male?.nickname || '-'}
                      </UserName>
                      {row.male?.message_count != null && (
                        <MessageCount>
                          <FaComments />
                          {row.male.message_count}개
                        </MessageCount>
                      )}
                      <UserMeta>
                        {formatBirthYear(row.male?.birth_year)}
                        {row.male?.residence && ` · ${row.male.residence}`}
                        <br />
                        {getDisplayCompanyName(row.male?.company, row.male?.custom_company_name)}
                      </UserMeta>
                    </UserCard>
                    
                    <Divider>💑</Divider>
                    
                    <UserCard style={{ alignItems: 'flex-end' }}>
                      <UserName onClick={() => openModal(row.female)} style={{ textAlign: 'right' }}>
                        {row.female?.nickname || '-'}
                      </UserName>
                      {row.female?.message_count != null && (
                        <MessageCount style={{ justifyContent: 'flex-end' }}>
                          <FaComments />
                          {row.female.message_count}개
                        </MessageCount>
                      )}
                      <UserMeta style={{ textAlign: 'right' }}>
                        {formatBirthYear(row.female?.birth_year)}
                        {row.female?.residence && ` · ${row.female.residence}`}
                        <br />
                        {getDisplayCompanyName(row.female?.company, row.female?.custom_company_name)}
                      </UserMeta>
                    </UserCard>
                  </CoupleRow>
                </MobileCard>
              ))}
            </MobileCardList>
          </>
        )}
      </TableWrapper>
      
      {/* 프로필/선호스타일 모달 */}
      <ProfileDetailModal isOpen={modalOpen} onRequestClose={closeModal} user={modalUser ? { ...modalUser, email: modalUser.user?.email } : null} />
      
      {/* 채팅 조회 모달 */}
      <Modal
        isOpen={chatModal.open}
        onRequestClose={closeChatModal}
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000
          },
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '600px',
            padding: 0,
            border: 'none',
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <ChatModalContent>
          <ChatHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <ChatTitle>💬 채팅 내역</ChatTitle>
                {chatModal.users && (
                  <ChatSubtitle>
                    {chatModal.users.user1.nickname} ↔ {chatModal.users.user2.nickname}
                  </ChatSubtitle>
                )}
              </div>
              <button
                onClick={closeChatModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FaTimes />
              </button>
            </div>
          </ChatHeader>
          
          <ChatMessages>
            {chatModal.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                <InlineSpinner text="채팅 내역을 불러오는 중..." />
              </div>
            ) : (
              <>
                {/* 개발/운영 모드 알림 */}
                {!chatModal.isDevMode ? (
                  <PrivacyNotice>
                    <FaExclamationTriangle />
                    <div>
                      <strong>운영 모드:</strong> 사용자 프라이버시 보호를 위해 채팅 내용이 비공개 처리됩니다.
                    </div>
                  </PrivacyNotice>
                ) : (
                  <DevModeNotice>
                    <FaInfoCircle />
                    <div>
                      <strong>개발 모드:</strong> 디버깅을 위해 채팅 내용이 표시됩니다.
                    </div>
                  </DevModeNotice>
                )}
                
                {chatModal.messages.length === 0 ? (
                  <EmptyChat>
                    <FaComments style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
                    <div>주고받은 메시지가 없습니다.</div>
                  </EmptyChat>
                ) : (
                  chatModal.messages.map((msg, idx) => {
                const isSender = msg.sender_id === chatModal.users.user1.id;
                const isPrivate = msg.content === '[비공개]';
                // 비공개 메시지는 공백으로 표시 (말풍선 크기 유지를 위해 nbsp 사용)
                const displayContent = isPrivate ? '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0' : msg.content;
                return (
                  <MessageBubble key={idx} $isSender={isSender}>
                    <MessageSender $isSender={isSender}>{msg.sender_nickname}</MessageSender>
                    <MessageContentRow $isSender={isSender}>
                      {!isSender && (
                        <>
                          <MessageContent $isSender={isSender} $isPrivate={isPrivate}>
                            {displayContent}
                          </MessageContent>
                        </>
                      )}
                      {isSender && (
                        <>
                          {!msg.is_read && <UnreadBadge>1</UnreadBadge>}
                          <MessageContent $isSender={isSender} $isPrivate={isPrivate}>
                            {displayContent}
                          </MessageContent>
                          {msg.is_read && <ReadStatus>✓</ReadStatus>}
                        </>
                      )}
                    </MessageContentRow>
                    <MessageTime $isSender={isSender}>
                      {new Date(msg.timestamp).toLocaleString('ko-KR', KST_OPTS)}
                      {msg.is_read && msg.read_at && (() => {
                        const readDate = parseAsUtc(msg.read_at);
                        return readDate ? (
                          <span style={{ marginLeft: '8px', color: '#10b981' }}>
                            (읽음: {readDate.toLocaleString('ko-KR', KST_OPTS)})
                          </span>
                        ) : null;
                      })()}
                    </MessageTime>
                  </MessageBubble>
                );
              })
                )}
              </>
            )}
          </ChatMessages>
        </ChatModalContent>
      </Modal>
    </Container>
  );
};

export default MatchingResultPage; 