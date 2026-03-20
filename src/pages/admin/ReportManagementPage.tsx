import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { FaSyncAlt } from 'react-icons/fa';
import { adminReportApi } from '../../services/api';
import InlineSpinner from '../../components/InlineSpinner';

interface ReportManagementPageProps {
  sidebarOpen: boolean;
}

const Container = styled.div<{ $sidebarOpen: boolean }>`
  min-height: 100vh;
  padding: 2rem;
  background: #f8f9fa;
  margin-left: ${props => props.$sidebarOpen ? '250px' : '0'};
  transition: margin-left 0.3s ease;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    margin-left: 0 !important;
    padding: 1rem;
    padding-top: 5rem;
    width: 100%;
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  
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
  
  &:active {
    transform: translateY(0);
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

const FilterSection = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  box-sizing: border-box;
  width: 100%;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }
`;

const TableWrapper = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  box-sizing: border-box;
  width: 100%;
  
  @media (max-width: 768px) {
    padding: 1rem;
    overflow-x: visible;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #f3f4f6;
  }
  
  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  
  tr:hover {
    background: #f9fafb;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileCardList = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`;

const MobileCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  width: 100%;
  
  &:active {
    background: #f9fafb;
  }
`;

const MobileCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const MobileCardLabel = styled.span`
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
`;

const MobileCardValue = styled.span`
  font-size: 0.9rem;
  color: #111827;
  font-weight: 500;
  text-align: right;
`;

const MobileClickableText = styled.span`
  color: #7C3AED;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
`;

const MobileButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const ProfileInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  font-size: 0.9rem;
  box-sizing: border-box;
  width: 100%;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    font-size: 0.85rem;
  }
  
  div {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
`;

const ProfileSection = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  box-sizing: border-box;
  width: 100%;
  
  @media (max-width: 768px) {
    padding: 0.875rem;
  }
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: #333;
    
    @media (max-width: 768px) {
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }
  }
`;

const DetailSection = styled.div`
  padding: 1rem;
  background: #fff3cd;
  border-radius: 8px;
  border: 1px solid #ffeaa7;
  box-sizing: border-box;
  width: 100%;
  
  @media (max-width: 768px) {
    padding: 0.875rem;
  }
  
  strong {
    display: block;
    margin-bottom: 0.5rem;
  }
  
  div {
    margin-top: 0.5rem;
    white-space: pre-wrap;
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
    
    @media (max-width: 768px) {
      font-size: 0.9rem;
    }
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-block;
  white-space: nowrap;
  
  ${props => {
    switch (props.$status) {
      case 'pending':
        return `
          background: #FEF3C7;
          color: #92400E;
        `;
      case 'dismissed':
        return `
          background: #FEE2E2;
          color: #991B1B;
        `;
      case 'temporary_ban':
        return `
          background: #FEF3C7;
          color: #92400E;
        `;
      case 'permanent_ban':
        return `
          background: #FEE2E2;
          color: #991B1B;
        `;
      default:
        return `
          background: #F3F4F6;
          color: #374151;
        `;
    }
  }}
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger'; $fullWidth?: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 0.5rem;
  ${props => props.$fullWidth && 'flex: 1; margin-right: 0;'}
  
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: #7C3AED;
          color: white;
          
          &:hover {
            background: #6D28D9;
          }
        `;
      case 'danger':
        return `
          background: #EF4444;
          color: white;
          
          &:hover {
            background: #DC2626;
          }
        `;
      default:
        return `
          background: #F3F4F6;
          color: #374151;
          
          &:hover {
            background: #E5E7EB;
          }
        `;
    }
  }}
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0.6rem 1rem;
  }
`;

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    align-items: flex-start;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    width: calc(100% - 1rem);
    max-width: calc(100vw - 1rem);
    max-height: none;
    min-height: auto;
    padding: 1rem;
    margin: 0.5rem auto;
    border-radius: 12px;
    font-size: 0.9rem;
  }
`;

const ModalTitle = styled.h2`
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.$variant === 'primary' ? `
    background: #7C3AED;
    color: white;
    
    &:hover {
      background: #6D28D9;
    }
    
    &:disabled {
      background: #9CA3AF;
      cursor: not-allowed;
    }
  ` : `
    background: #F3F4F6;
    color: #374151;
    
    &:hover {
      background: #E5E7EB;
    }
  `}
  
  @media (max-width: 768px) {
    padding: 0.85rem 1.25rem;
    font-size: 0.95rem;
  }
`;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const ReportManagementPage: React.FC<ReportManagementPageProps> = ({ sidebarOpen }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [processModal, setProcessModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [processForm, setProcessForm] = useState({
    status: '',
    admin_notes: '',
    ban_duration_days: 30
  });

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await adminReportApi.getAllReports({
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setReports(response.data || []);
    } catch (error) {
      console.error('신고 목록 로드 오류:', error);
      toast.error('신고 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReport = (report: any) => {
    setSelectedReport(report);
    setProcessForm({
      status: report.status === 'pending' ? 'dismissed' : report.status,
      admin_notes: report.admin_notes || '',
      ban_duration_days: 30
    });
    setProcessModal(true);
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReport) return;

    try {
      await adminReportApi.processReport(selectedReport.id, processForm);
      const successMessage = selectedReport.status === 'pending' 
        ? '신고 처리가 완료되었습니다.' 
        : '처리 내용이 변경되었습니다.';
      toast.success(successMessage);
      setProcessModal(false);
      loadReports();
    } catch (error) {
      console.error('신고 처리 오류:', error);
      const errorMessage = selectedReport.status === 'pending' 
        ? '신고 처리에 실패했습니다.' 
        : '처리 내용 변경에 실패했습니다.';
      toast.error(errorMessage);
    }
  };

  const handleCloseModal = () => {
    setProcessModal(false);
    setSelectedReport(null);
  };

  const handleViewDetail = async (report: any) => {
    try {
      const response = await adminReportApi.getReportDetail(report.id);
      setSelectedReport(response);
      setDetailModal(true);
    } catch (error) {
      console.error('신고 상세 조회 오류:', error);
      toast.error('신고 상세 내용을 불러오는데 실패했습니다.');
    }
  };

  const handleViewProfile = async (userId: string) => {
    if (!userId) {
      toast.error('사용자 정보를 찾을 수 없습니다.');
      return;
    }
    
    try {
      setLoadingProfile(true);
      setSelectedUserId(userId);
      setProfileModal(true);
      const profile = await adminReportApi.getUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('프로필 조회 오류:', error);
      toast.error('프로필을 불러오는데 실패했습니다.');
      setProfileModal(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCloseProfileModal = () => {
    setProfileModal(false);
    setSelectedUserId(null);
    setUserProfile(null);
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <TitleRow>
        <Title>신고 관리</Title>
        <RefreshButton onClick={() => window.location.reload()}>
          <FaSyncAlt />
          새로고침
        </RefreshButton>
      </TitleRow>
      
      <FilterSection>
        <Label>상태 필터:</Label>
        <FilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체</option>
          <option value="pending">대기중</option>
          <option value="dismissed">기각</option>
          <option value="temporary_ban">기간정지</option>
          <option value="permanent_ban">영구정지</option>
        </FilterSelect>
      </FilterSection>

      <TableWrapper>
        {loading ? (
          <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="신고 목록을 불러오는 중입니다..." />
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>신고자</th>
                  <th>신고대상</th>
                  <th>신고유형</th>
                  <th>상태</th>
                  <th>신고일시</th>
                  <th>처리일시</th>
                  <th>신고횟수</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td 
                      style={{ cursor: 'pointer', color: '#7C3AED', textDecoration: 'underline' }}
                      onClick={() => handleViewDetail(report)}
                      title="클릭하여 신고 상세 내용 보기"
                    >
                      {report.id}
                    </td>
                    <td
                      style={{ cursor: 'pointer', color: '#7C3AED', textDecoration: 'underline' }}
                      onClick={() => report.reporter?.id && handleViewProfile(report.reporter.id)}
                      title="클릭하여 프로필 보기"
                    >
                      {report.reporter?.nickname || '알 수 없음'}
                    </td>
                    <td
                      style={{ cursor: 'pointer', color: '#7C3AED', textDecoration: 'underline' }}
                      onClick={() => report.reported_user?.id && handleViewProfile(report.reported_user.id)}
                      title="클릭하여 프로필 보기"
                    >
                      {report.reported_user?.nickname || '알 수 없음'}
                    </td>
                    <td>{report.report_type}</td>
                    <td>
                      <StatusBadge $status={report.status}>
                        {report.status === 'pending' && '대기중'}
                        {report.status === 'dismissed' && '기각'}
                        {report.status === 'temporary_ban' && '기간정지'}
                        {report.status === 'permanent_ban' && '영구정지'}
                      </StatusBadge>
                    </td>
                    <td>{formatDate(report.created_at)}</td>
                    <td>{report.resolved_at ? formatDate(report.resolved_at) : '-'}</td>
                    <td>{report.reported_user?.report_count || 0}회</td>
                    <td>
                      <ActionButton
                        $variant="primary"
                        onClick={() => handleProcessReport(report)}
                      >
                        {report.status === 'pending' ? '처리' : '처리변경'}
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* 모바일 카드 뷰 */}
            <MobileCardList>
              {reports.map((report) => (
                <MobileCard key={report.id}>
                  <MobileCardRow>
                    <MobileCardLabel>신고 ID</MobileCardLabel>
                    <MobileClickableText onClick={() => handleViewDetail(report)}>
                      #{report.id}
                    </MobileClickableText>
                  </MobileCardRow>
                  
                  <MobileCardRow>
                    <MobileCardLabel>신고자</MobileCardLabel>
                    <MobileClickableText 
                      onClick={() => report.reporter?.id && handleViewProfile(report.reporter.id)}
                    >
                      {report.reporter?.nickname || '알 수 없음'}
                    </MobileClickableText>
                  </MobileCardRow>
                  
                  <MobileCardRow>
                    <MobileCardLabel>신고대상</MobileCardLabel>
                    <MobileClickableText 
                      onClick={() => report.reported_user?.id && handleViewProfile(report.reported_user.id)}
                    >
                      {report.reported_user?.nickname || '알 수 없음'}
                    </MobileClickableText>
                  </MobileCardRow>
                  
                  <MobileCardRow>
                    <MobileCardLabel>신고유형</MobileCardLabel>
                    <MobileCardValue>{report.report_type}</MobileCardValue>
                  </MobileCardRow>
                  
                  <MobileCardRow>
                    <MobileCardLabel>상태</MobileCardLabel>
                    <StatusBadge $status={report.status}>
                      {report.status === 'pending' && '대기중'}
                      {report.status === 'dismissed' && '기각'}
                      {report.status === 'temporary_ban' && '기간정지'}
                      {report.status === 'permanent_ban' && '영구정지'}
                    </StatusBadge>
                  </MobileCardRow>
                  
                  <MobileCardRow>
                    <MobileCardLabel>신고일시</MobileCardLabel>
                    <MobileCardValue style={{ fontSize: '0.8rem' }}>
                      {formatDate(report.created_at)}
                    </MobileCardValue>
                  </MobileCardRow>
                  
                  {report.resolved_at && (
                    <MobileCardRow>
                      <MobileCardLabel>처리일시</MobileCardLabel>
                      <MobileCardValue style={{ fontSize: '0.8rem' }}>
                        {formatDate(report.resolved_at)}
                      </MobileCardValue>
                    </MobileCardRow>
                  )}
                  
                  <MobileCardRow>
                    <MobileCardLabel>누적 신고횟수</MobileCardLabel>
                    <MobileCardValue style={{ fontWeight: 600, color: '#DC2626' }}>
                      {report.reported_user?.report_count || 0}회
                    </MobileCardValue>
                  </MobileCardRow>
                  
                  <MobileButtonGroup>
                    <ActionButton
                      $variant="primary"
                      $fullWidth
                      onClick={() => handleProcessReport(report)}
                    >
                      {report.status === 'pending' ? '처리하기' : '처리변경'}
                    </ActionButton>
                  </MobileButtonGroup>
                </MobileCard>
              ))}
            </MobileCardList>
            
            {reports.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                신고 내역이 없습니다.
              </div>
            )}
          </>
        )}
      </TableWrapper>

      {/* 신고 상세 모달 */}
      <ModalOverlay $isOpen={detailModal} onClick={() => setDetailModal(false)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalTitle>신고 상세 내용</ModalTitle>
          
          {selectedReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ProfileSection>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>
                    <strong>신고 ID:</strong> {selectedReport.id}
                  </div>
                  <div>
                    <strong>신고자:</strong>{' '}
                    <span
                      style={{ cursor: 'pointer', color: '#7C3AED', textDecoration: 'underline' }}
                      onClick={() => selectedReport.reporter?.id && handleViewProfile(selectedReport.reporter.id)}
                    >
                      {selectedReport.reporterNickname || selectedReport.reporter?.nickname || '알 수 없음'}
                    </span>
                    {selectedReport.reporterGender && ` (${selectedReport.reporterGender === 'male' ? '남' : '여'})`}
                  </div>
                  <div>
                    <strong>신고대상:</strong>{' '}
                    <span
                      style={{ cursor: 'pointer', color: '#7C3AED', textDecoration: 'underline' }}
                      onClick={() => selectedReport.reported_user?.id && handleViewProfile(selectedReport.reported_user.id)}
                    >
                      {selectedReport.reportedUserNickname || selectedReport.reported_user?.nickname || '알 수 없음'}
                    </span>
                    {selectedReport.reportedUserGender && ` (${selectedReport.reportedUserGender === 'male' ? '남' : '여'})`}
                  </div>
                  <div>
                    <strong>신고유형:</strong> {selectedReport.report_type}
                  </div>
                  <div>
                    <strong>신고일시:</strong> {formatDate(selectedReport.created_at)}
                  </div>
                  <div>
                    <strong>처리상태:</strong>{' '}
                    <StatusBadge $status={selectedReport.status}>
                      {selectedReport.status === 'pending' && '대기중'}
                      {selectedReport.status === 'dismissed' && '기각'}
                      {selectedReport.status === 'temporary_ban' && '기간정지'}
                      {selectedReport.status === 'permanent_ban' && '영구정지'}
                    </StatusBadge>
                  </div>
                  {selectedReport.resolved_at && (
                    <div>
                      <strong>처리일시:</strong> {formatDate(selectedReport.resolved_at)}
                    </div>
                  )}
                  <div>
                    <strong>누적 신고횟수:</strong> {selectedReport.reported_user?.report_count || 0}회
                  </div>
                </div>
              </ProfileSection>

              {selectedReport.report_details && (
                <DetailSection>
                  <strong>신고 상세 내용:</strong>
                  <div>
                    {selectedReport.report_details}
                  </div>
                </DetailSection>
              )}

              {selectedReport.admin_notes && (
                <div style={{ padding: '1rem', background: '#e0ecff', borderRadius: '8px', border: '1px solid #b3d4ff' }}>
                  <strong>관리자 메모:</strong>
                  <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem' }}>
                    {selectedReport.admin_notes}
                  </div>
                </div>
              )}

              <ButtonGroup>
                <Button type="button" onClick={() => setDetailModal(false)}>
                  닫기
                </Button>
                <Button 
                  type="button" 
                  $variant="primary"
                  onClick={() => {
                    setDetailModal(false);
                    handleProcessReport(selectedReport);
                  }}
                >
                  {selectedReport.status === 'pending' ? '처리하기' : '처리변경'}
                </Button>
              </ButtonGroup>
            </div>
          )}
        </ModalContent>
      </ModalOverlay>

      {/* 신고 처리 모달 */}
      <ModalOverlay $isOpen={processModal} onClick={handleCloseModal}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            {selectedReport?.status === 'pending' ? '신고 처리' : '처리 내용 변경'}
          </ModalTitle>
          
          {selectedReport && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <strong>신고자:</strong> {selectedReport.reporter?.nickname}<br />
              <strong>신고대상:</strong> {selectedReport.reported_user?.nickname}<br />
              <strong>신고유형:</strong> {selectedReport.report_type}<br />
              <strong>신고횟수:</strong> {selectedReport.reported_user?.report_count || 0}회<br />
              {selectedReport.report_details && (
                <>
                  <strong>상세내용:</strong><br />
                  {selectedReport.report_details}
                </>
              )}
            </div>
          )}

          <Form onSubmit={handleProcessSubmit}>
            <FormGroup>
              <Label>처리 상태 *</Label>
              <FilterSelect
                value={processForm.status}
                onChange={(e) => setProcessForm({ ...processForm, status: e.target.value })}
                required
              >
                <option value="">상태를 선택하세요</option>
                <option value="dismissed">기각</option>
                <option value="temporary_ban">기간정지</option>
                <option value="permanent_ban">영구정지</option>
              </FilterSelect>
            </FormGroup>

            {processForm.status === 'temporary_ban' && (
              <FormGroup>
                <Label>정지 기간 (일)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={processForm.ban_duration_days}
                  onChange={(e) => setProcessForm({ ...processForm, ban_duration_days: parseInt(e.target.value) || 30 })}
                  placeholder="정지 기간을 입력하세요 (1-365일)"
                />
              </FormGroup>
            )}

            <FormGroup>
              <Label>관리자 메모</Label>
              <TextArea
                value={processForm.admin_notes}
                onChange={(e) => setProcessForm({ ...processForm, admin_notes: e.target.value })}
                placeholder="처리 내용을 기록하세요..."
              />
            </FormGroup>

            <ButtonGroup>
              <Button type="button" onClick={handleCloseModal}>
                취소
              </Button>
              <Button type="submit" $variant="primary">
                처리 완료
              </Button>
            </ButtonGroup>
          </Form>
        </ModalContent>
      </ModalOverlay>

      {/* 사용자 프로필 조회 모달 */}
      <ModalOverlay $isOpen={profileModal} onClick={handleCloseProfileModal}>
        <ModalContent 
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '800px', maxHeight: '90vh' }}
        >
          <ModalTitle>사용자 프로필</ModalTitle>
          
          {loadingProfile ? (
            <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
              <InlineSpinner text="프로필을 불러오는 중입니다..." />
            </div>
          ) : userProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 계정 정보 */}
              <ProfileSection>
                <h3>계정 정보</h3>
                <ProfileInfoGrid>
                  <div><strong>이메일:</strong> {userProfile.email}</div>
                  <div><strong>닉네임:</strong> {userProfile.nickname}</div>
                  <div><strong>이메일 인증:</strong> {userProfile.is_verified ? '✅ 완료' : '❌ 미완료'}</div>
                  <div><strong>계정 상태:</strong> {userProfile.is_active ? '✅ 활성' : '❌ 비활성'}</div>
                  <div><strong>신고 횟수:</strong> {userProfile.report_count || 0}회</div>
                  <div>
                    <strong>정지 상태:</strong>{' '}
                    {userProfile.is_banned ? (
                      <span style={{ color: '#DC2626' }}>
                        🚫 정지중 {userProfile.banned_until && `(~${formatDate(userProfile.banned_until)})`}
                      </span>
                    ) : (
                      '정상'
                    )}
                  </div>
                </ProfileInfoGrid>
              </ProfileSection>

              {/* 프로필 정보 */}
              <ProfileSection>
                <h3>프로필 정보</h3>
                <ProfileInfoGrid>
                  <div><strong>성별:</strong> {userProfile.gender === 'male' ? '남성' : userProfile.gender === 'female' ? '여성' : '기타'}</div>
                  <div><strong>생년:</strong> {userProfile.birth_year != null && userProfile.birth_year !== '' ? `${userProfile.birth_year}년` : '-'}</div>
                  <div><strong>키:</strong> {userProfile.height}cm</div>
                  <div><strong>체형:</strong> {Array.isArray(userProfile.body_type) ? userProfile.body_type.join(', ') : (userProfile.body_type ? JSON.parse(userProfile.body_type).join(', ') : '-')}</div>
                  <div><strong>MBTI:</strong> {userProfile.mbti || '-'}</div>
                  <div><strong>거주지:</strong> {userProfile.residence || '-'}</div>
                  <div><strong>소속:</strong> {userProfile.company || '-'}</div>
                  <div><strong>학력:</strong> {userProfile.education || '-'}</div>
                  <div><strong>결혼상태:</strong> {userProfile.marital_status || '-'}</div>
                  <div><strong>종교:</strong> {userProfile.religion || '-'}</div>
                  <div><strong>흡연:</strong> {userProfile.smoking || '-'}</div>
                  <div><strong>음주:</strong> {userProfile.drinking || '-'}</div>
                </ProfileInfoGrid>
              </ProfileSection>

              {/* 관심사/외모/성격 */}
              <ProfileSection>
                <h3>추가 정보</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>
                    <strong>관심사:</strong>{' '}
                    {Array.isArray(userProfile.interests) 
                      ? userProfile.interests.join(', ') 
                      : (userProfile.interests ? JSON.parse(userProfile.interests).join(', ') : '-')
                    }
                  </div>
                  <div>
                    <strong>외모:</strong>{' '}
                    {Array.isArray(userProfile.appearance) 
                      ? userProfile.appearance.join(', ') 
                      : (userProfile.appearance ? JSON.parse(userProfile.appearance).join(', ') : '-')
                    }
                  </div>
                  <div>
                    <strong>성격:</strong>{' '}
                    {Array.isArray(userProfile.personality) 
                      ? userProfile.personality.join(', ') 
                      : (userProfile.personality ? JSON.parse(userProfile.personality).join(', ') : '-')
                    }
                  </div>
                </div>
              </ProfileSection>

              {/* 자기소개 */}
              {userProfile.appeal && (
                <DetailSection>
                  <strong>자기소개:</strong>
                  <div>
                    {userProfile.appeal}
                  </div>
                </DetailSection>
              )}

              <ButtonGroup>
                <Button type="button" onClick={handleCloseProfileModal}>
                  닫기
                </Button>
              </ButtonGroup>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              프로필 정보를 불러올 수 없습니다.
            </div>
          )}
        </ModalContent>
      </ModalOverlay>
    </Container>
  );
};

export default ReportManagementPage; 