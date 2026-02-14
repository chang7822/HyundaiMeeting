import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { FaTimes } from 'react-icons/fa';
import { extraMatchingApi } from '../services/api.ts';
import { userApi } from '../services/api.ts';
import { useNavigate } from 'react-router-dom';
import { getDisplayCompanyName } from '../utils/companyDisplay.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

interface ExtraMatchingPageProps {
  sidebarOpen: boolean;
}

const Container = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;

  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1.5rem;
    padding-top: var(--mobile-top-padding, 80px);
  }
  @media (max-width: 480px) {
    padding: 1rem;
    padding-top: var(--mobile-top-padding, 70px);
  }
`;

const Content = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 1rem;
`;

const TitleWrapper = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.3;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
  margin: 0;
`;

const Subtitle = styled.p`
  color: #e5e7ff;
  margin-bottom: 0;
  margin-top: 0.5rem;
  font-size: 1rem;
  line-height: 1.5;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.2rem;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const SubtitleWrapper = styled.div`
  margin-bottom: 1.5rem;
`;

const TopActionBar = styled.div`
  margin-bottom: 1.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
`;

const TopActionInfo = styled.div`
  font-size: 0.85rem;
  color: #e5e7ff;
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const RemainingChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.8);
  color: #f9fafb;
  font-size: 0.82rem;
  font-weight: 600;
`;

const ChipButtonRow = styled.div`
  margin: 1rem 0 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;

    ${RemainingChip} {
      width: 100%;
      justify-content: center;
    }

    button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const MatchedNotice = styled.div`
  margin-top: 0.5rem;
  margin-bottom: 1.25rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%);
  border: 1px solid #facc15;
  color: #92400e;
  font-size: 0.86rem;
  font-weight: 600;
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.75rem;
`;

const Card = styled.div`
  background: #ffffff;
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  border: 1px solid #e5e7eb;
  margin-bottom: 1rem;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const PrimaryButton = styled.button`
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const SecondaryButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }
`;

const EntryList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
`;

const EntryCard = styled(Card)`
  margin-bottom: 0;
  position: relative;
  overflow: hidden;
`;

const EntryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const EntryTitle = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.95rem;
`;

const EntryMeta = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.4;
`;

const EmptyState = styled.div`
  padding: 2rem 1.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
`;

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 20px 16px;
  width: 95vw;
  max-width: 420px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.4);
  box-sizing: border-box;
`;

const ModalTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
`;

const ModalBody = styled.div`
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 14px;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const ModalSecondaryButton = styled.button`
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ModalPrimaryButton = styled.button`
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 0.8rem;
  font-weight: 600;
  color: #f9fafb;
  cursor: pointer;

  &:hover {
    opacity: 0.96;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ExtraMatchingPage: React.FC<ExtraMatchingPageProps> = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [status, setStatus] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [received, setReceived] = useState<{ entry: any; applies: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [pendingApplyEntry, setPendingApplyEntry] = useState<any | null>(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<{ type: 'accept' | 'reject'; applyId: number | null } | null>(null);
  const [showDecisionConfirm, setShowDecisionConfirm] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [showEntryProfileModal, setShowEntryProfileModal] = useState(false);
  const [hasUsedApply, setHasUsedApply] = useState(false);
  const [myProfile, setMyProfile] = useState<any | null>(null);
  const [entryAppealText, setEntryAppealText] = useState('');
  const [applyAppealText, setApplyAppealText] = useState('');
  const [showReceivedProfileModal, setShowReceivedProfileModal] = useState(false);
  const [selectedReceivedProfile, setSelectedReceivedProfile] = useState<any | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showExtraInfoModal, setShowExtraInfoModal] = useState(false);

  // 이메일 인증 체크
  useEffect(() => {
    if (isAuthLoading) return;
    if (user?.is_verified !== true) {
      toast.error('이메일 인증이 필요합니다.');
      navigate('/main');
      return;
    }
  }, [user?.is_verified, isAuthLoading, navigate]);

  const loadAll = async () => {
    // 이메일 인증이 안 된 경우 로드하지 않음
    if (user?.is_verified !== true) {
      return;
    }
    try {
      setLoading(true);
      const [statusRes, entriesRes, receivedRes, meRes] = await Promise.all([
        extraMatchingApi.getStatus(),
        extraMatchingApi.listEntries(),
        extraMatchingApi.getMyReceivedApplies(),
        userApi.getMe(),
      ]);
      setStatus(statusRes);
      // 서버에서 이번 회차에 이미 호감을 보낸 상태인지(hasActiveExtraApply) 내려주므로
      // 페이지를 새로 열었을 때도 버튼 비활성화 상태를 맞춰준다.
      if (statusRes && statusRes.hasActiveExtraApply) {
        setHasUsedApply(true);
      } else {
        setHasUsedApply(false);
      }
      setEntries(entriesRes?.entries || []);
      setReceived(receivedRes);
      setMyProfile(meRes || null);
      if (meRes) {
        const baseAppeal = meRes.appeal || '';
        setEntryAppealText(baseAppeal);
        setApplyAppealText(baseAppeal);
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '추가 매칭 도전 정보를 불러오는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 이메일 인증이 완료된 경우에만 로드
    if (user?.is_verified === true) {
      loadAll();
    }
  }, [user?.is_verified]);

  const handleCreateEntry = () => {
    setShowCreateConfirm(true);
  };

  const doCreateEntry = async () => {
    try {
      setActionLoading(true);
      // 모달에서 입력한 자기소개가 있으면 내 프로필에도 반영해서 이후 스냅샷에 사용
      const trimmedAppeal = entryAppealText.trim();
      if (trimmedAppeal && myProfile && trimmedAppeal !== (myProfile.appeal || '')) {
        try {
          await userApi.updateMe({ appeal: trimmedAppeal });
          setMyProfile({ ...myProfile, appeal: trimmedAppeal });
        } catch (e) {
          // updateMe 실패는 토스트만으로 안내하고 콘솔 출력은 생략
          toast.error('프로필 자기소개를 업데이트하는 중 오류가 발생했습니다.');
        }
      }

      const res = await extraMatchingApi.createEntry(trimmedAppeal);
      toast.success(res.message || '추가 매칭 도전이 등록되었습니다.');
      // 상태 갱신
      await loadAll();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '추가 매칭 도전을 등록하는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async (entryId: number) => {
    setPendingApplyEntry(entries.find((e) => e.id === entryId) || null);
    setShowApplyConfirm(true);
  };

  const doApply = async (entryId: number) => {
    try {
      setActionLoading(true);
      const trimmedAppeal = applyAppealText.trim();
      if (trimmedAppeal && myProfile && trimmedAppeal !== (myProfile.appeal || '')) {
        try {
          await userApi.updateMe({ appeal: trimmedAppeal });
          setMyProfile({ ...myProfile, appeal: trimmedAppeal });
        } catch (e) {
          // updateMe 실패는 토스트만으로 안내하고 콘솔 출력은 생략
          toast.error('프로필 자기소개를 업데이트하는 중 오류가 발생했습니다.');
        }
      }

      const res = await extraMatchingApi.applyEntry(entryId, trimmedAppeal);
      toast.success(
        res.message ||
          '상대에게 호감을 보냈습니다. 상대가 승낙을 하면 채팅방이 개설됩니다.'
      );
      setHasUsedApply(true);
      await loadAll();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '"호감 보내기" 신청 중 오류가 발생했습니다.';
      toast.error(msg);
      // 엔트리가 취소되었거나 상태가 바뀐 경우 UI를 최신화하기 위해 재조회
      await loadAll();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (applyId: number) => {
    setPendingDecision({ type: 'accept', applyId });
    setShowDecisionConfirm(true);
  };

  const doAccept = async (applyId: number) => {
    try {
      setActionLoading(true);
      const res = await extraMatchingApi.acceptApply(applyId);
      toast.success(
        res.message || '신청을 수락했습니다. 채팅에서 대화를 이어가 보세요.'
      );
      await loadAll();
      // 정규 매칭과 동일하게, 수락 후에는 메인 화면으로 이동하여
      // 매칭 성공 상태와 채팅 진입 버튼을 확인할 수 있도록 한다.
      navigate('/main');
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '신청을 수락하는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applyId: number) => {
    setPendingDecision({ type: 'reject', applyId });
    setShowDecisionConfirm(true);
  };

  const doReject = async (applyId: number) => {
    try {
      setActionLoading(true);
      const res = await extraMatchingApi.rejectApply(applyId);
      toast.success(
        res.message || '신청을 거절하고 상대에게 일부 별을 환불했습니다.'
      );
      await loadAll();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '신청을 거절하는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const doCancelEntry = async () => {
    if (!myEntry) return;
    try {
      setActionLoading(true);
      const res = await extraMatchingApi.cancelEntry(myEntry.id);
      toast.success(
        res.message ||
          '추가 매칭 도전 등록을 취소했습니다. 이미 사용된 별은 환불되지 않습니다.'
      );
      await loadAll();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '추가 매칭 도전을 취소하는 중 오류가 발생했습니다.';
      toast.error(msg);
      // 취소가 거절된 경우(이미 이성의 호감이 들어온 시점 등)에도
      // 최신 상태를 반영하기 위해 다시 조회
      await loadAll();
    } finally {
      setActionLoading(false);
    }
  };

  const myCanParticipate = !!status?.canParticipate;
  const rawMyEntry = status?.myExtraEntry || null;
  const myEntryStatus = rawMyEntry?.status || null;
  // 화면에서는 open / sold_out 상태의 엔트리만 "현재 활성 엔트리"로 취급
  const myEntry =
    rawMyEntry && (myEntryStatus === 'open' || myEntryStatus === 'sold_out')
      ? rawMyEntry
      : null;
  const currentPeriod = status?.currentPeriod || null;
  const isMatchedSuccess = status?.isMatchedSuccess === true;
  const hasActiveExtraApply = status?.hasActiveExtraApply === true;
  const myReceivedApplyCount =
    typeof status?.myReceivedApplyCount === 'number' ? status.myReceivedApplyCount : 0;
  const canCancelMyEntry =
    !!myEntry && myEntryStatus === 'open' && myReceivedApplyCount === 0;

  const [remainingText, setRemainingText] = useState<string>('');

  useEffect(() => {
    if (!currentPeriod || !currentPeriod.finish) {
      setRemainingText('');
      return;
    }

    const finish = new Date(currentPeriod.finish);
    const announce = currentPeriod.matching_announce ? new Date(currentPeriod.matching_announce) : null;

    const update = () => {
      const now = new Date();
      if (announce && now < announce) {
        setRemainingText('시작 전 · 잠시만 기다려 주세요');
        return;
      }
      if (now >= finish) {
        setRemainingText('종료 · 다음 회차를 기다려 주세요');
        // 매칭 종료 시간이 지나면 추가 매칭 도전 페이지에서 메인으로 이동
        // (백엔드에서도 기간 밖의 모든 액션을 막고 있으므로, 프론트에서도 화면 자체를 차단)
        toast.info('이번 회차 추가 매칭 도전 기간이 종료되었습니다.', {
          autoClose: 2500,
        });
        navigate('/main');
        return;
      }
      const diffMs = finish.getTime() - now.getTime();
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (60 * 60 * 24));
      const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      let label = '';
      if (days > 0) label += `${days}일 `;
      label += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
        seconds
      ).padStart(2, '0')}`;
      setRemainingText(label);
    };

    update();
    const timer = window.setInterval(update, 1000); // 초 단위 업데이트
    return () => window.clearInterval(timer);
  }, [currentPeriod?.finish, currentPeriod?.matching_announce]);

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Header>
          <TitleWrapper>
            <Title>추가 매칭 도전</Title>
            <Subtitle>
              이번 회차에서 매칭이 아쉬웠다면, <strong>추가 매칭 도전</strong>으로 한 번 더 인연을 찾아보세요.
            </Subtitle>
          </TitleWrapper>
          <CloseButton onClick={() => navigate('/main')}>
            <FaTimes />
          </CloseButton>
        </Header>
        <SubtitleWrapper />
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setShowExtraInfoModal(true)}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.18)',
              color: '#e5e7ff',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            추가 매칭 도전이란?
          </button>
          <button
            type="button"
            onClick={() => {
              if (!actionLoading) {
                loadAll();
              }
            }}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.16)',
              color: '#e5e7ff',
              width: 26,
              height: 26,
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              cursor: actionLoading ? 'default' : 'pointer',
              opacity: actionLoading ? 0.6 : 1,
            }}
            aria-label="추가 매칭 도전 새로고침"
          >
            ↻
          </button>
        </div>

        <ChipButtonRow>
          {remainingText && (
            <RemainingChip>
              <span style={{ fontSize: '0.9rem' }}>⏰</span>
              <span>
                추가 매칭 도전 가능 시간&nbsp;
                <strong>{remainingText}</strong>
              </span>
            </RemainingChip>
          )}
          <PrimaryButton
            type="button"
            onClick={() => {
              if (myEntry) {
                if (canCancelMyEntry && !actionLoading) {
                  setShowCancelConfirm(true);
                }
              } else {
                setShowCreateConfirm(true);
              }
            }}
            disabled={
              actionLoading ||
              loading ||
              !myCanParticipate ||
              isMatchedSuccess ||
              hasActiveExtraApply ||
              (!!myEntry && !canCancelMyEntry)
            }
          >
            {loading
              ? '정보 불러오는 중...'
              : myEntry
              ? canCancelMyEntry
                ? '추가 매칭 도전 취소하기'
                : '추가 매칭 도전 등록 완료'
              : isMatchedSuccess
              ? '이번 회차 매칭 성공자는 참여할 수 없습니다'
              : myCanParticipate
              ? '추가 매칭 도전 시작하기 (⭐10)'
              : '이번 회차에서는 추가 매칭 도전을 사용할 수 없습니다'}
          </PrimaryButton>
        </ChipButtonRow>
        {(!loading && !actionLoading) && (
          <div
            style={{
              marginTop: 4,
              marginBottom: 20,
              fontSize: '0.8rem',
              color: '#e5e7ff',
            }}
          >
            {isMatchedSuccess
              ? '이번 회차에서 매칭에 성공한 회원님은 추가 매칭 도전을 사용할 수 없습니다.'
              : hasActiveExtraApply
              ? '이미 다른 회원에게 호감을 보내셨습니다. 상대가 거절하면 추가 매칭 도전을 등록하실 수 있습니다.'
              : !myCanParticipate
              ? '이번 회차에서 매칭 실패자가 아니거나, 추가 매칭 도전 기간이 아닙니다.'
              : ''}
          </div>
        )}

        {showExtraInfoModal && (
          <ModalOverlay
            onClick={() => {
              setShowExtraInfoModal(false);
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>추가 매칭 도전이란?</ModalTitle>
              <ModalBody>
                <p style={{ marginBottom: 10 }}>
                  <strong>정규 매칭에서 아쉽게 인연을 못 찾은 회원</strong>이
                  한 번 더 상대를 만날 수 있도록 열어두는 <strong>추가 기회</strong>입니다.
                </p>
                <ul style={{ paddingLeft: 18, margin: '0 0 10px 0', fontSize: '0.86rem', color: '#374151' }}>
                  <li style={{ marginBottom: 4 }}>
                    <strong>참여 대상</strong> – 이번 회차에 매칭에 실패했거나 신청을 안 한 회원만 참여할 수 있습니다.
                  </li>
                  <li style={{ marginBottom: 4 }}>
                    <strong>진행 방식</strong> – 내 프로필을 추가로 공개해두면, 이성이 나에게
                    <strong>호감 보내기</strong>로 다시 한 번 신청을 보낼 수 있습니다.
                  </li>
                  <li style={{ marginBottom: 4 }}>
                    <strong>중복 매칭 방지</strong> – 내가 추가 매칭 도전에 등록하면,
                    이성들의 추가 매칭 도전 목록에서 <strong>호감 보내기 버튼을 사용할 수 없습니다.</strong>
                  </li>
                  <li style={{ marginBottom: 4 }}>
                    <strong>재화 사용</strong> – 추가 매칭 도전 등록에는 <strong>별 10개</strong>가 사용되며,
                    이미 사용한 별은 <strong>취소해도 환불되지 않습니다.</strong>
                  </li>
                  <li style={{ marginBottom: 4 }}>
                    <strong>취소 규칙</strong> – 이성의 호감 표현이 <strong>도착하기 전까지만</strong> 직접 취소할 수 있고,
                    취소 후에는 이번 회차에 다시 등록할 수 없습니다.
                  </li>
                  <li style={{ marginBottom: 4 }}>
                    <strong>환불 규칙</strong> – 기간이 끝날 때까지 단 한 번도 호감을 받지 못한 경우에만
                    <strong>별 5개가 자동 환불</strong>됩니다.
                  </li>
                </ul>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#4b5563' }}>
                  추가 매칭 도전에서 한 번이라도 매칭이 성사되면, 정규 매칭과 마찬가지로
                  <strong>매칭 이력에 기록</strong>되어 다음 회차 매칭에서는 서로 다시 매칭되지 않습니다.
                </p>
              </ModalBody>
              <ModalActions>
                <ModalPrimaryButton
                  type="button"
                  onClick={() => setShowExtraInfoModal(false)}
                >
                  확인
                </ModalPrimaryButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
        {isMatchedSuccess && (
          <MatchedNotice>
            해당 회차 <strong>매칭에 성공한 회원님</strong>은 추가 매칭 신청에 참여하실 수 없습니다.
            <br />
            이 페이지에서는 다른 회원들의 추가 매칭 도전을 <strong>구경만</strong> 하실 수 있어요.
          </MatchedNotice>
        )}

        {showReceivedProfileModal && selectedReceivedProfile && (
          <ModalOverlay
            onClick={() => {
              if (!actionLoading) {
                setShowReceivedProfileModal(false);
                setSelectedReceivedProfile(null);
              }
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>상대 프로필 보기</ModalTitle>
              <ModalBody>
                <div style={{ fontSize: '0.9rem', color: '#111827', marginBottom: 6 }}>
                  <strong>
                    {selectedReceivedProfile.gender === 'male'
                      ? '남성'
                      : selectedReceivedProfile.gender === 'female'
                      ? '여성'
                      : '회원'}
                    {selectedReceivedProfile.birth_year && ` · ${selectedReceivedProfile.birth_year}년생`}
                  </strong>
                </div>
                <div style={{ fontSize: '0.86rem', color: '#4b5563', lineHeight: 1.5 }}>
                  {getDisplayCompanyName(selectedReceivedProfile.company, selectedReceivedProfile.custom_company_name) && <div>회사: {getDisplayCompanyName(selectedReceivedProfile.company, selectedReceivedProfile.custom_company_name)}</div>}
                  {selectedReceivedProfile.education && <div>학력: {selectedReceivedProfile.education}</div>}
                  {selectedReceivedProfile.residence && <div>거주지: {selectedReceivedProfile.residence}</div>}
                  {selectedReceivedProfile.mbti && <div>MBTI: {selectedReceivedProfile.mbti}</div>}
                  {selectedReceivedProfile.height && <div>키: {selectedReceivedProfile.height}cm</div>}
                  {selectedReceivedProfile.body_type && <div>체형: {selectedReceivedProfile.body_type}</div>}
                  {selectedReceivedProfile.drinking && <div>음주: {selectedReceivedProfile.drinking}</div>}
                  {selectedReceivedProfile.smoking && <div>흡연: {selectedReceivedProfile.smoking}</div>}
                  {selectedReceivedProfile.religion && <div>종교: {selectedReceivedProfile.religion}</div>}
                  {selectedReceivedProfile.marital_status && (
                    <div>결혼 여부: {selectedReceivedProfile.marital_status}</div>
                  )}
                  {selectedReceivedProfile.interests && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>관심사</span>
                      <br />
                      <span>{selectedReceivedProfile.interests}</span>
                    </div>
                  )}
                  {selectedReceivedProfile.appearance && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>외모 스타일</span>
                      <br />
                      <span>{selectedReceivedProfile.appearance}</span>
                    </div>
                  )}
                  {selectedReceivedProfile.personality && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>성격</span>
                      <br />
                      <span>{selectedReceivedProfile.personality}</span>
                    </div>
                  )}
                  {selectedReceivedProfile.appeal && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>자기소개 / 어필</span>
                      <br />
                      <span>{selectedReceivedProfile.appeal}</span>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalActions>
                <ModalPrimaryButton
                  type="button"
                  onClick={() => {
                    setShowReceivedProfileModal(false);
                    setSelectedReceivedProfile(null);
                  }}
                  disabled={actionLoading}
                >
                  닫기
                </ModalPrimaryButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}

        {myEntry && (
          <TopActionInfo>
            이번 회차에 등록된 추가 매칭 도전이 있습니다. 이성들이 회원님의 프로필을 보고 호감을 보낼 수 있어요.
          </TopActionInfo>
        )}

        {myEntry && (
          <Section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <SectionTitle style={{ marginBottom: 0 }}>나에게 온 호감</SectionTitle>
              <button
                type="button"
                onClick={() => setShowDecisionConfirm(true)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  textDecoration: 'underline',
                }}
              >
                안내
              </button>
            </div>
            {loading ? (
              <Card>
                <p style={{ margin: 0, color: '#6b7280' }}>신청 내역을 불러오는 중입니다...</p>
              </Card>
            ) : !received?.applies || received.applies.length === 0 ? (
              <Card>
                <EmptyState>
                  아직 나에게 도착한 호감이 없습니다.
                  <br />
                  추가 매칭 도전을 등록하면 상대가 나에게 어필을 보낼 수 있어요.
                </EmptyState>
              </Card>
            ) : (
              received.applies.map((apply) => {
                const isAccepted = apply.status === 'accepted';
                const isRejected = apply.status === 'rejected';

                return (
                  <Card
                  key={apply.id}
                  onClick={() => {
                    if (apply.profile) {
                      setSelectedReceivedProfile(apply.profile);
                      setShowReceivedProfileModal(true);
                    }
                  }}
                  style={{
                    cursor: apply.profile ? 'pointer' : 'default',
                    position: 'relative',
                    overflow: 'hidden',
                    background: isAccepted ? '#ecfdf3' : '#ffffff',
                    borderColor: isAccepted ? '#bbf7d0' : '#e5e7eb',
                  }}
                >
                  {/* 닉네임은 숨기고, 매칭 도전 리스트와 동일하게 성별 + 연령/키만 헤더로 표시 */}
                  <div style={{ marginBottom: 6 }}>
                    <strong>
                      {apply.profile?.gender === 'male'
                        ? '남성'
                        : apply.profile?.gender === 'female'
                        ? '여성'
                        : '회원'}{' '}
                      ·{' '}
                      {apply.profile?.birth_year
                        ? `${apply.profile.birth_year}년생`
                        : apply.profile?.height
                        ? `${apply.profile.height}cm`
                        : '연령/키 비공개'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#4b5563', marginBottom: 4 }}>
                    {getDisplayCompanyName(apply.profile?.company, apply.profile?.custom_company_name) && (
                      <span style={{ marginRight: 8 }}>회사: {getDisplayCompanyName(apply.profile?.company, apply.profile?.custom_company_name)}</span>
                    )}
                    {apply.profile?.education && (
                      <span style={{ marginRight: 8 }}>학력: {apply.profile.education}</span>
                    )}
                    {apply.profile?.residence && (
                      <>
                        <br />
                        <span style={{ marginRight: 8 }}>거주지: {apply.profile.residence}</span>
                      </>
                    )}
                    {apply.profile?.mbti && (
                      <span style={{ marginRight: 8 }}>MBTI: {apply.profile.mbti}</span>
                    )}
                  </div>
                  {apply.status === 'pending' && (
                    <ButtonRow style={{ justifyContent: 'flex-end' }}>
                      <PrimaryButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(apply.id);
                        }}
                        disabled={actionLoading || isMatchedSuccess}
                      >
                        수락
                      </PrimaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(apply.id);
                        }}
                        disabled={actionLoading || isMatchedSuccess}
                      >
                        거절
                      </SecondaryButton>
                    </ButtonRow>
                  )}
                  {isRejected && (
                    <ButtonRow style={{ justifyContent: 'flex-end' }}>
                      <SecondaryButton type="button" disabled>
                        거절함
                      </SecondaryButton>
                    </ButtonRow>
                  )}
                  {isRejected && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(156, 163, 175, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#111827',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textShadow: '0 1px 2px rgba(255,255,255,0.7)',
                      }}
                    >
                      거절함
                    </div>
                  )}
                </Card>
              );
            })
            )}
          </Section>
        )}

        <Section>
          <SectionTitle>이성들의 추가 매칭 도전</SectionTitle>
          {loading ? (
            <Card>
              <p style={{ margin: 0, color: '#6b7280' }}>리스트를 불러오는 중입니다...</p>
            </Card>
          ) : entries.length === 0 ? (
            <Card>
              <EmptyState>
                아직 추가 매칭을 도전한 이성이 없습니다.
                내가 먼저 용기내어 도전을 해보는 건 어떨까요?
              </EmptyState>
            </Card>
          ) : (
            <EntryList>
              {entries.map((entry) => {
                const isSoldOut = entry.status === 'sold_out';
                const myApplyStatus = entry.my_apply_status as 'pending' | 'accepted' | 'rejected' | null;
                const isRejected = myApplyStatus === 'rejected';
                const isPendingMine = myApplyStatus === 'pending';

                const overlayBg = isPendingMine
                  ? 'rgba(244, 114, 182, 0.45)' // 핑크톤 (호감 대기중)
                  : 'rgba(156, 163, 175, 0.55)'; // 회색톤 (거절/품절)

                const overlayText = isSoldOut
                  ? '품절'
                  : isRejected
                  ? '호감을 거절한 상대'
                  : isPendingMine
                  ? '대답을 기다리는 중'
                  : '';

                return (
                  <EntryCard
                    key={entry.id}
                    onClick={() => {
                      setSelectedEntry(entry);
                      setShowEntryProfileModal(true);
                    }}
                    style={{
                      cursor: 'pointer',
                      opacity: isSoldOut || isRejected || isPendingMine ? 0.9 : 1,
                    }}
                  >
                    <EntryHeader>
                      <EntryTitle>
                        {entry.gender === 'male'
                          ? '남성'
                          : entry.gender === 'female'
                          ? '여성'
                          : '회원'}{' '}
                        ·{' '}
                        {entry.age
                          ? `${entry.age}년생`
                          : entry.height
                          ? `${entry.height}cm`
                          : '연령/키 비공개'}
                      </EntryTitle>
                    </EntryHeader>
                    <EntryMeta>
                      {getDisplayCompanyName(entry.company, entry.custom_company_name) && <div>회사: {getDisplayCompanyName(entry.company, entry.custom_company_name)}</div>}
                      {entry.education && <div>학력: {entry.education}</div>}
                      {entry.residence && <div>거주지: {entry.residence}</div>}
                      {entry.mbti && <div>MBTI: {entry.mbti}</div>}
                    </EntryMeta>
                    {(isSoldOut || isRejected || isPendingMine) && overlayText && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: overlayBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#111827',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          textShadow: '0 1px 2px rgba(255,255,255,0.7)',
                        }}
                      >
                        {overlayText}
                      </div>
                    )}
                  </EntryCard>
                );
              })}
            </EntryList>
          )}
        </Section>

        {/* 모달들 */}
        {showCreateConfirm && myProfile && (
          <ModalOverlay
            onClick={() => {
              if (!actionLoading) setShowCreateConfirm(false);
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>추가 매칭 도전 등록</ModalTitle>
              <ModalBody>
                <p style={{ marginBottom: 8 }}>
                  아래 프로필 내용과 자기소개로 <strong>추가 매칭 도전</strong>을 등록할까요?
                </p>
                <br />
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    marginBottom: 8,
                    fontSize: '0.88rem',
                    color: '#374151',
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    <strong>
                      {myProfile.gender === 'male'
                        ? '남성'
                        : myProfile.gender === 'female'
                        ? '여성'
                        : '회원'}
                      {myProfile.birth_year && ` · ${myProfile.birth_year}년생`}
                    </strong>
                  </div>
                  {getDisplayCompanyName(myProfile.company, myProfile.custom_company_name) && <div>회사: {getDisplayCompanyName(myProfile.company, myProfile.custom_company_name)}</div>}
                  {myProfile.education && <div>학력: {myProfile.education}</div>}
                  {myProfile.residence && <div>거주지: {myProfile.residence}</div>}
                  {myProfile.mbti && <div>MBTI: {myProfile.mbti}</div>}
                  {myProfile.height && <div>키: {myProfile.height}cm</div>}
                  {myProfile.body_type && <div>체형: {myProfile.body_type}</div>}
                  {myProfile.drinking && <div>음주: {myProfile.drinking}</div>}
                  {myProfile.smoking && <div>흡연: {myProfile.smoking}</div>}
                  {myProfile.religion && <div>종교: {myProfile.religion}</div>}
                  {myProfile.marital_status && <div>결혼 여부: {myProfile.marital_status}</div>}
                  {myProfile.interests && (
                    <div style={{ marginTop: 6 }}>
                      <strong>관심사</strong>
                      <br />
                      <span>{myProfile.interests}</span>
                    </div>
                  )}
                  {myProfile.appearance && (
                    <div style={{ marginTop: 6 }}>
                      <strong>외모 스타일</strong>
                      <br />
                      <span>{myProfile.appearance}</span>
                    </div>
                  )}
                  {myProfile.personality && (
                    <div style={{ marginTop: 6 }}>
                      <strong>성격</strong>
                      <br />
                      <span>{myProfile.personality}</span>
                    </div>
                  )}
                  {myProfile.appeal && (
                    <div style={{ marginTop: 6 }}>
                      <strong>현재 자기소개 / 어필</strong>
                      <br />
                      <span>{myProfile.appeal}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 4,
                    }}
                  >
                    이번 추가 매칭 도전에 사용할 자기소개 (프로필 자기소개 변경)
                  </label>
                  <textarea
                    rows={4}
                    value={entryAppealText}
                    onChange={(e) => setEntryAppealText(e.target.value)}
                    placeholder="상대에게 보여줄 자기소개/어필 문구를 입력하세요."
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  이 작업에는 <strong>별 10개</strong>가 사용되며, 한 회차에 한 번만 등록할 수 있습니다.
                </p>
              </ModalBody>
              <ModalActions>
                <ModalSecondaryButton
                  type="button"
                  onClick={() => setShowCreateConfirm(false)}
                  disabled={actionLoading}
                >
                  취소
                </ModalSecondaryButton>
                <ModalPrimaryButton
                  type="button"
                  onClick={async () => {
                    await doCreateEntry();
                    setShowCreateConfirm(false);
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? '등록 중...' : '추가 매칭 도전(⭐10)'}
                </ModalPrimaryButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}

        {showCancelConfirm && myEntry && (
          <ModalOverlay
            onClick={() => {
              if (!actionLoading) setShowCancelConfirm(false);
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>추가 매칭 도전 취소</ModalTitle>
              <ModalBody>
                <p style={{ margin: 0 }}>
                  등록하신 <strong>추가 매칭 도전</strong>을 취소하시겠어요?
                  <br />
                  이성의 호감 표현이 오기 전까지만 취소가 가능하며,
                  <br />
                  <strong>취소 시 사용하신 별은 환불되지 않습니다.</strong>
                </p>
              </ModalBody>
              <ModalActions>
                <ModalSecondaryButton
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={actionLoading}
                >
                  유지할게요
                </ModalSecondaryButton>
                <ModalPrimaryButton
                  type="button"
                  onClick={async () => {
                    await doCancelEntry();
                    setShowCancelConfirm(false);
                  }}
                  disabled={actionLoading}
                >
                  취소할게요
                </ModalPrimaryButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}

        {showApplyConfirm && pendingApplyEntry && (
          <ModalOverlay
            onClick={() => {
              if (!actionLoading) {
                setShowApplyConfirm(false);
                setPendingApplyEntry(null);
              }
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>호감 보내기</ModalTitle>
              <ModalBody>
                <p style={{ marginBottom: 6 }}>
                  이 회원에게 <strong>호감</strong>을 보내시겠어요?
                </p>
                {myProfile && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      marginBottom: 8,
                      fontSize: '0.88rem',
                      color: '#374151',
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ marginBottom: 6 }}>
                      <strong>
                        {myProfile.gender === 'male'
                          ? '남성'
                          : myProfile.gender === 'female'
                          ? '여성'
                          : '회원'}
                        {myProfile.birth_year && ` · ${myProfile.birth_year}년생`}
                      </strong>
                    </div>
                    {getDisplayCompanyName(myProfile.company, myProfile.custom_company_name) && <div>회사: {getDisplayCompanyName(myProfile.company, myProfile.custom_company_name)}</div>}
                    {myProfile.education && <div>학력: {myProfile.education}</div>}
                    {myProfile.residence && <div>거주지: {myProfile.residence}</div>}
                    {myProfile.mbti && <div>MBTI: {myProfile.mbti}</div>}
                    {myProfile.height && <div>키: {myProfile.height}cm</div>}
                    {myProfile.body_type && <div>체형: {myProfile.body_type}</div>}
                    {myProfile.drinking && <div>음주: {myProfile.drinking}</div>}
                    {myProfile.smoking && <div>흡연: {myProfile.smoking}</div>}
                    {myProfile.religion && <div>종교: {myProfile.religion}</div>}
                    {myProfile.marital_status && <div>결혼 여부: {myProfile.marital_status}</div>}
                    {myProfile.interests && (
                      <div style={{ marginTop: 6 }}>
                        <strong>관심사</strong>
                        <br />
                        <span>{myProfile.interests}</span>
                      </div>
                    )}
                    {myProfile.appearance && (
                      <div style={{ marginTop: 6 }}>
                        <strong>외모 스타일</strong>
                        <br />
                        <span>{myProfile.appearance}</span>
                      </div>
                    )}
                    {myProfile.personality && (
                      <div style={{ marginTop: 6 }}>
                        <strong>성격</strong>
                        <br />
                        <span>{myProfile.personality}</span>
                      </div>
                    )}
                    {myProfile.appeal && (
                      <div style={{ marginTop: 6 }}>
                        <strong>현재 자기소개 / 어필</strong>
                        <br />
                        <span>{myProfile.appeal}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 4,
                    }}
                  >
                    이번 호감 보내기에 사용할 자기소개<br/>(프로필 자기소개가 갱신 됩니다.)
                  </label>
                  <textarea
                    rows={4}
                    value={applyAppealText}
                    onChange={(e) => setApplyAppealText(e.target.value)}
                    placeholder="상대에게 보여줄 자기소개/어필 문구를 입력하세요."
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <p style={{ marginTop: 8, marginBottom: 0, fontSize: '0.88rem', color: '#4b5563' }}>
                  이번 호감 보내기에는 <strong>별 10개</strong>가 사용되며,<br/> 한 번 보내면 <strong>취소할 수 없습니다.</strong>
                  <br />
                  상대가 <strong>승낙</strong>하면 <strong>매칭이 성사</strong>되고 채팅방이 개설됩니다.
                  <br />
                  상대가 <strong>거절</strong>할 경우에는 <strong>별 5개</strong>가 자동으로 환불됩니다.
                </p>
              </ModalBody>
              <ModalActions>
                <ModalPrimaryButton
                  type="button"
                  onClick={async () => {
                    await doApply(pendingApplyEntry.id);
                    setShowApplyConfirm(false);
                    setPendingApplyEntry(null);
                  }}
                  disabled={actionLoading || hasUsedApply || !!myEntry}
                >
                  {actionLoading ? '신청 중...' : '호감 보내기(⭐10)'}
                </ModalPrimaryButton>
                <ModalSecondaryButton
                  type="button"
                  onClick={() => {
                    setShowApplyConfirm(false);
                    setPendingApplyEntry(null);
                  }}
                  disabled={actionLoading}
                >
                  취소
                </ModalSecondaryButton>
              </ModalActions>
              {(hasUsedApply || myEntry) && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    textAlign: 'right',
                  }}
                >
                  {hasUsedApply && hasActiveExtraApply && !myEntry
                    ? '상대방의 대답을 기다리는 중입니다.'
                    : hasUsedApply
                    ? '이미 다른분에게 호감을 보냈습니다.'
                    : '추가 매칭 도전에 등록한 상태에서는 호감을 보낼 수 없습니다.'}
                </div>
              )}
            </ModalContent>
          </ModalOverlay>
        )}

        {showEntryProfileModal && selectedEntry && (
          <ModalOverlay
            onClick={() => {
              if (!actionLoading) {
                setShowEntryProfileModal(false);
              }
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>추가 매칭 도전 프로필</ModalTitle>
              <ModalBody>
                
                <div style={{ fontSize: '0.9rem', color: '#111827', marginBottom: 6 }}>
                  <strong>
                    {selectedEntry.gender === 'male'
                      ? '남성'
                      : selectedEntry.gender === 'female'
                      ? '여성'
                      : '회원'}
                    {selectedEntry.age && ` · ${selectedEntry.age}년생`}
                  </strong>
                </div>
                <div style={{ fontSize: '0.86rem', color: '#4b5563', lineHeight: 1.5 }}>
                  {getDisplayCompanyName(selectedEntry.company, selectedEntry.custom_company_name) && <div>회사: {getDisplayCompanyName(selectedEntry.company, selectedEntry.custom_company_name)}</div>}
                  {selectedEntry.education && <div>학력: {selectedEntry.education}</div>}
                  {selectedEntry.residence && <div>거주지: {selectedEntry.residence}</div>}
                  {selectedEntry.mbti && <div>MBTI: {selectedEntry.mbti}</div>}
                  {selectedEntry.height && <div>키: {selectedEntry.height}cm</div>}
                  {selectedEntry.profile?.body_type && <div>체형: {selectedEntry.profile.body_type}</div>}
                  {selectedEntry.profile?.drinking && <div>음주: {selectedEntry.profile.drinking}</div>}
                  {selectedEntry.profile?.smoking && <div>흡연: {selectedEntry.profile.smoking}</div>}
                  {selectedEntry.profile?.religion && <div>종교: {selectedEntry.profile.religion}</div>}
                  {selectedEntry.profile?.marital_status && (
                    <div>결혼 여부: {selectedEntry.profile.marital_status}</div>
                  )}
                  {selectedEntry.profile?.interests && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>관심사</span>
                      <br />
                      <span>{selectedEntry.profile.interests}</span>
                    </div>
                  )}
                  {selectedEntry.profile?.appearance && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>외모 스타일</span>
                      <br />
                      <span>{selectedEntry.profile.appearance}</span>
                    </div>
                  )}
                  {selectedEntry.profile?.personality && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>성격</span>
                      <br />
                      <span>{selectedEntry.profile.personality}</span>
                    </div>
                  )}
                  {selectedEntry.profile?.appeal && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>자기소개 / 어필</span>
                      <br />
                      <span>{selectedEntry.profile.appeal}</span>
                    </div>
                  )}
                  {selectedEntry.profile?.extra_appeal_text && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontWeight: 600 }}>한 줄 어필</span>
                      <br />
                      <span>{selectedEntry.profile.extra_appeal_text}</span>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalActions>
                <ModalPrimaryButton
                  type="button"
                  disabled={
                    actionLoading ||
                    isMatchedSuccess ||
                    hasUsedApply ||
                    !!myEntry ||
                    selectedEntry.status === 'sold_out' ||
                    selectedEntry.my_apply_status === 'rejected' ||
                    selectedEntry.my_apply_status === 'accepted' ||
                    selectedEntry.my_apply_status === 'pending'
                  }
                  onClick={() => {
                    if (
                      !hasUsedApply &&
                      !isMatchedSuccess &&
                      !actionLoading &&
                      !myEntry &&
                      selectedEntry &&
                      selectedEntry.status !== 'sold_out' &&
                      selectedEntry.my_apply_status !== 'rejected' &&
                      selectedEntry.my_apply_status !== 'accepted' &&
                      selectedEntry.my_apply_status !== 'pending'
                    ) {
                      setShowEntryProfileModal(false);
                      handleApply(selectedEntry.id);
                    }
                  }}
                >
                  호감 보내기 (⭐10)
                </ModalPrimaryButton>
                <ModalSecondaryButton
                  type="button"
                  onClick={() => setShowEntryProfileModal(false)}
                  disabled={actionLoading}
                >
                  닫기
                </ModalSecondaryButton>
              </ModalActions>
              {(hasUsedApply ||
                myEntry ||
                selectedEntry.status === 'sold_out' ||
                selectedEntry.my_apply_status === 'rejected' ||
                selectedEntry.my_apply_status === 'accepted' ||
                selectedEntry.my_apply_status === 'pending') && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    textAlign: 'right',
                  }}
                >
                  {hasUsedApply
                    ? '이번 회차에는 이미 호감을 보냈습니다.'
                    : myEntry
                    ? '추가 매칭 도전에 등록한 상태에서는 호감을 보낼 수 없습니다.'
                    : selectedEntry.status === 'sold_out'
                    ? '이미 다른 회원과 매칭이 완료되어 호감을 보낼 수 없습니다.'
                    : selectedEntry.my_apply_status === 'rejected'
                    ? '이 회원에게 보낸 호감을 이미 거절당했습니다.'
                    : selectedEntry.my_apply_status === 'pending'
                    ? '상대방의 대답을 기다리고 있습니다.'
                    : '이 회원에게는 더 이상 호감을 보낼 수 없습니다.'}
                </div>
              )}
            </ModalContent>
          </ModalOverlay>
        )}

        {showDecisionConfirm && pendingDecision && pendingDecision.applyId && pendingDecision.type !== undefined && (
          <ModalOverlay
            onClick={() => {
              if (!actionLoading) {
                setShowDecisionConfirm(false);
                setPendingDecision(null);
              }
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>
                {pendingDecision.type === 'accept' ? '채팅방 개설 안내' : '호감 거절'}
              </ModalTitle>
              <ModalBody>
                {pendingDecision.type === 'accept' ? (
                  <p style={{ margin: 0 }}>
                    이 신청을 <strong>수락</strong>하면 상대와의 <strong>채팅방이 개설</strong>됩니다.
                    <br />
                    수락 시 같은 추가 매칭 도전에 들어온 다른 호감들은 <strong>자동으로 거절</strong>되며,
                    <br />
                    그 회원들에게는 각자 <strong>별 5개</strong>가 환불됩니다.
                    <br />
                    수락 후에는 이 선택을 되돌릴 수 없습니다.
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>
                    이 신청을 <strong>거절</strong>하면 상대에게 <strong>별 5개</strong>가 반환됩니다.
                    <br />
                    거절 후에는 다시 같은 신청을 되살릴 수 없습니다.
                  </p>
                )}
              </ModalBody>
              <ModalActions>
                <ModalSecondaryButton
                  type="button"
                  onClick={() => {
                    setShowDecisionConfirm(false);
                    setPendingDecision(null);
                  }}
                  disabled={actionLoading}
                >
                  취소
                </ModalSecondaryButton>
                <ModalPrimaryButton
                  type="button"
                  onClick={async () => {
                    if (pendingDecision.type === 'accept') {
                      await doAccept(pendingDecision.applyId!);
                    } else {
                      await doReject(pendingDecision.applyId!);
                    }
                    setShowDecisionConfirm(false);
                    setPendingDecision(null);
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? '처리 중...'
                    : pendingDecision.type === 'accept'
                    ? '수락할게요'
                    : '거절할게요'}
                </ModalPrimaryButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* "나에게 온 호감" 안내 모달 (설명용) */}
        {showDecisionConfirm && pendingDecision === null && (
          <ModalOverlay
            onClick={() => {
              setShowDecisionConfirm(false);
            }}
          >
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>나에게 온 호감</ModalTitle>
              <ModalBody>
                추가 등록한 회원님의 프로필을 보고 마음에 들어,
                <br />
                회원님께 호감을 보낸 이성들의 리스트입니다.
                <br />
                이곳에서 수락하면 해당 이성과 채팅방이 개설되고, 거절하면 상대에게 일부 별이 반환됩니다.
              </ModalBody>
              <ModalActions>
                <ModalPrimaryButton
                  type="button"
                  onClick={() => {
                    setShowDecisionConfirm(false);
                  }}
                >
                  확인
                </ModalPrimaryButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </Content>
    </Container>
  );
};

export default ExtraMatchingPage;


