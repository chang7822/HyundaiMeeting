import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { adminReportApi } from '../../services/api.ts';
import LoadingSpinner from '../../components/LoadingSpinner.tsx';

interface ReportManagementPageProps {
  sidebarOpen: boolean;
}

const Container = styled.div<{ $sidebarOpen: boolean }>`
  min-height: 100vh;
  padding: 2rem;
  background: #f8f9fa;
  margin-left: ${props => props.$sidebarOpen ? '250px' : '0'};
  transition: margin-left 0.3s ease;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
  }
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 700;
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
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
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
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  
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
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 0.5rem;
  
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
`;

const ModalTitle = styled.h2`
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
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

  if (loading) {
    return <LoadingSpinner sidebarOpen={sidebarOpen} />;
  }

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Title>신고 관리</Title>
      
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
                <td>{report.id}</td>
                <td>{report.reporter?.nickname || '알 수 없음'}</td>
                <td>{report.reported_user?.nickname || '알 수 없음'}</td>
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
        
        {reports.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            신고 내역이 없습니다.
          </div>
        )}
      </TableWrapper>

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
    </Container>
  );
};

export default ReportManagementPage; 