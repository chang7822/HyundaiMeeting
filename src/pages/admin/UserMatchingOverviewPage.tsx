import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Modal from 'react-modal';
import { FaSort } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ProfileDetailModal from './ProfileDetailModal.tsx';
import { adminApi, adminMatchingApi } from '../../services/api.ts';
import InlineSpinner from '../../components/InlineSpinner.tsx';

const Container = styled.div<{ $sidebarOpen: boolean }>`
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(80,60,180,0.08);
  padding: 32px 24px;
  max-width: 1200px;
  margin-left: ${props => (window.innerWidth > 768 && props.$sidebarOpen) ? '280px' : '0'};
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 24px;
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
    white-space: nowrap;
  }
  th {
    background: #f7f7fa;
    font-weight: 600;
    cursor: pointer;
  }
`;

const Button = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-weight: 600;
  margin: 0 2px;
  cursor: pointer;
  font-size: 0.9rem;
  &:hover { background: #5b21b6; }
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

const TabWrapper = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 12px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  color: ${props => props.$active ? '#fff' : '#4F46E5'};
  background: ${props => props.$active ? '#7C3AED' : '#ede7f6'};
  transition: all 0.2s ease;
`;

const CompatibilityList = styled.div`
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
`;

const CompatibilityRow = styled.div<{ $mutual: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${props => props.$mutual ? 'rgba(16,185,129,0.12)' : '#f8f9fa'};
  border: 1px solid ${props => props.$mutual ? 'rgba(16,185,129,0.4)' : 'transparent'};
  & + & {
    margin-top: 10px;
  }
`;

const Badge = styled.span<{ $positive?: boolean }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.$positive ? '#0f766e' : '#6b7280'};
  background: ${props => props.$positive ? 'rgba(45,212,191,0.2)' : '#e5e7eb'};
  border-radius: 999px;
  padding: 4px 10px;
`;

const EmptyRow = styled.div`
  text-align: center;
  color: #6b7280;
  padding: 40px 0;
`;

Modal.setAppElement('#root');

const UserMatchingOverviewPage = ({ sidebarOpen = true }: { sidebarOpen?: boolean }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<string>('nickname');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [compatModal, setCompatModal] = useState<{
    open: boolean;
    loading: boolean;
    data: { iPrefer: any[]; preferMe: any[] } | null;
    user: any;
    activeTab: 'iPrefer' | 'preferMe';
  }>({
    open: false,
    loading: false,
    data: null,
    user: null,
    activeTab: 'iPrefer',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await adminApi.getAllUsers();
        setUsers(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('[UserMatchingOverview] 사용자 목록 조회 오류:', error);
        toast.error('회원 목록을 불러오지 못했습니다.');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const sortedUsers = [...users].sort((a, b) => {
    let v1: any = a[sortKey];
    let v2: any = b[sortKey];
    if (sortKey === 'nickname') {
      v1 = a.nickname || '';
      v2 = b.nickname || '';
    }
    if (v1 === undefined || v1 === null) v1 = '';
    if (v2 === undefined || v2 === null) v2 = '';
    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return sortAsc ? v1.localeCompare(v2) : v2.localeCompare(v1);
    }
    return sortAsc ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
  });

  const openProfileModal = (user: any) => {
    setSelectedUser(user);
    setProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setSelectedUser(null);
  };

  const openCompatibilityModal = async (user: any, tab: 'iPrefer' | 'preferMe') => {
    if (!user?.id) {
      toast.warn('회원 정보를 찾을 수 없습니다.');
      return;
    }
    setCompatModal({
      open: true,
      loading: true,
      data: null,
      user,
      activeTab: tab,
    });
    try {
      const data = await adminMatchingApi.getMatchingCompatibilityLive(String(user.id));
      setCompatModal(prev => ({
        ...prev,
        loading: false,
        data,
      }));
    } catch (error) {
      console.error('[UserMatchingOverview] 호환성 조회 오류:', error);
      toast.error('호환성 정보를 불러오지 못했습니다.');
      setCompatModal(prev => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const closeCompatibilityModal = () => {
    setCompatModal({
      open: false,
      loading: false,
      data: null,
      user: null,
      activeTab: 'iPrefer',
    });
  };

  const compatProfile = compatModal.user;

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Title>회원 매칭 조회 (전체 회원 기준)</Title>
      <TableWrapper>
        {loading ? (
          <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="회원 목록을 불러오는 중입니다..." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th onClick={() => { setSortKey('nickname'); setSortAsc(k => !k); }}>
                  닉네임 <FaSort />
                </th>
                <th onClick={() => { setSortKey('gender'); setSortAsc(k => !k); }}>
                  성별 <FaSort />
                </th>
                <th onClick={() => { setSortKey('email'); setSortAsc(k => !k); }}>
                  이메일 <FaSort />
                </th>
                <th>프로필/선호 보기</th>
                <th>내가 선호하는</th>
                <th>나를 선호하는</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <NicknameBtn onClick={() => openProfileModal(user)}>
                      {user.nickname || '-'}
                    </NicknameBtn>
                  </td>
                  <td>{user.gender === 'male' ? '남성' : user.gender === 'female' ? '여성' : '-'}</td>
                  <td>{user.email || '-'}</td>
                  <td>
                    <Button
                      style={{ padding: '4px 10px', fontSize: '0.9em' }}
                      onClick={() => openProfileModal(user)}
                    >
                      보기
                    </Button>
                  </td>
                  <td>
                    <Button
                      style={{ padding: '4px 10px', fontSize: '0.9em' }}
                      onClick={() => openCompatibilityModal(user, 'iPrefer')}
                    >
                      보기
                    </Button>
                  </td>
                  <td>
                    <Button
                      style={{ padding: '4px 10px', fontSize: '0.9em', background: '#4F46E5' }}
                      onClick={() => openCompatibilityModal(user, 'preferMe')}
                    >
                      보기
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableWrapper>

      {/* 프로필/선호 모달 - 현재 프로필/선호 기준 */}
      <ProfileDetailModal
        isOpen={profileModalOpen}
        onRequestClose={closeProfileModal}
        user={selectedUser}
      />

      {/* 호환성 모달 - MatchingApplicationsPage와 동일 UI */}
      <Modal
        isOpen={compatModal.open}
        onRequestClose={closeCompatibilityModal}
        style={{ content: { maxWidth: 520, minWidth: 320, margin: 'auto', borderRadius: 16, padding: 24, overflowY: 'auto' } }}
        contentLabel="매칭 선호 상세 (현재 프로필 기준)"
      >
        <h3 style={{ marginBottom: 8, fontSize: '1.2rem', color: '#4F46E5' }}>
          {compatProfile?.nickname || compatProfile?.email || '회원'}님의 매칭 선호 (현재 기준)
        </h3>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280', fontSize: '0.9rem' }}>
          현재 가입된 회원들의 프로필/선호 정보를 기준으로 내가 선호하는 / 나를 선호하는 회원을 확인합니다.
        </p>
        <TabWrapper>
          <TabButton
            type="button"
            $active={compatModal.activeTab === 'iPrefer'}
            onClick={() => setCompatModal(prev => ({ ...prev, activeTab: 'iPrefer' }))}
          >
            내가 선호하는
          </TabButton>
          <TabButton
            type="button"
            $active={compatModal.activeTab === 'preferMe'}
            onClick={() => setCompatModal(prev => ({ ...prev, activeTab: 'preferMe' }))}
          >
            나를 선호하는
          </TabButton>
        </TabWrapper>
        {compatModal.loading ? (
          <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="데이터를 불러오는 중입니다..." />
          </div>
        ) : (
          <CompatibilityList>
            {(compatModal.data?.[compatModal.activeTab] || []).length === 0 ? (
              <EmptyRow>해당되는 회원이 없습니다.</EmptyRow>
            ) : (
              compatModal.data?.[compatModal.activeTab].map((item: any) => (
                <CompatibilityRow key={item.user_id} $mutual={item.mutual}>
                  <div>
                    <strong>{item.nickname}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.email}</div>
                  </div>
                  <Badge $positive={item.applied}>신청 {item.applied ? 'O' : 'X'}</Badge>
                  <Badge $positive={item.hasHistory}>매칭이력 {item.hasHistory ? 'O' : 'X'}</Badge>
                </CompatibilityRow>
              ))
            )}
          </CompatibilityList>
        )}
        <Button onClick={closeCompatibilityModal} style={{ marginTop: 16, width: '100%' }}>
          닫기
        </Button>
      </Modal>
    </Container>
  );
};

export default UserMatchingOverviewPage;


