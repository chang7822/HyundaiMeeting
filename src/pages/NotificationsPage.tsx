import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/api.ts';
import InlineSpinner from '../components/InlineSpinner.tsx';
import { FaBell, FaCheckCircle, FaInbox, FaTimes } from 'react-icons/fa';

const PageContainer = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  min-height: 100vh;
  padding: 80px 32px 32px 32px;
  margin-left: ${props => (window.innerWidth > 768 && props.$sidebarOpen) ? '280px' : '0'};
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-width: 100vw;
  overflow-x: hidden;

  @media (max-width: 1024px) {
    padding: 80px 28px 32px;
  }

  @media (max-width: 768px) {
    margin-left: 0;
    padding: 24px 24px 28px;
    padding-top: var(--mobile-top-padding, 80px);
  }

  @media (max-width: 480px) {
    padding: 20px 20px 24px;
    padding-top: var(--mobile-top-padding, 70px);
  }
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  gap: 12px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const Title = styled.h1`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);

  svg {
    color: #6366f1;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #e5e7ff;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
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

const PrimaryButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #f9fafb;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);

  &:hover {
    opacity: 0.95;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    box-shadow: none;
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
`;

const NotificationListWrapper = styled.div`
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 8px 12px 12px;
  width: 100%;
  max-width: 840px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const EmptyState = styled.div`
  padding: 36px 24px 40px;
  text-align: center;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  svg {
    font-size: 2.4rem;
    color: #c4b5fd;
  }
`;

const EmptyTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
`;

const EmptyText = styled.div`
  font-size: 0.9rem;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Item = styled.button<{ $unread: boolean }>`
  width: 100%;
  text-align: left;
  border: none;
  background: ${({ $unread }) =>
    $unread ? 'linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(250,250,255,1) 100%)' : 'transparent'};
  padding: 14px 20px;
  display: flex;
  align-items: flex-start;
  gap: 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(229, 231, 235, 0.8);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ $unread }) =>
      $unread ? 'linear-gradient(90deg, #e0ecff 0%, #f1f5ff 100%)' : 'rgba(249, 250, 251, 0.9)'};
  }
`;

const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
`;

const ItemTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemTimestamp = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  white-space: nowrap;
`;

const ItemBody = styled.div`
  font-size: 0.86rem;
  color: #4b5563;
  line-height: 1.5;
  word-break: break-word;
`;

const ItemMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.78rem;
  color: #9ca3af;
`;

const UnreadDot = styled.span`
  display: inline-flex;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
`;

const FilterTabs = styled.div`
  display: inline-flex;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px;
  border: 1px solid rgba(209, 213, 219, 0.8);

  @media (max-width: 480px) {
    width: 100%;
  }
`;

const FilterTabButton = styled.button<{ $active: boolean }>`
  border: none;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  cursor: pointer;
  background: ${({ $active }) => ($active ? '#4f46e5' : 'transparent')};
  color: ${({ $active }) => ($active ? '#f9fafb' : '#4b5563')};
  font-weight: 600;

  &:hover {
    background: ${({ $active }) => ($active ? '#4f46e5' : 'rgba(229, 231, 235, 0.6)')};
  }

  @media (max-width: 480px) {
    flex: 1;
    text-align: center;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
  padding: 16px;
  box-sizing: border-box;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 480px;
  background: #f9fafb;
  border-radius: 18px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.45);
  padding: 20px 22px 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: #111827;
`;

const ModalTypeBadge = styled.span`
  align-self: flex-start;
  font-size: 0.72rem;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 600;
`;

const ModalTimestamp = styled.div`
  font-size: 0.78rem;
  color: #9ca3af;
`;

const ModalBody = styled.div`
  margin-top: 4px;
  padding: 10px 0 4px;
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.6;
  white-space: pre-line;
`;

const ModalActions = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const ModalSecondaryButton = styled.button`
  padding: 6px 14px;
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
`;

const ModalPrimaryButton = styled.button`
  padding: 6px 16px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  font-size: 0.82rem;
  font-weight: 600;
  color: #f9fafb;
  cursor: pointer;

  &:hover {
    opacity: 0.96;
  }
`;

function formatKSTTimestamp(ts?: string | null) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
}

const NotificationsPage: React.FC<{ sidebarOpen: boolean }> = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications({
        onlyUnread: unreadOnly,
        limit: 50,
      });
      setItems(Array.isArray(res.notifications) ? res.notifications : []);
    } catch (e) {
      console.error('[NotificationsPage] 알림 조회 오류:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleClickItem = async (item: any) => {
    if (!item) return;
    setSelected(item);
    setModalOpen(true);
    try {
      if (!item.is_read) {
        await notificationApi.markAsRead(item.id);
        // 로컬 상태도 읽음으로 반영
        setItems(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
      }
    } catch (e) {
      console.error('[NotificationsPage] 알림 읽음 처리 오류:', e);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationApi.markAllAsRead();
      await loadNotifications();
    } catch (e) {
      console.error('[NotificationsPage] 모두 읽음 처리 오류:', e);
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = items.some((n) => !n.is_read);

  return (
    <PageContainer $sidebarOpen={sidebarOpen}>
      <HeaderRow>
        <TopRow>
          <TitleBlock>
            <Title>알림함</Title>
            <Subtitle>
              매칭 결과, 호감 도착, 공지사항 등 회원님께 필요한 안내를 한 곳에서 확인할 수 있습니다.
            </Subtitle>
          </TitleBlock>
          <CloseButton onClick={() => navigate('/main')}>
            <FaTimes />
          </CloseButton>
        </TopRow>
        <HeaderActions>
          <FilterTabs>
            <FilterTabButton
              type="button"
              $active={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
            >
              전체
            </FilterTabButton>
            <FilterTabButton
              type="button"
              $active={unreadOnly}
              onClick={() => setUnreadOnly(true)}
            >
              안읽음만
            </FilterTabButton>
          </FilterTabs>
          <PrimaryButton type="button" onClick={handleMarkAllRead} disabled={markingAll || !hasUnread}>
            <FaCheckCircle />
            모두 읽음 처리
          </PrimaryButton>
        </HeaderActions>
      </HeaderRow>

      <NotificationListWrapper>
        {loading ? (
          <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="알림을 불러오는 중입니다..." />
          </div>
        ) : items.length === 0 ? (
          <EmptyState>
            <FaInbox />
            <EmptyTitle>새로운 알림이 없습니다.</EmptyTitle>
            <EmptyText>매칭 결과, 호감 도착, 공지사항 등이 도착하면 이곳에 표시됩니다.</EmptyText>
          </EmptyState>
        ) : (
          <List>
            {items.map((item) => (
              <Item
                key={item.id}
                $unread={!item.is_read}
                type="button"
                onClick={() => handleClickItem(item)}
              >
                <ItemContent>
                  {/* 1줄째: 제목만 */}
                  <ItemTitleRow>
                    <ItemTitle>{item.title}</ItemTitle>
                  </ItemTitleRow>

                  {/* 2줄째: 왼쪽 태그, 오른쪽 새 알림 + 날짜 */}
                  <ItemMetaRow>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {item.type === 'match' && '매칭 알림'}
                      {item.type === 'extra_match' && '추가 매칭 알림'}
                      {item.type === 'notice' && '공지사항'}
                      {item.type === 'system' && '시스템 알림'}
                      {item.type === 'admin' && '관리자 메시지'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {!item.is_read && (
                        <>
                          <UnreadDot />
                          <span>새 알림</span>
                        </>
                      )}
                      <ItemTimestamp>{formatKSTTimestamp(item.created_at)}</ItemTimestamp>
                    </span>
                  </ItemMetaRow>
                </ItemContent>
              </Item>
            ))}
          </List>
        )}
      </NotificationListWrapper>

      {modalOpen && selected && (
        <ModalOverlay
          onClick={() => {
            setModalOpen(false);
            setSelected(null);
          }}
        >
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 1줄째: 제목만 */}
                <ModalTitle>{selected.title}</ModalTitle>
                {/* 2줄째: 왼쪽 태그 칩, 오른쪽 날짜 */}
                <div
                  style={{
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <ModalTypeBadge>
                    {selected.type === 'match' && '매칭 알림'}
                    {selected.type === 'extra_match' && '추가 매칭 알림'}
                    {selected.type === 'notice' && '공지사항'}
                    {selected.type === 'system' && '시스템 알림'}
                    {selected.type === 'admin' && '관리자 메시지'}
                  </ModalTypeBadge>
                  <ModalTimestamp>{formatKSTTimestamp(selected.created_at)}</ModalTimestamp>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>{selected.body}</ModalBody>
            <ModalActions>
              <ModalSecondaryButton
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setSelected(null);
                }}
              >
                닫기
              </ModalSecondaryButton>
              {selected.link_url && (
                <ModalPrimaryButton
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    navigate(selected.link_url);
                  }}
                >
                  관련 화면으로 이동
                </ModalPrimaryButton>
              )}
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default NotificationsPage;


