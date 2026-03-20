import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { adminCompanyApi } from '../../services/api';
import { FaPlus, FaTrash, FaSave, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { toast } from 'react-toastify';

const SIDEBAR_WIDTH = 280;

const SIDEBAR_PANEL_WIDTH = 320;

const Container = styled.div<{ $sidebarOpen?: boolean }>`
  flex: 1;
  margin-left: ${(props) => (props.$sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  box-sizing: border-box;
  overflow-x: hidden;
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: var(--mobile-top-padding, 80px);
  }
`;

const Content = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
`;

const PageTitle = styled.h1`
  color: #ffffff;
  margin: 0 0 2rem 0;
  font-size: 2rem;
  font-weight: 700;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
`;

const Title = styled.h2`
  font-size: 1.9rem;
  font-weight: 700;
  margin-bottom: 6px;
  @media (max-width: 768px) {
    font-size: 1.35rem;
  }
`;

const Subtitle = styled.p`
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 24px;
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin-bottom: 12px;
  }
`;

const ListPanelHeader = styled.div`
  flex-shrink: 0;
  padding: 24px 18px 16px;
  box-sizing: border-box;
`;

const CompanyListScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 18px 16px;
  box-sizing: border-box;
`;

const CompanyList = styled.div`
  margin-top: 8px;
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
  flex-shrink: 0;
  padding: 16px 18px 24px;
  border-top: 1px solid #e0e0e0;
  background: #f9fafb;
  font-size: 0.8rem;
  color: #4b5563;
  @media (max-width: 768px) {
    padding: 12px 14px 20px;
    font-size: 0.75rem;
  }
`;

/* 우측 상단 플로팅 버튼 */
const FloatBtn = styled.button<{ $position?: 'top' | 'below' }>`
  position: fixed;
  right: 20px;
  top: ${(p) => (p.$position === 'below' ? '76px' : '20px')};
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  color: #fff;
  font-size: 1.3rem;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
  }
  @media (min-width: 769px) {
    right: 24px;
    top: ${(p) => (p.$position === 'below' ? '80px' : '24px')};
  }
`;

/* 신규 요청 플로팅 버튼 (강조 색상) - 회사 목록 버튼 바로 아래 우측 고정 */
const RequestFloatBtn = styled(FloatBtn)`
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.45);
`;

/* 회사 목록 슬라이드 패널 (우측) */
const ListPanelOverlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 950;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  visibility: ${(p) => (p.$open ? 'visible' : 'hidden')};
  transition: opacity 0.25s, visibility 0.25s;
`;

const ListPanel = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: ${SIDEBAR_PANEL_WIDTH}px;
  max-width: 90vw;
  height: 100vh;
  background: #ede7f6;
  border-left: 1.5px solid #e0e0e0;
  box-sizing: border-box;
  z-index: 951;
  transform: translateX(${(p) => (p.$open ? 0 : '100%')});
  transition: transform 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(15, 23, 42, 0.12);
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

/* 신규 요청 목록 패널 */
const RequestListOverlay = styled(ListPanelOverlay)``;
const RequestListPanel = styled(ListPanel)`
  background: #ecfdf5;
  border-left-color: #a7f3d0;
  padding: 24px 18px 32px;
  overflow-y: auto;
  @media (max-width: 768px) {
    padding: 20px 14px 28px;
  }
`;
const RequestItem = styled.div<{ $status: string }>`
  padding: 12px 10px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid ${(p) => (p.$status === 'pending' ? '#a7f3d0' : '#e5e7eb')};
  font-size: 0.9rem;
`;
const RequestMeta = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 4px;
`;
const RejectModalOverlay = styled(ListPanelOverlay)``;
const RejectModalContent = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  padding: 24px;
  z-index: 960;
`;

const FormSection = styled.div`
  max-width: 720px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.06);
  padding: 22px 22px 20px;
  margin-bottom: 18px;
  @media (max-width: 768px) {
    padding: 16px 14px 18px;
    border-radius: 12px;
  }
`;

const FormTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #111827;
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 10px;
  }
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
  box-sizing: border-box;
  width: 100%;
  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 16px; /* iOS 줌 방지 */
  }
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
  align-items: flex-start;
  gap: 8px;
  font-size: 0.88rem;
  @media (max-width: 768px) {
    font-size: 0.82rem;
    line-height: 1.4;
  }
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

const SecondaryButton = styled.button`
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  @media (max-width: 768px) {
    min-height: 120px;
    padding: 10px 12px;
    font-size: 16px; /* iOS 줌 방지 */
  }
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
  @media (max-width: 768px) {
    max-height: 280px;
  }
`;

interface Company {
  id: number;
  name: string;
  emailDomains: string[];
  isActive: boolean;
  createdAt?: string;
}

interface CompanyRequest {
  id: string;
  companyName: string;
  emailDomain: string;
  replyEmail: string;
  message: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  companyId: number | null;
}

// 거절 메일 기본 샘플 (일반적으로 널리 알려진 기업 외 확장이 어렵다는 안내 + 기타회사 가입 안내)
const REJECT_EMAIL_SAMPLE = {
  subject: '회사 추가 검토 결과 안내',
  body: `안녕하십니까, 직장인 솔로 공모(직쏠공)입니다.

신규 회사 추가를 요청해 주셔서 감사합니다.

저희 서비스는 현재 공기업·공무원·의료기관 및 일부 대기업을 중심으로 운영 중입니다.
일반적으로 널리 알려진 기업 외에는 관리상의 한계로 회사 도메인을 무한히 확장하기 어려운 상황입니다.

서비스 운영상 모든 회사를 알기 어려워
개인 역량부족과 주관적 판단을 통해 이용에 불편을 드린 점 정말 죄송합니다.

하지만! 정식 회사 추가 없이도 개인 이메일 인증을 통해 가입이 가능합니다.
아래 경로를 통해 **기타 회사**로 선택하신 후 회사명을 별도로 작성하실 수 있습니다.

▶ 가입 경로: 직쏠공 로그인/회원가입 → 회사 선택 → "프리랜서/자영업 및 기타회사" 선택
▶ 기타 회사를 선택한 후에는 회사명을 별도로 작성하실 수 있습니다.

위 안내 사항 참조바라며, 이미 많은분들께서 기타회사 가입을 통해 서비스를 이용하고 있는 점 전달드립니다.
많은 이용 부탁드립니다.
감사합니다.`,
};

interface CompanyManagerPageProps {
  sidebarOpen?: boolean;
}

const CompanyManagerPage: React.FC<CompanyManagerPageProps> = ({ sidebarOpen = true }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedForBulk, setSelectedForBulk] = useState<number[]>([]);
  const [companyListOpen, setCompanyListOpen] = useState(false);
  const [requestListOpen, setRequestListOpen] = useState(false);
  const [companyRequests, setCompanyRequests] = useState<CompanyRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = useState<CompanyRequest | null>(null);
  const [rejectSubject, setRejectSubject] = useState(REJECT_EMAIL_SAMPLE.subject);
  const [rejectBody, setRejectBody] = useState(REJECT_EMAIL_SAMPLE.body);
  const [rejectSending, setRejectSending] = useState(false);

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
    loadCompanyRequests();
  }, []);

  const loadCompanyRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await adminCompanyApi.getCompanyRequests();
      if (res?.data && Array.isArray(res.data)) {
        setCompanyRequests(res.data);
      } else {
        setCompanyRequests([]);
      }
    } catch (e: any) {
      console.error('[CompanyManager] 요청 목록 조회 오류:', e);
      toast.error('요청 목록을 불러오지 못했습니다.');
      setCompanyRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (requestListOpen) loadCompanyRequests();
  }, [requestListOpen]);

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
    setPendingRequestId(null);
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

  const handleAcceptRequest = (req: CompanyRequest) => {
    setRequestListOpen(false);
    setSelectedId(null);
    setPendingRequestId(req.id);
    setEditName(req.companyName);
    setEditDomains(req.emailDomain);
    setEditActive(true);
    setCreateNotice(false);
    setSendNotification(false);
    setSendPush(false);
    setApplyPreferCompany(true);
    setSendEmail(true);
    setEmailRecipient(req.replyEmail);
    setEmailSubject('신규 회사 추가 접수 안내');
    const domainText = req.emailDomain ? `@${req.emailDomain}` : '@도메인.com';
    setEmailContent(
      [
        '안녕하십니까 직쏠공입니다.',
        '',
        `가입가능 회사 추가 관련 신청하신 [${req.companyName}] 가 추가 등록 되어 안내드립니다.`,
        '',
        `요청하신 도메인주소 ( ${domainText} )으로 이메일 인증 및 가입이 가능합니다.`,
        '',
        '많은 이용 부탁드립니다.',
        '',
        '감사합니다.',
      ].join('\n'),
    );
    setShowEmailPreview(false);
    toast.info('아래 폼을 확인한 뒤 [저장]을 눌러 회사를 추가해주세요.');
  };

  const handleRejectClick = (req: CompanyRequest) => {
    setRejectModalRequest(req);
    setRejectSubject(REJECT_EMAIL_SAMPLE.subject);
    setRejectBody(REJECT_EMAIL_SAMPLE.body);
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalRequest || !rejectBody.trim()) {
      toast.warn('거절 메일 내용을 입력해주세요.');
      return;
    }
    setRejectSending(true);
    try {
      await adminCompanyApi.rejectCompanyRequest(rejectModalRequest.id, {
        rejectSubject: rejectSubject.trim(),
        rejectBody: rejectBody.trim(),
      });
      toast.success('거절 메일이 발송되었습니다.');
      setRejectModalRequest(null);
      loadCompanyRequests();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '거절 메일 발송에 실패했습니다.');
    } finally {
      setRejectSending(false);
    }
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
          const createdCompanyId = (res as any)?.data?.id;
          if (pendingRequestId && createdCompanyId != null) {
            try {
              await adminCompanyApi.patchCompanyRequest(pendingRequestId, {
                status: 'accepted',
                companyId: createdCompanyId,
              });
              loadCompanyRequests();
            } catch (patchErr: any) {
              console.error('[CompanyManager] 요청 상태 업데이트 실패:', patchErr);
            }
            setPendingRequestId(null);
          }
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

  const pendingCount = companyRequests.filter((r) => r.status === 'pending').length;

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <FloatBtn
        type="button"
        onClick={() => setCompanyListOpen(true)}
        title="회사 목록"
        aria-label="회사 목록 열기"
      >
        📋
      </FloatBtn>
      <RequestFloatBtn
        type="button"
        $position="below"
        onClick={() => setRequestListOpen(true)}
        title="신규 회사 추가 요청"
        aria-label="신규 회사 추가 요청 보기"
      >
        📥
        {pendingCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: '#dc2626',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </RequestFloatBtn>

      <ListPanelOverlay $open={companyListOpen} onClick={() => setCompanyListOpen(false)} />
      <ListPanel $open={companyListOpen}>
        <ListPanelHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Title>기존 등록 회사</Title>
            <button
              type="button"
              onClick={() => setCompanyListOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: 4,
                lineHeight: 1,
                color: '#6b7280',
              }}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <Subtitle>이메일 도메인 기반 회사 목록을 관리하고, 회원들의 선호 회사를 일괄 설정할 수 있습니다.</Subtitle>
          <AddButton type="button" onClick={() => { handleStartCreate(); setCompanyListOpen(false); }}>
            <FaPlus /> 새 회사 추가
          </AddButton>
        </ListPanelHeader>

        <CompanyListScroll>
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
                    onClick={() => { setSelectedId(c.id); setCompanyListOpen(false); }}
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
        </CompanyListScroll>

        <BulkApplyBox>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>선호 회사 일괄 적용</div>
          <div>
            목록에서 체크한 회사들을 모든 회원의 선호 회사(prefer_company)에 추가합니다. 이미 포함된 회사는
            중복 없이 유지됩니다.
          </div>
          <BulkButton type="button" disabled={!canBulkApply} onClick={handleBulkApply}>
            {applying ? '적용 중...' : `선택한 회사 ${selectedForBulk.length}개 전체 회원에 추가`}
          </BulkButton>
        </BulkApplyBox>
      </ListPanel>

      <RequestListOverlay $open={requestListOpen} onClick={() => setRequestListOpen(false)} />
      <RequestListPanel $open={requestListOpen}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Title>신규 회사 추가 요청</Title>
          <button
            type="button"
            onClick={() => setRequestListOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
              color: '#6b7280',
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <Subtitle>요청을 수락하면 새 회사 추가 폼으로 연동되고, 거절 시 메일이 발송됩니다.</Subtitle>
        {requestsLoading ? (
          <div style={{ padding: '12px 4px', fontSize: '0.9rem', color: '#6b7280' }}>요청 목록을 불러오는 중...</div>
        ) : companyRequests.length === 0 ? (
          <div style={{ padding: '12px 4px', fontSize: '0.9rem', color: '#6b7280' }}>대기 중인 요청이 없습니다.</div>
        ) : (
          <div style={{ marginTop: 12, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {companyRequests.map((r) => (
              <RequestItem key={r.id} $status={r.status}>
                <div style={{ fontWeight: 600, color: '#111827' }}>{r.companyName}</div>
                <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>도메인: {r.emailDomain}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>회신: {r.replyEmail}</div>
                {r.message && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                    {r.message}
                  </div>
                )}
                <RequestMeta>
                  {new Date(r.createdAt).toLocaleString('ko-KR')} · {r.status === 'pending' ? '대기' : r.status === 'accepted' ? '수락됨' : '거절됨'}
                </RequestMeta>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleAcceptRequest(r)}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      수락
                    </PrimaryButton>
                    <DangerButton
                      type="button"
                      onClick={() => handleRejectClick(r)}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      거절
                    </DangerButton>
                  </div>
                )}
              </RequestItem>
            ))}
          </div>
        )}
      </RequestListPanel>

      {rejectModalRequest && (
        <RejectModalOverlay $open={true} onClick={() => !rejectSending && setRejectModalRequest(null)}>
          <RejectModalContent onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>거절 메일 작성</h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px 0' }}>
              {rejectModalRequest.companyName} ({rejectModalRequest.replyEmail})에게 발송됩니다.
            </p>
            <FormRow>
              <Label>제목</Label>
              <Input
                value={rejectSubject}
                onChange={(e) => setRejectSubject(e.target.value)}
                placeholder="제목"
              />
            </FormRow>
            <FormRow>
              <Label>내용</Label>
              <Textarea
                value={rejectBody}
                onChange={(e) => setRejectBody(e.target.value)}
                placeholder="거절 사유 및 기타 회사 가입 안내를 입력하세요."
              />
            </FormRow>
            <FormActions>
              <SecondaryButton
                type="button"
                onClick={() => setRejectModalRequest(null)}
                disabled={rejectSending}
              >
                취소
              </SecondaryButton>
              <PrimaryButton type="button" onClick={handleRejectSubmit} disabled={rejectSending}>
                {rejectSending ? '발송 중...' : '거절 메일 발송'}
              </PrimaryButton>
            </FormActions>
          </RejectModalContent>
        </RejectModalOverlay>
      )}

      <Content>
        <Main>
          <PageTitle>회사 관리</PageTitle>
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
                  <div style={{ marginLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
      </Content>
    </Container>
  );
};

export default CompanyManagerPage;


