import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSyncAlt } from 'react-icons/fa';
import { getAdminSupportInquiries } from '../../services/api';

// ===================================
// 스타일드 컴포넌트
// ===================================

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
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  
  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
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

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const StatCard = styled.div`
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex: 1;
  min-width: 120px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
`;

const InquiryList = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const InquiryItem = styled.div`
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f8fafc;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const InquiryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const InquiryTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
`;

const InquiryMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const CategoryBadge = styled.span`
  padding: 4px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'pending':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'completed':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'closed':
        return `
          background: #f3f4f6;
          color: #374151;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

const UserInfo = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const InquiryDate = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const InquiryPreview = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-top: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
`;

const EmptyDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  &::after {
    content: '';
    width: 24px;
    height: 24px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: white;
  border-top: 1px solid #f1f5f9;
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: ${props => props.active ? '#667eea' : 'white'};
  color: ${props => props.active ? 'white' : '#374151'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover:not(:disabled) {
    background: ${props => props.active ? '#5a67d8' : '#f9fafb'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ===================================
// 인터페이스
// ===================================

interface AdminSupportPageProps {
  sidebarOpen?: boolean;
}

interface SupportInquiry {
  id: number;
  title: string;
  content: string;
  category: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
  };
}

// ===================================
// 메인 컴포넌트
// ===================================

const AdminSupportPage: React.FC<AdminSupportPageProps> = ({ sidebarOpen = true }) => {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0
  });

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await getAdminSupportInquiries({
        page: currentPage,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter
      });

      setInquiries(response.data || []);
      
      // 페이지네이션 정보 설정
      if (response.pagination) {
        setTotalPages(Math.ceil(response.pagination.total / response.pagination.limit));
      }

      // 통계 계산
      const total = response.data?.length || 0;
      const pending = response.data?.filter((i: SupportInquiry) => i.status === 'pending').length || 0;
      const completed = response.data?.filter((i: SupportInquiry) => i.status === 'completed').length || 0;
      
      setStats({ total, pending, completed });

    } catch (error: any) {
      console.error('문의 목록 조회 오류:', error);
      toast.error('문의 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, [currentPage, statusFilter, categoryFilter]);

  const handleInquiryClick = (inquiry: SupportInquiry) => {
    navigate(`/admin/support/${inquiry.id}`);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '답변 대기';
      case 'completed': return '답변 완료';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <Header>
              <TitleRow>
                <Title>🎧 고객센터 관리</Title>
                <RefreshButton onClick={() => window.location.reload()}>
                  <FaSyncAlt />
                  새로고침
                </RefreshButton>
              </TitleRow>
            </Header>

            <StatsBar>
              <StatCard>
                <StatLabel>전체 문의</StatLabel>
                <StatValue>{stats.total}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>답변 대기</StatLabel>
                <StatValue>{stats.pending}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>답변 완료</StatLabel>
                <StatValue>{stats.completed}</StatValue>
              </StatCard>

            </StatsBar>

            <FilterBar>
              <FilterSelect 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">전체 상태</option>
                <option value="pending">답변 대기</option>
                <option value="completed">답변 완료</option>
              </FilterSelect>
              
              <FilterSelect 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">전체 카테고리</option>
                <option value="일반문의">일반문의</option>
                <option value="기술문의">기술문의</option>
                <option value="계정문의">계정문의</option>
                <option value="매칭문의">매칭문의</option>
                <option value="신고문의">신고문의</option>
                <option value="기타">기타</option>
              </FilterSelect>
            </FilterBar>

            <InquiryList>
              {inquiries.length === 0 ? (
                <EmptyState>
                  <EmptyIcon>📝</EmptyIcon>
                  <EmptyTitle>문의가 없습니다</EmptyTitle>
                  <EmptyDescription>
                    아직 등록된 문의가 없습니다.
                  </EmptyDescription>
                </EmptyState>
              ) : (
                <>
                  {inquiries.map((inquiry) => (
                    <InquiryItem key={inquiry.id} onClick={() => handleInquiryClick(inquiry)}>
                      <InquiryHeader>
                        <InquiryTitle>{inquiry.title}</InquiryTitle>
                        <InquiryMeta>
                          <CategoryBadge>{inquiry.category}</CategoryBadge>
                          <StatusBadge $status={inquiry.status}>
                            {getStatusText(inquiry.status)}
                          </StatusBadge>
                          <UserInfo>
                            {inquiry.user?.email || '알 수 없는 사용자'}
                          </UserInfo>
                          <InquiryDate>{formatDate(inquiry.created_at)}</InquiryDate>
                        </InquiryMeta>
                      </InquiryHeader>
                      <InquiryPreview>
                        {truncateContent(inquiry.content)}
                      </InquiryPreview>
                    </InquiryItem>
                  ))}
                  
                  {totalPages > 1 && (
                    <Pagination>
                      <PageButton 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        이전
                      </PageButton>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <PageButton
                            key={page}
                            active={page === currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </PageButton>
                        );
                      })}
                      
                      <PageButton 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        다음
                      </PageButton>
                    </Pagination>
                  )}
                </>
              )}
            </InquiryList>
          </>
        )}
      </Content>
    </Container>
  );
};

export default AdminSupportPage;
