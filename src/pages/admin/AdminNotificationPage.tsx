import React, { useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api.ts';

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
  max-width: 960px;
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
  margin-bottom: 24px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 6px;
`;

const Select = styled.select`
  min-width: 180px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 160px;
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

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 9px 18px;
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

const PreviewCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  padding: 18px 20px 20px 20px;
`;

const PreviewHeader = styled.div`
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
`;

const PreviewTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
`;

const PreviewBody = styled.div`
  font-size: 13px;
  color: #4b5563;
  white-space: pre-line;
`;

interface AdminNotificationPageProps {
  sidebarOpen?: boolean;
}

const AdminNotificationPage: React.FC<AdminNotificationPageProps> = ({ sidebarOpen = true }) => {
  const [targetType, setTargetType] = useState<'all' | 'user_ids' | 'emails' | 'period_extra_participants'>('all');
  const [userIdsText, setUserIdsText] = useState('');
  const [emailsText, setEmailsText] = useState('');
  const [periodId, setPeriodId] = useState<string>('');
  const [title, setTitle] = useState('[관리자] 안내드립니다');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState<string>('/main');
  const [sending, setSending] = useState(false);

  const buildPayload = () => {
    const target: any = { type: targetType };
    if (targetType === 'user_ids') {
      target.userIds = userIdsText
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    } else if (targetType === 'emails') {
      target.emails = emailsText
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    } else if (targetType === 'period_extra_participants') {
      target.periodId = periodId ? Number(periodId) : undefined;
    }

    return {
      target,
      notification: {
        title,
        body,
        linkUrl: linkUrl || null,
      },
    };
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('알림 제목과 내용을 모두 입력해주세요.');
      return;
    }
    if (targetType === 'period_extra_participants' && !periodId) {
      toast.error('회차 ID를 입력해주세요.');
      return;
    }
    setSending(true);
    try {
      const payload = buildPayload();
      const res = await adminApi.sendAdminNotification(payload);
      toast.success(res.message || '알림을 전송했습니다.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || '알림 전송 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Title>관리자 알림 보내기</Title>
        <Description>
          특정 회원 또는 추가 매칭 도전 참여자에게 앱 내 알림을 전송할 수 있습니다.
          (기존 알림함 UI로 표시됩니다)
        </Description>

        <Card>
          <Label>대상 설정</Label>
          <Row>
            <Select
              value={targetType}
              onChange={(e) =>
                setTargetType(e.target.value as 'all' | 'user_ids' | 'emails' | 'period_extra_participants')
              }
            >
              <option value="all">전체 활성 회원</option>
              <option value="user_ids">특정 회원 (userId 목록)</option>
              <option value="emails">특정 이메일 목록</option>
              <option value="period_extra_participants">특정 회차 추가 매칭 참여자</option>
            </Select>

            {targetType === 'user_ids' && (
              <Input
                placeholder="userId 들을 ,(콤마)로 구분해서 입력"
                value={userIdsText}
                onChange={(e) => setUserIdsText(e.target.value)}
              />
            )}
            {targetType === 'emails' && (
              <Input
                placeholder="이메일 주소들을 ,(콤마)로 구분해서 입력"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
              />
            )}
            {targetType === 'period_extra_participants' && (
              <Input
                placeholder="회차 ID (matching_log.id)"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              />
            )}
          </Row>
        </Card>

        <Card>
          <Label>알림 제목</Label>
          <Input
            placeholder="[관리자] ..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Label style={{ marginTop: 14 }}>알림 내용</Label>
          <Textarea
            placeholder="회원에게 전달할 내용을 입력하세요."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <Label style={{ marginTop: 14 }}>연결 화면 (선택)</Label>
          <Input
            placeholder="/main, /extra-matching, /matching-history 등"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />

          <ButtonRow>
            <Button
              type="button"
              $variant="primary"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? '전송 중...' : '알림 전송'}
            </Button>
          </ButtonRow>
        </Card>

        <PreviewCard>
          <PreviewHeader>알림 미리보기</PreviewHeader>
          <PreviewTitle>{title || '(제목 없음)'}</PreviewTitle>
          <PreviewBody>{body || '(내용 없음)'}</PreviewBody>
        </PreviewCard>
      </Content>
    </Container>
  );
};

export default AdminNotificationPage;


