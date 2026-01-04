import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { adminCompanyApi } from '../../services/api.ts';
import { FaPlus, FaTrash, FaSave, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { toast } from 'react-toastify';

const SIDEBAR_WIDTH = 280;

const Container = styled.div<{ $sidebarOpen?: boolean }>`
  display: flex;
  flex-direction: row;
  width: 100vw;
  min-height: 100vh;
  background: #f7f7fa;
  margin-left: ${(props) => (props.$sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0')};
  transition: margin-left 0.3s;
  @media (max-width: 768px) {
    margin-left: 0;
    width: 100vw;
  }
`;

const Sidebar = styled.div`
  width: 320px;
  background: #ede7f6;
  border-right: 1.5px solid #e0e0e0;
  padding: 28px 18px 32px 24px;
  min-height: 100vh;
  box-sizing: border-box;
`;

const Main = styled.div`
  flex: 1;
  padding: 32px 28px;
  min-height: 100vh;
  box-sizing: border-box;
`;

const Title = styled.h2`
  font-size: 1.9rem;
  font-weight: 700;
  margin-bottom: 6px;
`;

const Subtitle = styled.p`
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 24px;
`;

const CompanyList = styled.div`
  margin-top: 8px;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: 4px;
`;

const CompanyItem = styled.div<{ $selected: boolean }>`
  padding: 10px 10px;
  border-radius: 10px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: ${(p) => (p.$selected ? '#d1c4e9' : 'transparent')};
  color: #4f46e5;
  font-weight: 600;
  transition: background 0.15s;
  &:hover {
    background: #d1c4e9;
  }
`;

const CompanyName = styled.span`
  flex: 1;
  margin-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Badge = styled.span<{ $active?: boolean }>`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${(p) => (p.$active ? '#065f46' : '#6b7280')};
  background: ${(p) => (p.$active ? 'rgba(16,185,129,0.18)' : 'rgba(148,163,184,0.3)')};
  margin-left: 8px;
`;

const AddButton = styled.button`
  background: #7c3aed;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 12px;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  &:hover {
    background: #4f46e5;
  }
`;

const BulkApplyBox = styled.div`
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px dashed #c4b5fd;
  font-size: 0.8rem;
  color: #4b5563;
`;

const BulkButton = styled.button`
  margin-top: 8px;
  width: 100%;
  border-radius: 999px;
  border: none;
  padding: 8px 10px;
  font-size: 0.85rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FormSection = styled.div`
  max-width: 720px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.06);
  padding: 22px 22px 20px;
  margin-bottom: 18px;
`;

const FormTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #111827;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
`;

const Input = styled.input`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
  outline: none;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.25);
  }
`;

const DomainsHint = styled.div`
  font-size: 0.78rem;
  color: #6b7280;
`;

const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
`;

const PrimaryButton = styled.button`
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:hover {
    background: #4338ca;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DangerButton = styled.button`
  background: #fee2e2;
  color: #b91c1c;
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #fecaca;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 180px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
  line-height: 1.5;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.25);
  }
`;

const PreviewCard = styled.div`
  margin-top: 12px;
  background: #f9fafb;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
`;

const PreviewLabel = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 6px;
  font-weight: 600;
`;

const PreviewFrame = styled.div`
  border-radius: 10px;
  border: 1px solid #d1d5db;
  max-height: 420px;
  overflow: auto;
  background: white;
`;

interface Company {
  id: number;
  name: string;
  emailDomains: string[];
  isActive: boolean;
  createdAt?: string;
}

interface CompanyManagerPageProps {
  sidebarOpen?: boolean;
}

const CompanyManagerPage: React.FC<CompanyManagerPageProps> = ({ sidebarOpen = true }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedForBulk, setSelectedForBulk] = useState<number[]>([]);

  // 편집 폼 상태
  const [editName, setEditName] = useState('');
  const [editDomains, setEditDomains] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [createNotice, setCreateNotice] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [sendPush, setSendPush] = useState(false);
  const [applyPreferCompany, setApplyPreferCompany] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('신규 회사 추가 접수 안내');
  const [emailContent, setEmailContent] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedId) || null,
    [companies, selectedId],
  );

  const canBulkApply = selectedForBulk.length > 0 && !applying;

  const renderEmailPreviewHtml = () => {
    const safeContent = (emailContent || '')
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

  const finalEmailSubject =
    emailSubject && emailSubject.startsWith('[직장인 솔로 공모]')
      ? emailSubject
      : emailSubject
      ? `[직장인 솔로 공모] ${emailSubject}`
      : '[직장인 솔로 공모] (제목 미입력)';

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await adminCompanyApi.getCompanies();
      if (res?.data && Array.isArray(res.data)) {
        setCompanies(res.data);
        if (!selectedId && res.data.length > 0) {
          setSelectedId(res.data[0].id);
        }
      } else {
        setCompanies([]);
      }
    } catch (e: any) {
      console.error('[CompanyManager] 회사 목록 조회 오류:', e);
      toast.error('회사 목록을 불러오지 못했습니다.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      setEditName(selectedCompany.name || '');
      setEditDomains((selectedCompany.emailDomains || []).join(', '));
      setEditActive(selectedCompany.isActive);
      setCreateNotice(false);
      setSendNotification(false);
      setSendPush(false);
      setApplyPreferCompany(false);
      setSendEmail(false);
      setEmailRecipient('');
      setEmailSubject('신규 회사 추가 접수 안내');
      setEmailContent('');
      setShowEmailPreview(false);
    } else {
      setEditName('');
      setEditDomains('');
      setEditActive(true);
      setCreateNotice(false);
      setSendNotification(false);
      setSendPush(false);
      setApplyPreferCompany(false);
      setSendEmail(false);
      setEmailRecipient('');
      setEmailSubject('신규 회사 추가 접수 안내');
      setEmailContent('');
      setShowEmailPreview(false);
    }
  }, [selectedCompany]);

  // 회사명이 변경되면 메일 내용 자동 업데이트
  useEffect(() => {
    if (!selectedCompany && editName.trim()) {
      const domains = editDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d.length > 0);
      const domainText = domains.length > 0 ? `@${domains[0]}` : '@도메인.com';
      
      const defaultContent = [
        '안녕하십니까 직쏠공입니다.',
        '',
        `가입가능 회사 추가 관련 신청하신 [${editName.trim()}] 가 추가 등록 되어 안내드립니다.`,
        '',
        `요청하신 도메인주소 ( ${domainText} )으로 이메일 인증 및 가입이 가능합니다.`,
        '',
        '많은 이용 부탁드립니다.',
        '',
        '감사합니다.',
      ].join('\n');
      
      setEmailContent(defaultContent);
    }
  }, [editName, editDomains, selectedCompany]);

  const handleSelectForBulk = (companyId: number) => {
    setSelectedForBulk((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId],
    );
  };

  const handleStartCreate = () => {
    setSelectedId(null);
    setEditName('');
    setEditDomains('');
    setEditActive(true);
    setCreateNotice(false);
    setSendNotification(false);
    setSendPush(false);
    setApplyPreferCompany(false);
    setSendEmail(false);
    setEmailRecipient('');
    setEmailSubject('신규 회사 추가 접수 안내');
    setEmailContent('');
    setShowEmailPreview(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.warn('회사명을 입력해주세요.');
      return;
    }
    const domains = editDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);

    setSaving(true);
    try {
      if (selectedCompany) {
        // 수정
        const res = await adminCompanyApi.updateCompany(selectedCompany.id, {
          name: editName.trim(),
          emailDomains: domains,
          isActive: editActive,
        });
        if (res?.success) {
          toast.success('회사 정보가 수정되었습니다.');
          await loadCompanies();
        } else {
          toast.error(res?.message || '회사 정보 수정에 실패했습니다.');
        }
      } else {
        // 생성
        if (sendEmail && !emailRecipient.trim()) {
          toast.warn('메일 수신자 주소를 입력해주세요.');
          return;
        }
        
        const res = await adminCompanyApi.createCompany({
          name: editName.trim(),
          emailDomains: domains,
          isActive: editActive,
          createNotice,
          sendNotification: createNotice ? sendNotification : false,
          sendPush: createNotice ? sendPush : false,
          applyPreferCompany,
          sendEmail,
          emailRecipient: sendEmail ? emailRecipient.trim() : undefined,
          emailSubject: sendEmail ? emailSubject.trim() : undefined,
          emailContent: sendEmail ? emailContent : undefined,
        } as any);
        if (res?.success) {
          let successMsg = '새 회사가 추가되었습니다.';
          if (applyPreferCompany) {
            successMsg = '새 회사가 추가되고 전체 회원의 선호 회사에 등록되었습니다.';
          }
          if (sendEmail) {
            successMsg += ' 알림 메일도 발송되었습니다.';
          }
          toast.success(successMsg);
          await loadCompanies();
        } else {
          toast.error(res?.message || '회사 추가에 실패했습니다.');
        }
      }
    } catch (e: any) {
      console.error('[CompanyManager] 저장 오류:', e);
      toast.error('회사 정보를 저장하는 동안 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    if (!window.confirm(`정말 "${selectedCompany.name}" 회사를 삭제할까요?`)) return;
    try {
      const res = await adminCompanyApi.deleteCompany(selectedCompany.id);
      if (res?.success) {
        toast.success('회사가 삭제되었습니다.');
        setSelectedId(null);
        await loadCompanies();
      } else {
        toast.error(res?.message || '회사 삭제에 실패했습니다.');
      }
    } catch (e: any) {
      console.error('[CompanyManager] 삭제 오류:', e);
      toast.error('회사 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBulkApply = async () => {
    if (!selectedForBulk.length) return;
    if (
      !window.confirm(
        '선택한 회사들을 모든 회원의 선호 회사(prefer_company)에 일괄 추가합니다.\n' +
          '이미 포함된 회사는 중복 없이 유지되며, 되돌릴 수 없습니다.\n\n계속 진행할까요?',
      )
    ) {
      return;
    }

    setApplying(true);
    try {
      const res = await adminCompanyApi.applyPreferredToAllUsers(selectedForBulk);
      if (res?.success) {
        toast.success(res.message || '선호 회사가 일괄 적용되었습니다.');
      } else {
        toast.error(res?.message || '선호 회사 일괄 적용에 실패했습니다.');
      }
    } catch (e: any) {
      console.error('[CompanyManager] 선호 회사 일괄 적용 오류:', e);
      toast.error('선호 회사 일괄 적용 중 오류가 발생했습니다.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Sidebar>
        <Title>회사 관리</Title>
        <Subtitle>이메일 도메인 기반 회사 목록을 관리하고, 회원들의 선호 회사를 일괄 설정할 수 있습니다.</Subtitle>
        <AddButton type="button" onClick={handleStartCreate}>
          <FaPlus /> 새 회사 추가
        </AddButton>

        <CompanyList>
          {loading ? (
            <div style={{ padding: '12px 4px', fontSize: '0.9rem', color: '#6b7280' }}>회사 목록을 불러오는 중...</div>
          ) : companies.length === 0 ? (
            <div style={{ padding: '12px 4px', fontSize: '0.9rem', color: '#6b7280' }}>등록된 회사가 없습니다.</div>
          ) : (
            companies.map((c) => {
              const isSelected = selectedId === c.id;
              const checked = selectedForBulk.includes(c.id);
              return (
                <CompanyItem
                  key={c.id}
                  $selected={isSelected}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectForBulk(c.id);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.95rem' }}
                    >
                      {checked ? <FaCheckSquare /> : <FaSquare />}
                    </span>
                    <CompanyName>{c.name}</CompanyName>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Badge $active={c.isActive}>{c.isActive ? '활성' : '비활성'}</Badge>
                  </div>
                </CompanyItem>
              );
            })
          )}
        </CompanyList>

        <BulkApplyBox>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>선호 회사 일괄 적용</div>
          <div>
            좌측 목록에서 체크한 회사들을 모든 회원의 선호 회사(prefer_company)에 추가합니다. 이미 포함된 회사는
            중복 없이 유지됩니다.
          </div>
          <BulkButton type="button" disabled={!canBulkApply} onClick={handleBulkApply}>
            {applying ? '적용 중...' : `선택한 회사 ${selectedForBulk.length}개 전체 회원에 추가`}
          </BulkButton>
        </BulkApplyBox>
      </Sidebar>

      <Main>
        <FormSection>
          <FormTitle>{selectedCompany ? '회사 정보 수정' : '새 회사 추가'}</FormTitle>
          <FormRow>
            <Label>회사명</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="예: 현대자동차"
            />
          </FormRow>
          <FormRow>
            <Label>이메일 도메인 목록</Label>
            <Input
              value={editDomains}
              onChange={(e) => setEditDomains(e.target.value)}
              placeholder="예: hyundai.com, hd.com"
            />
            <DomainsHint>콤마(,)로 구분하여 여러 도메인을 입력할 수 있습니다. 공백은 자동으로 제거됩니다.</DomainsHint>
          </FormRow>
          <FormRow>
            <Label>상태</Label>
            <SwitchRow>
              <Checkbox
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              <span>{editActive ? '활성(매칭 및 도메인 매핑에 사용)' : '비활성(목록에는 남지만 사용되지 않음)'}</span>
            </SwitchRow>
          </FormRow>
          {!selectedCompany && (
            <>
              <FormRow>
                <Label>공지사항 자동 등록</Label>
                <SwitchRow>
                  <Checkbox
                    checked={createNotice}
                    onChange={(e) => setCreateNotice(e.target.checked)}
                  />
                  <span>
                    새 회사를 추가할 때 회사 추가 안내 공지사항을 자동으로 등록합니다.
                  </span>
                </SwitchRow>
                {createNotice && (
                  <div style={{ marginLeft: '28px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <SwitchRow>
                      <Checkbox
                        checked={sendNotification}
                        onChange={(e) => setSendNotification(e.target.checked)}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        알림 메시지 송부 (앱 내 알림)
                      </span>
                    </SwitchRow>
                    <SwitchRow>
                      <Checkbox
                        checked={sendPush}
                        onChange={(e) => setSendPush(e.target.checked)}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        푸시 알림 송부 (기기 푸시 알림)
                      </span>
                    </SwitchRow>
                  </div>
                )}
              </FormRow>
              <FormRow>
                <Label>전체 회원 선호 회사에 추가</Label>
                <SwitchRow>
                  <Checkbox
                    checked={applyPreferCompany}
                    onChange={(e) => setApplyPreferCompany(e.target.checked)}
                  />
                  <span>
                    새 회사를 추가할 때 모든 회원의 선호 회사(prefer_company)에 자동으로 추가합니다.
                  </span>
                </SwitchRow>
              </FormRow>
              <FormRow>
                <Label>신규회사 추가 알림 메일 송부</Label>
                <SwitchRow>
                  <Checkbox
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  <span>
                    회사 추가를 요청한 분에게 가입 가능 안내 메일을 발송합니다.
                  </span>
                </SwitchRow>
              </FormRow>
            </>
          )}
          {!selectedCompany && sendEmail && (
            <>
              <FormRow>
                <Label>수신자 이메일 주소</Label>
                <Input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="예: user@example.com"
                />
              </FormRow>
              <FormRow>
                <Label>메일 제목</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="[직장인 솔로 공모] 를 제외한 제목을 입력해 주세요"
                />
                <DomainsHint>
                  실제 발송 시 제목 앞에 자동으로 <strong>[직장인 솔로 공모]</strong>가 붙습니다.
                </DomainsHint>
              </FormRow>
              <FormRow>
                <Label>메일 내용</Label>
                <Textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="회사명이 입력되면 자동으로 작성됩니다."
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <PrimaryButton
                    type="button"
                    onClick={() => setShowEmailPreview(!showEmailPreview)}
                    style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                  >
                    {showEmailPreview ? '미리보기 닫기' : '미리보기'}
                  </PrimaryButton>
                </div>
              </FormRow>
              {showEmailPreview && (
                <PreviewCard>
                  <PreviewLabel>미리보기 (실제 이메일 레이아웃)</PreviewLabel>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                    {finalEmailSubject}
                  </div>
                  <PreviewFrame dangerouslySetInnerHTML={renderEmailPreviewHtml()} />
                </PreviewCard>
              )}
            </>
          )}
          <FormActions>
            {selectedCompany && (
              <DangerButton type="button" onClick={handleDelete}>
                <FaTrash style={{ marginRight: 4 }} />
                삭제
              </DangerButton>
            )}
            <PrimaryButton type="button" onClick={handleSave} disabled={saving}>
              <FaSave />
              {saving ? '저장 중...' : '저장'}
            </PrimaryButton>
          </FormActions>
        </FormSection>
      </Main>
    </Container>
  );
};

export default CompanyManagerPage;


