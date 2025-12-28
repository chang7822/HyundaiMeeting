import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api.ts';
import { getDisplayCompanyName } from '../../utils/companyDisplay.ts';

const Container = styled.div<{ $sidebarOpen?: boolean }>`
  flex: 1;
  margin-left: ${props => props.$sidebarOpen ? '280px' : '0'};
  padding: 2rem;
  min-height: 100vh;
  background: #f8f9fa;
  transition: margin-left 0.3s;

  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
  }
`;

const Content = styled.div`
  max-width: 1040px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 26px;
  font-weight: 700;
  color: #1f2933;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
`;

const Card = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
  padding: 20px 22px 22px 22px;
  margin-bottom: 18px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #4F46E5;
    box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.2);
  }
`;

const SmallInput = styled(Input)`
  width: 180px;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    border-color: #4F46E5;
    box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.2);
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 9px 16px;
  border-radius: 999px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  background: ${props =>
    props.$variant === 'secondary'
      ? '#e5e7eb'
      : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)'};
  color: ${props => (props.$variant === 'secondary' ? '#374151' : '#ffffff')};

  &:hover {
    opacity: 0.95;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ToggleRow = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Modal = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 20px 20px 20px;
  width: 100%;
  max-width: 720px;
  max-height: 80vh;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.3);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  color: #111827;
`;

const ModalSub = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
`;

const ModalToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const SmallButton = styled.button`
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    background: #eef2ff;
  }
`;

const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const ListRow = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 10px;
  gap: 10px;
  font-size: 13px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: #eef2ff;
  }
`;

const ListInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const NameLine = styled.div`
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MetaLine = styled.div`
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
`;

interface AdminStarRewardPageProps {
  sidebarOpen?: boolean;
}

const AdminStarRewardPage: React.FC<AdminStarRewardPageProps> = ({ sidebarOpen = true }) => {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [amount, setAmount] = useState<number>(1);
  const [sendNotification, setSendNotification] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [notifTitle, setNotifTitle] = useState('[이벤트] 별이 지급되었습니다');
  const [notifBody, setNotifBody] = useState('이벤트 보상으로 별이 지급되었습니다. 앱에서 확인해주세요.');
  const [linkUrl, setLinkUrl] = useState('/main');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sendNotification) {
      setSendPush(false);
    }
  }, [sendNotification]);

  const filteredRecipients = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return recipients;
    return (recipients || []).filter((u: any) => {
      const nickname = (u?.nickname || u?.profile?.nickname || '').toString().toLowerCase();
      const email = (u?.email || '').toString().toLowerCase();
      const company = getDisplayCompanyName(u?.company || u?.profile?.company, u?.custom_company_name || u?.profile?.custom_company_name);
      const companyLower = (company || '').toString().toLowerCase();
      return nickname.includes(q) || email.includes(q) || companyLower.includes(q);
    });
  }, [recipients, searchText]);

  const openRecipients = async () => {
    setShowModal(true);
    if (recipients.length) return;
    setLoadingRecipients(true);
    try {
      const list = await adminApi.getAllUsers();
      const normalized = (list || []).map((u: any) => ({
        ...u,
        id: String(u.id),
        profile: u?.profile ? u.profile : {
          nickname: u?.nickname,
          company: u?.company,
          custom_company_name: u?.custom_company_name,
        },
      }));
      setRecipients(normalized);
    } catch (e: any) {
      const msg = e?.response?.data?.message || '회원 목록을 불러오는 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const toggleAllFiltered = () => {
    const ids = filteredRecipients.map((u: any) => String(u.id));
    const allSelected = ids.length > 0 && ids.every((id: string) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleSubmit = async () => {
    const intAmount = Number.isFinite(amount) ? Math.floor(amount) : NaN;
    if (!selectedIds.length) {
      toast.warn('대상 회원을 1명 이상 선택해주세요.');
      return;
    }
    if (!Number.isFinite(intAmount) || intAmount <= 0) {
      toast.warn('별 수량은 1 이상의 정수여야 합니다.');
      return;
    }
    if (sendNotification && (!notifTitle.trim() || !notifBody.trim())) {
      toast.warn('알림 제목/내용을 입력해주세요. (알림을 끄면 생략 가능)');
      return;
    }

    const confirmMsg =
      `선택된 ${selectedIds.length}명에게 ⭐ ${intAmount}개를 지급합니다.\n` +
      `${sendNotification ? `알림${sendPush ? '+푸시' : ''}도 함께 발송합니다.` : '알림/푸시는 발송하지 않습니다.'}\n` +
      `계속하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const payload: any = {
        userIds: selectedIds,
        amount: intAmount,
      };
      if (sendNotification) {
        payload.notification = {
          title: notifTitle.trim(),
          body: notifBody.trim(),
          linkUrl: linkUrl?.trim() ? linkUrl.trim() : null,
        };
        payload.sendPush = !!sendPush;
      }

      const res = await adminApi.grantStars(payload);
      toast.success(res?.message || '별 지급을 완료했습니다.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || '별 지급 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Title>이벤트 별 지급</Title>
        <Description>
          회원을 선택(전체 선택 가능)하여 별을 지급하고, 원하면 앱 내 알림 및 푸시까지 함께 발송할 수 있습니다.
          (DB 구조 변경 없이 기존 별/알림/푸시 테이블을 재사용합니다)
        </Description>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <div>
              <Label>대상 회원</Label>
              <div style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>
                선택 {selectedIds.length}명
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                “대상 선택”에서 회원을 체크하세요.
              </div>
            </div>
            <Row>
              <Button type="button" $variant="secondary" onClick={() => setSelectedIds([])} disabled={!selectedIds.length || submitting}>
                선택 초기화
              </Button>
              <Button type="button" onClick={openRecipients} disabled={submitting}>
                대상 선택
              </Button>
            </Row>
          </Row>
        </Card>

        <Card>
          <Label>지급할 별 수량</Label>
          <Row>
            <SmallInput
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              (정수만 지원)
            </div>
          </Row>

          <div style={{ marginTop: 16 }}>
            <ToggleRow>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#111827', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                />
                알림 메시지 보내기(앱 내 알림함)
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: sendNotification ? '#111827' : '#9ca3af', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={sendPush}
                  disabled={!sendNotification}
                  onChange={(e) => setSendPush(e.target.checked)}
                />
                푸시도 같이 보내기
              </label>
            </ToggleRow>
          </div>
        </Card>

        {sendNotification && (
          <Card>
            <Label>알림 제목</Label>
            <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="[이벤트] ..." />
            <Label style={{ marginTop: 14 }}>알림 내용</Label>
            <Textarea value={notifBody} onChange={(e) => setNotifBody(e.target.value)} placeholder="회원에게 전달할 내용을 입력하세요." />
            <Label style={{ marginTop: 14 }}>연결 화면(선택)</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/main, /extra-matching 등" />
          </Card>
        )}

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              지급은 `users.star_balance` 증가 + `star_transactions` 기록으로 처리됩니다.
            </div>
            <Button type="button" onClick={handleSubmit} disabled={submitting || !selectedIds.length}>
              {submitting ? '처리 중...' : '별 지급 실행'}
            </Button>
          </Row>
        </Card>

        {showModal && (
          <ModalOverlay onClick={() => setShowModal(false)}>
            <Modal onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <div>
                  <ModalTitle>대상 회원 선택</ModalTitle>
                  <ModalSub>
                    전체 {recipients.length}명 / 필터 {filteredRecipients.length}명 / 선택 {selectedIds.length}명
                  </ModalSub>
                </div>
                <SmallButton type="button" onClick={() => setShowModal(false)}>
                  닫기
                </SmallButton>
              </ModalHeader>

              <ModalToolbar>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <SmallButton type="button" onClick={toggleAllFiltered}>
                    {(() => {
                      const ids = filteredRecipients.map((u: any) => String(u.id));
                      const allSelected = ids.length > 0 && ids.every((id: string) => selectedIds.includes(id));
                      return allSelected ? '전체 해제(필터)' : '전체 선택(필터)';
                    })()}
                  </SmallButton>
                  <SmallButton type="button" onClick={() => setSelectedIds([])}>
                    선택 초기화
                  </SmallButton>
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="검색: 닉네임/이메일/회사"
                  />
                </div>
              </ModalToolbar>

              <List>
                {filteredRecipients.map((u: any) => {
                  const id = String(u.id);
                  const checked = selectedIds.includes(id);
                  const nickname = u?.profile?.nickname || u?.nickname || '(닉네임 없음)';
                  const company = getDisplayCompanyName(u?.profile?.company || u?.company, u?.profile?.custom_company_name || u?.custom_company_name);
                  return (
                    <ListRow
                      key={id}
                      onClick={() => {
                        setSelectedIds((prev) =>
                          prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                          } else {
                            setSelectedIds((prev) => prev.filter((v) => v !== id));
                          }
                        }}
                      />
                      <ListInfo>
                        <NameLine>
                          {nickname} {company ? `· ${company}` : ''}
                        </NameLine>
                        <MetaLine>{u.email}</MetaLine>
                      </ListInfo>
                    </ListRow>
                  );
                })}
                {!filteredRecipients.length && (
                  <div style={{ padding: 16, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                    검색 결과가 없습니다.
                  </div>
                )}
              </List>

              <ModalFooter>
                {loadingRecipients && (
                  <div style={{ fontSize: 12, color: '#9ca3af', marginRight: 'auto' }}>회원 목록을 불러오는 중...</div>
                )}
                <Button type="button" $variant="secondary" onClick={() => setShowModal(false)}>
                  완료
                </Button>
              </ModalFooter>
            </Modal>
          </ModalOverlay>
        )}
      </Content>
    </Container>
  );
};

export default AdminStarRewardPage;


