import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMySupportInquiries } from '../services/api.ts';

// ===================================
// 스타일드 컴포넌트
// ===================================

const Container = styled.div<{ sidebarOpen?: boolean }>`
  flex: 1;
  margin-left: ${props => props.sidebarOpen ? '280px' : '0'};
  padding: 2rem;
  min-height: 100vh;
  background: #f8f9fa;
  transition: margin-left 0.3s;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
  }
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

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
`;

const NewInquiryButton = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #5a67d8;
    transform: translateY(-1px);
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
  max-width: 1000px;
  margin: 0 auto 24px auto;
  
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

const InquiryList = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 1000px;
  margin: 0 auto;
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
  gap: 12px;
  align-items: center;
  
  @media (max-width: 768px) {
    justify-content: space-between;
    width: 100%;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return `
          background: #fef3cd;
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
          background: #e5e7eb;
          color: #6b7280;
        `;
    }
  }}
`;

const CategoryBadge = styled.span`
  padding: 4px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const InquiryDate = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const InquiryContent = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 8px 0 0 0;
  line-height: 1.5;
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

const EmptyMessage = styled.p`
  font-size: 18px;
  margin-bottom: 8px;
`;

const EmptySubMessage = styled.p`
  font-size: 14px;
  color: #9ca3af;
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
  margin-top: 24px;
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
    background: ${props => props.active ? '#5a67d8' : '#f8fafc'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ===================================
// 인터페이스
// ===================================

interface MySupportInquiriesPageProps {
  sidebarOpen?: boolean;
}

interface SupportInquiry {
  id: number;
  title: string;
  content: string;
  category: string;
  status: 'pending' | 'completed' | 'closed';
  created_at: string;
  updated_at: string;
}

// ===================================
// 컴포넌트
// ===================================

const MySupportInquiriesPage: React.FC<MySupportInquiriesPageProps> = ({ sidebarOpen = true }) => {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await getMySupportInquiries({
        page: currentPage,
        limit: 10,
        status: statusFilter === 'all' ? undefined : statusFilter
      });

      setInquiries(response.data || []);
      setTotalPages(Math.ceil((response.pagination?.total || 0) / 10));
    } catch (error: any) {
      console.error('문의 목록 조회 오류:', error);
      toast.error('문의 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, [currentPage, statusFilter]);

  const handleNewInquiry = () => {
    navigate('/support/inquiry');
  };

  const handleInquiryClick = (inquiry: SupportInquiry) => {
    navigate(`/support/inquiry/${inquiry.id}`);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '답변 대기';
      case 'completed': return '답변 완료';
      case 'closed': return '종료';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Container sidebarOpen={sidebarOpen}>
      <Header>
        <Title>내 문의내역</Title>
        <NewInquiryButton onClick={handleNewInquiry}>
          새 문의하기
        </NewInquiryButton>
      </Header>

      <FilterBar>
        <span>상태:</span>
        <FilterSelect 
          value={statusFilter} 
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">전체</option>
          <option value="pending">답변 대기</option>
          <option value="completed">답변 완료</option>
          <option value="closed">종료</option>
        </FilterSelect>
      </FilterBar>

      <InquiryList>
        {loading ? (
          <LoadingSpinner />
        ) : inquiries.length === 0 ? (
          <EmptyState>
            <EmptyIcon>📝</EmptyIcon>
            <EmptyMessage>등록된 문의가 없습니다</EmptyMessage>
            <EmptySubMessage>궁금한 점이 있으시면 언제든지 문의해주세요</EmptySubMessage>
          </EmptyState>
        ) : (
          inquiries.map((inquiry) => (
            <InquiryItem 
              key={inquiry.id} 
              onClick={() => handleInquiryClick(inquiry)}
            >
              <InquiryHeader>
                <InquiryTitle>{inquiry.title}</InquiryTitle>
                <InquiryMeta>
                  <CategoryBadge>{inquiry.category}</CategoryBadge>
                  <StatusBadge status={inquiry.status}>
                    {getStatusText(inquiry.status)}
                  </StatusBadge>
                  <InquiryDate>{formatDate(inquiry.created_at)}</InquiryDate>
                </InquiryMeta>
              </InquiryHeader>
              <InquiryContent>{inquiry.content}</InquiryContent>
            </InquiryItem>
          ))
        )}
      </InquiryList>

      {totalPages > 1 && (
        <Pagination>
          <PageButton 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            이전
          </PageButton>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <PageButton
              key={page}
              active={page === currentPage}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </PageButton>
          ))}
          
          <PageButton 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            다음
          </PageButton>
        </Pagination>
      )}
    </Container>
  );
};

export default MySupportInquiriesPage;
