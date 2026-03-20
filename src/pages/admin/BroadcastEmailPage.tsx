import React, { useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';
import { adminApi, adminMatchingApi } from '../../services/api';
import { getDisplayCompanyName } from '../../utils/companyDisplay';

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

const Textarea = styled.textarea`
  width: 100%;
  min-height: 220px;
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
  padding: 10px 18px;
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
  margin-bottom: 10px;
  font-size: 13px;
  color: #6b7280;
`;

const PreviewSubject = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 10px;
`;

const PreviewFrame = styled.div`
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 0;
  background: transparent;
  max-height: 520px;
  overflow: auto;
`;

const RecipientModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const RecipientModal = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 20px 20px 20px;
  width: 100%;
  max-width: 640px;
  max-height: 80vh;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.3);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const RecipientHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const RecipientTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #111827;
`;

const RecipientSub = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

const RecipientToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
  flex-wrap: wrap;
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

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
`;
const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #4b5563;
  cursor: pointer;
`;

const ForceEnableButton = styled.button<{ $active?: boolean }>`
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #ef4444;
  background: ${props => props.$active ? '#fee2e2' : '#fef2f2'};
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: #fee2e2;
    border-color: #dc2626;
  }
  &:active {
    transform: scale(0.98);
  }
`;

const RecipientList = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const RecipientRow = styled.div<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 10px;
  font-size: 13px;
  border-bottom: 1px solid #e5e7eb;
  &:last-child {
    border-bottom: none;
  }
  ${props => props.$disabled && `
    background-color: #f3f4f6;
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  `}
`;

const RecipientInfo = styled.div`
  margin-left: 8px;
  display: flex;
  flex-direction: column;
`;

const RecipientName = styled.span<{ $disabled?: boolean }>`
  font-weight: 600;
  color: ${props => props.$disabled ? '#9ca3af' : '#111827'};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const DisabledBadge = styled.span`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #e5e7eb;
  color: #6b7280;
  font-weight: 500;
`;

const RecipientMeta = styled.span`
  font-size: 11px;
  color: #6b7280;
`;

const RecipientFooter = styled.div`
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 32px;
  background: #f3f4f6;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  margin: 12px 0;
  border: 1px solid #e5e7eb;
`;

const ProgressBarFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProgressText = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  z-index: 1;
`;

interface BroadcastEmailPageProps {
  sidebarOpen?: boolean;
}

const BroadcastEmailPage: React.FC<BroadcastEmailPageProps> = ({ sidebarOpen = true }) => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [forceEnable, setForceEnable] = useState(false); // 수신거부 강제 해제 모드

  const formatKST = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const yy = String(d.getFullYear()).slice(2);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${yy}.${m}/${day}  ${hh}시 ${min}분`;
  };

  const handlePreview = () => {
    if (!subject || !content) {
      toast.warn('제목과 내용을 모두 입력한 후 미리보기를 눌러주세요.');
      return;
    }
    setShowPreview(true);
  };

  const handleSend = async () => {
    if (!subject || !content) {
      toast.warn('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // 발송 전 대상 선택 모달 열기
    if (!recipients.length) {
      setLoadingRecipients(true);
      try {
        const list = await adminApi.getBroadcastRecipients();
        setRecipients(list || []);
        // 이메일 수신 허용된 사용자만 기본 선택
        setSelectedIds((list || [])
          .filter((u: any) => u.email_notification_enabled !== false)
          .map((u: any) => String(u.id)));
        setShowRecipientModal(true);
      } catch (error: any) {
        console.error('[BroadcastEmailPage] 발송 대상 조회 오류:', error);
        const msg = error?.response?.data?.message || '발송 대상을 불러오는 데 실패했습니다.';
        toast.error(msg);
      } finally {
        setLoadingRecipients(false);
      }
    } else {
      setShowRecipientModal(true);
    }
  };

  const handleAutoFillFromLatestPeriod = async () => {
    try {
      setIsAutoFilling(true);
      const logs = await adminMatchingApi.getMatchingLogs();
      if (!logs || logs.length === 0) {
        toast.warn('매칭 회차 정보가 없습니다.');
        return;
      }
      const latest = logs[logs.length - 1];
      const round = logs.length;

      const autoSubject = `제 ${round} 회차 신규 매칭 일정 공지`;
      setSubject(autoSubject);

      const applicationStart = formatKST(latest.application_start);
      const applicationEnd = formatKST(latest.application_end);
      const announce = formatKST(latest.matching_announce);
      const finish = formatKST(latest.finish);

      const htmlContent = `<p>안녕하세요. 직쏠공 회원여러분</p>
<p>오래 기다려주셔서 감사합니다!</p>
<p>제 ${round}회차 신규 매칭 신청이 시작되었습니다.<br/>아래 일정 잘 참고하셔서 기간 내에 꼭 한번 신청 해주세요.</p>
<p><strong>📅 매칭 일정</strong></p>
<ul>
<li>매칭 신청 기간 : ${applicationStart} ~ ${applicationEnd}</li>
<li>매칭 결과 발표 : ${announce}</li>
<li>매칭 종료 : ${finish}</li>
</ul>
<p>※ 매칭 종료 후에는 매칭된 상대방과의 채팅방이 비활성화됩니다.</p>
<p><strong>✨ 매칭 성공률을 높일 수 있는 꿀팁 ✨</strong></p>
<p>선호 스타일을 너무 타이트하게 설정하시면 매칭 확률이 많이 줄어들 수 있어요.<br/>마음을 조금만 더 여시고, 스타일 기준을 완화해보시는 건 어떨까요?<br/>생각보다 훨씬 괜찮은 분을 만날 수도 있답니다 :)</p>
<p>더 자세한 내용은 서비스 내 공지사항과 FAQ를 참고해주세요.<br/>주변의 좋은 솔로분들이 많이 유입될 수 있도록 많은 홍보 부탁드립니다!</p>`;

      setIsHtml(true);
      setContent(htmlContent);
      setShowPreview(false);
      toast.info('최신 회차 일정으로 HTML 메일 내용이 자동 작성되었습니다.');
    } catch (error: any) {
      console.error('[BroadcastEmailPage] 최신 회차 자동 작성 오류:', error);
      const msg =
        error?.response?.data?.message ||
        '최신 매칭 회차 정보를 불러오지 못했습니다.';
      toast.error(msg);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const renderPreviewHtml = () => {
    const safeContent = isHtml
      ? DOMPurify.sanitize(content || '', {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'span', 'div', 'blockquote', 'article', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
          ALLOWED_ATTR: ['href', 'target', 'rel']
        })
      : (content || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/(?:\r\n|\r|\n)/g, '<br/>');

    const html = `
      <div style="font-family: Arial, sans-serif; width: 100%; max-width: 100%; margin: 0; padding: 20px; background-color: #f3f4f6;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px 28px; border-radius: 18px 18px 0 0; text-align: left;">
          <h1 style="margin: 0; font-size: 22px;">[직장인 솔로 공모] 공지 메일</h1>
          <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">
            직장인 솔로 공모 서비스를 이용해주시는 회원님께 안내드립니다.
          </p>
        </div>

        <div style="background: #ffffff; padding: 22px 24px 24px 24px; border-radius: 0 0 18px 18px; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);">
          <div style="color: #111827; font-size: 14px; line-height: 1.7; word-break: break-word;">
            ${safeContent}
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 6px 0;">
              이 메일은 직장인 솔로 공모 서비스 안내를 위해 발송되었습니다.
            </p>
            <div style="text-align: center; margin-top: 10px;">
              <a href="https://automatchingway.com" target="_blank" rel="noopener noreferrer"
                 style="display: inline-block; padding: 10px 22px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600; line-height: 1.5; font-size: 13px;">
                직쏠공 (직장인 솔로 공모)<br/>바로가기
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    return { __html: html };
  };

  const finalSubject =
    subject && subject.startsWith('[직장인 솔로 공모]')
      ? subject
      : subject
      ? `[직장인 솔로 공모] ${subject}`
      : '[직장인 솔로 공모] (제목 미입력)';

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Title>전체 회원 메일 공지</Title>
        <Description>
          활성화되어 있고 이메일 인증을 완료한 모든 회원에게 공지 메일을 발송합니다.
          <br />
          제목과 내용을 입력한 뒤, 미리보기로 실제 메일 레이아웃을 확인한 후 발송해주세요.
        </Description>

        <Card>
          <div style={{ marginBottom: 16 }}>
            <Label>제목</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="[직장인 솔로 공모] 를 제외한 제목을 입력해 주세요"
            />
            <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
              실제 발송 시 제목 앞에 자동으로 <strong>[직장인 솔로 공모]</strong>가 붙습니다.
            </div>
          </div>

          <div>
            <Label>내용</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={isHtml ? 'HTML 태그를 입력하세요 (예: <p>내용</p>, <strong>강조</strong>)' : '회원들에게 전달하고 싶은 내용을 자유롭게 작성해주세요.\n줄바꿈은 메일에서 그대로 반영됩니다.'}
              style={{ minHeight: isHtml ? 180 : 220, fontFamily: isHtml ? 'monospace' : 'inherit' }}
            />
            <CheckboxRow>
              <input
                type="checkbox"
                id="broadcast-is-html"
                checked={isHtml}
                onChange={e => setIsHtml(e.target.checked)}
              />
              <CheckboxLabel htmlFor="broadcast-is-html">HTML로 작성</CheckboxLabel>
            </CheckboxRow>
          </div>

          <ButtonRow>
            <Button type="button" $variant="secondary" onClick={handlePreview}>
              미리보기
            </Button>
            <Button
              type="button"
              $variant="secondary"
              onClick={handleAutoFillFromLatestPeriod}
              disabled={isAutoFilling}
            >
              {isAutoFilling ? '작성 중...' : '회차 공지'}
            </Button>
            <Button type="button" onClick={handleSend} disabled={isSending}>
              {isSending ? '발송 중...' : '발송 대상 선택'}
            </Button>
          </ButtonRow>
        </Card>

        {showPreview && (
          <PreviewCard>
            <PreviewHeader>미리보기 (실제 이메일 레이아웃과 거의 동일하게 표시됩니다)</PreviewHeader>
            <PreviewSubject>{finalSubject}</PreviewSubject>
            <PreviewFrame dangerouslySetInnerHTML={renderPreviewHtml()} />
          </PreviewCard>
        )}

        {showRecipientModal && (
          <RecipientModalOverlay>
            <RecipientModal>
              <RecipientHeader>
                <div>
                  <RecipientTitle>발송 대상 선택</RecipientTitle>
                  <RecipientSub>
                    활성 + 이메일 인증 완료 회원 중 메일을 받을 대상을 선택해주세요.
                  </RecipientSub>
                </div>
                <RecipientSub>
                  전체 {forceEnable ? recipients.length : recipients.filter((u: any) => u.email_notification_enabled !== false).length}명 / 선택 {selectedIds.length}명
                  {forceEnable && (
                    <span style={{ marginLeft: 8, color: '#dc2626', fontSize: 11, fontWeight: 600 }}>
                      (강제 해제 모드)
                    </span>
                  )}
                </RecipientSub>
              </RecipientHeader>

              <RecipientToolbar>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SmallButton
                    type="button"
                    onClick={() => {
                      // 강제 해제 모드가 아니면 이메일 수신 허용된 사용자만 선택 가능
                      const selectableIds = forceEnable
                        ? recipients.map((u: any) => String(u.id))
                        : recipients
                            .filter((u: any) => u.email_notification_enabled !== false)
                            .map((u: any) => String(u.id));
                      const allSelected =
                        selectableIds.length > 0 &&
                        selectableIds.every(id => selectedIds.includes(id));
                      if (allSelected) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(selectableIds);
                      }
                    }}
                  >
                    {(() => {
                      const selectableCount = forceEnable
                        ? recipients.length
                        : recipients.filter((u: any) => u.email_notification_enabled !== false).length;
                      return selectableCount > 0 && selectedIds.length === selectableCount
                        ? '전체 해제'
                        : '전체 선택';
                    })()}
                  </SmallButton>
                  <ForceEnableButton
                    type="button"
                    $active={forceEnable}
                    onClick={() => {
                      setForceEnable(!forceEnable);
                      setSelectedIds([]); // 모든 선택 초기화
                    }}
                  >
                    {forceEnable ? '강제 해제 중' : '수신거부 강제해제'}
                  </ForceEnableButton>
                </div>
                {loadingRecipients && (
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>대상을 불러오는 중...</span>
                )}
              </RecipientToolbar>

              <RecipientList>
                {recipients.map((u: any) => {
                  const id = String(u.id);
                  const isEmailDisabled = !forceEnable && u.email_notification_enabled === false;
                  const checked = selectedIds.includes(id);
                  const nickname = u.profile?.nickname;
                  const company = getDisplayCompanyName(u.profile?.company, u.profile?.custom_company_name);
                  const isActuallyDisabled = u.email_notification_enabled === false;
                  return (
                    <RecipientRow
                      key={id}
                      $disabled={isEmailDisabled}
                      onClick={() => {
                        if (isEmailDisabled) return;
                        setSelectedIds(prev =>
                          prev.includes(id)
                            ? prev.filter(v => v !== id)
                            : [...prev, id]
                        );
                      }}
                      style={{ cursor: isEmailDisabled ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isEmailDisabled}
                        onChange={e => {
                          if (isEmailDisabled) return;
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedIds(prev =>
                              prev.includes(id) ? prev : [...prev, id]
                            );
                          } else {
                            setSelectedIds(prev => prev.filter(v => v !== id));
                          }
                        }}
                      />
                      <RecipientInfo>
                        <RecipientName $disabled={isEmailDisabled}>
                          {nickname || '(닉네임 없음)'} {company ? `· ${company}` : ''}
                          {isActuallyDisabled && (
                            <DisabledBadge style={{ 
                              backgroundColor: forceEnable ? '#fee2e2' : '#e5e7eb',
                              color: forceEnable ? '#dc2626' : '#6b7280'
                            }}>
                              {forceEnable ? '강제 해제됨' : '이메일 수신 거부'}
                            </DisabledBadge>
                          )}
                        </RecipientName>
                        <RecipientMeta>{u.email}</RecipientMeta>
                      </RecipientInfo>
                    </RecipientRow>
                  );
                })}
                {!recipients.length && !loadingRecipients && (
                  <div style={{ padding: 16, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                    발송 가능한 회원이 없습니다.
                  </div>
                )}
              </RecipientList>

              {isSending && totalToSend > 0 && (
                <ProgressBarContainer>
                  <ProgressBarFill $progress={sendProgress} />
                  <ProgressText>
                    {Math.round((sendProgress / 100) * totalToSend)} / {totalToSend}명 발송 중...
                  </ProgressText>
                </ProgressBarContainer>
              )}

              <RecipientFooter>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => setShowRecipientModal(false)}
                >
                  닫기
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!selectedIds.length) {
                      toast.warn('최소 1명 이상의 대상을 선택해주세요.');
                      return;
                    }
                    if (
                      !window.confirm(
                        `선택된 ${selectedIds.length}명에게 메일을 발송합니다.\n계속하시겠습니까?`
                      )
                    ) {
                      return;
                    }
                    setIsSending(true);
                    setTotalToSend(selectedIds.length);
                    setSendProgress(0);
                    
                    // 진행 상황 시뮬레이션 (1명당 약 0.6초 예상)
                    const estimatedTime = selectedIds.length * 600; // ms
                    const updateInterval = 100; // 100ms마다 업데이트
                    const progressStep = (100 / (estimatedTime / updateInterval)) * 0.9; // 90%까지만
                    
                    const progressTimer = setInterval(() => {
                      setSendProgress(prev => {
                        const next = prev + progressStep;
                        return next >= 90 ? 90 : next;
                      });
                    }, updateInterval) as unknown as number;
                    
                    try {
                      const res = await adminApi.sendBroadcastEmail({
                        subject,
                        content,
                        is_html: isHtml,
                        targets: selectedIds,
                      });
                      clearInterval(progressTimer);
                      setSendProgress(100);
                      
                      // 완료 메시지 표시
                      setTimeout(() => {
                        toast.success(res?.message || '메일 발송을 완료했습니다.');
                        setShowRecipientModal(false);
                        setSendProgress(0);
                        setTotalToSend(0);
                      }, 500);
                    } catch (error: any) {
                      clearInterval(progressTimer);
                      setSendProgress(0);
                      setTotalToSend(0);
                      console.error('[BroadcastEmailPage] 선택 발송 오류:', error);
                      const msg =
                        error?.response?.data?.message ||
                        '메일 발송에 실패했습니다.';
                      toast.error(msg);
                    } finally {
                      setIsSending(false);
                    }
                  }}
                  disabled={isSending || !selectedIds.length}
                >
                  {isSending ? '발송 중...' : '선택 인원 발송'}
                </Button>
              </RecipientFooter>
            </RecipientModal>
          </RecipientModalOverlay>
        )}
      </Content>
    </Container>
  );
};

export default BroadcastEmailPage;


