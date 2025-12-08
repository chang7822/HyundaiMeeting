import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { extraMatchingApi } from '../services/api.ts';

interface ExtraMatchingPageProps {
  sidebarOpen: boolean;
}

const Container = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: #f8f9fa;
  transition: margin-left 0.3s;

  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: 80px;
  }
`;

const Content = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: #111827;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
  font-weight: 800;
`;

const Subtitle = styled.p`
  color: #4b5563;
  margin-bottom: 2rem;
  font-size: 0.95rem;
  line-height: 1.6;
`;

const Section = styled.section`
  margin-bottom: 2rem;
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

const ExtraMatchingPage: React.FC<ExtraMatchingPageProps> = ({ sidebarOpen }) => {
  const [status, setStatus] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [received, setReceived] = useState<{ entry: any; applies: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [statusRes, entriesRes, receivedRes] = await Promise.all([
        extraMatchingApi.getStatus(),
        extraMatchingApi.listEntries(),
        extraMatchingApi.getMyReceivedApplies(),
      ]);
      setStatus(statusRes);
      setEntries(entriesRes?.entries || []);
      setReceived(receivedRes);
    } catch (error: any) {
      console.error('[ExtraMatchingPage] 데이터 로드 오류:', error);
      const msg =
        error?.response?.data?.message ||
        '추가 매칭 도전 정보를 불러오는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateEntry = async () => {
    try {
      setActionLoading(true);
      const res = await extraMatchingApi.createEntry();
      toast.success(res.message || '추가 매칭 도전이 등록되었습니다.');
      // 상태 갱신
      await loadAll();
    } catch (error: any) {
      console.error('[ExtraMatchingPage] 엔트리 생성 오류:', error);
      const msg =
        error?.response?.data?.message ||
        '추가 매칭 도전을 등록하는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async (entryId: number) => {
    try {
      setActionLoading(true);
      const res = await extraMatchingApi.applyEntry(entryId);
      toast.success(res.message || '상대에게 "저는 어때요"를 보냈습니다.');
      await loadAll();
    } catch (error: any) {
      console.error('[ExtraMatchingPage] apply 오류:', error);
      const msg =
        error?.response?.data?.message ||
        '"저는 어때요" 신청 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (applyId: number) => {
    try {
      setActionLoading(true);
      const res = await extraMatchingApi.acceptApply(applyId);
      toast.success(
        res.message || '신청을 수락했습니다. 채팅에서 대화를 이어가 보세요.'
      );
      await loadAll();
    } catch (error: any) {
      console.error('[ExtraMatchingPage] accept 오류:', error);
      const msg =
        error?.response?.data?.message ||
        '신청을 수락하는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applyId: number) => {
    try {
      setActionLoading(true);
      const res = await extraMatchingApi.rejectApply(applyId);
      toast.success(
        res.message || '신청을 거절하고 상대에게 일부 별을 환불했습니다.'
      );
      await loadAll();
    } catch (error: any) {
      console.error('[ExtraMatchingPage] reject 오류:', error);
      const msg =
        error?.response?.data?.message ||
        '신청을 거절하는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const myCanParticipate = !!status?.canParticipate;
  const myEntry = status?.myExtraEntry || null;
  const starBalance = typeof status?.starBalance === 'number' ? status.starBalance : null;

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Title>추가 매칭 도전</Title>
        <Subtitle>
          이번 회차에서 매칭이 아쉬웠다면, <strong>추가 매칭 도전</strong>으로 한 번 더 인연을
          찾아보세요. 매칭 실패자만 직접 참여할 수 있고, 나머지는 구경만 가능합니다.
        </Subtitle>

        <Section>
          <SectionTitle>내 상태</SectionTitle>
          <Card>
            {loading ? (
              <p style={{ color: '#6b7280', margin: 0 }}>내 정보를 불러오는 중입니다...</p>
            ) : (
              <>
                <p style={{ margin: 0, marginBottom: 6, color: '#111827' }}>
                  {myCanParticipate
                    ? myEntry
                      ? '이번 회차에 추가 매칭 도전이 등록되어 있습니다.'
                      : '이번 회차에서 매칭에 아쉬웠다면, 추가 매칭 도전에 참여해 보세요.'
                    : '이번 회차에서 매칭 실패자가 아니거나, 추가 매칭 도전 기간이 아닙니다.'}
                </p>
                {starBalance !== null && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563' }}>
                    현재 보유 별: <strong>{starBalance}</strong>개
                  </p>
                )}
                <ButtonRow>
                  {myCanParticipate && !myEntry && (
                    <PrimaryButton
                      type="button"
                      onClick={handleCreateEntry}
                      disabled={actionLoading}
                    >
                      {actionLoading ? '처리 중...' : '추가 매칭 도전 등록 (⭐10)'}
                    </PrimaryButton>
                  )}
                  {myEntry && (
                    <SecondaryButton type="button" disabled>
                      내 추가 매칭 도전 상태: {myEntry.status === 'sold_out' ? '품절' : '진행중'}
                    </SecondaryButton>
                  )}
                </ButtonRow>
              </>
            )}
          </Card>
        </Section>

        <Section>
          <SectionTitle>이성들의 추가 매칭 도전</SectionTitle>
          {loading ? (
            <Card>
              <p style={{ margin: 0, color: '#6b7280' }}>리스트를 불러오는 중입니다...</p>
            </Card>
          ) : entries.length === 0 ? (
            <Card>
              <EmptyState>
                현재 보이는 추가 매칭 도전이 없습니다.
                <br />
                회차와 인원이 늘어나면 이곳에 카드가 채워질 거예요.
              </EmptyState>
            </Card>
          ) : (
            <EntryList>
              {entries.map((entry) => (
                <EntryCard key={entry.id}>
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
                    {entry.company && <div>회사: {entry.company}</div>}
                    {entry.job_type && <div>직군: {entry.job_type}</div>}
                    {entry.residence && <div>거주지: {entry.residence}</div>}
                    {entry.mbti && <div>MBTI: {entry.mbti}</div>}
                  </EntryMeta>
                  <ButtonRow>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleApply(entry.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? '처리 중...' : '저는 어때요 (⭐10)'}
                    </PrimaryButton>
                  </ButtonRow>
                </EntryCard>
              ))}
            </EntryList>
          )}
        </Section>

        <Section>
          <SectionTitle>나에게 온 "저는 어때요"</SectionTitle>
          {loading ? (
            <Card>
              <p style={{ margin: 0, color: '#6b7280' }}>신청 내역을 불러오는 중입니다...</p>
            </Card>
          ) : !received || !received.entry || !received.applies || received.applies.length === 0 ? (
            <Card>
              <EmptyState>
                아직 나에게 도착한 "저는 어때요"가 없습니다.
                <br />
                추가 매칭 도전을 등록하면 상대가 나에게 어필을 보낼 수 있어요.
              </EmptyState>
            </Card>
          ) : (
            received.applies.map((apply) => (
              <Card key={apply.id}>
                <div style={{ marginBottom: 6 }}>
                  <strong>
                    {apply.profile?.nickname || '익명'} (
                    {apply.profile?.gender === 'male'
                      ? '남성'
                      : apply.profile?.gender === 'female'
                      ? '여성'
                      : '성별 비공개'}
                    )
                  </strong>
                </div>
                <div style={{ fontSize: '0.86rem', color: '#4b5563', marginBottom: 4 }}>
                  {apply.profile?.birth_year && (
                    <span style={{ marginRight: 8 }}>
                      출생연도: {apply.profile.birth_year}
                    </span>
                  )}
                  {apply.profile?.job_type && (
                    <span style={{ marginRight: 8 }}>직군: {apply.profile.job_type}</span>
                  )}
                  {apply.profile?.company && (
                    <span style={{ marginRight: 8 }}>회사: {apply.profile.company}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 6 }}>
                  상태: {apply.status === 'pending' ? '대기중' : apply.status === 'accepted' ? '수락됨' : '거절됨'}
                </div>
                {apply.status === 'pending' && (
                  <ButtonRow>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleAccept(apply.id)}
                      disabled={actionLoading}
                    >
                      수락
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => handleReject(apply.id)}
                      disabled={actionLoading}
                    >
                      거절 (⭐5 환불)
                    </SecondaryButton>
                  </ButtonRow>
                )}
              </Card>
            ))
          )}
        </Section>
      </Content>
    </Container>
  );
};

export default ExtraMatchingPage;


