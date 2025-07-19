import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { noticeApi } from '../services/api.ts';
import { 
  FaArrowLeft, 
  FaBullhorn, 
  FaCalendar, 
  FaEye, 
  FaUser, 
  FaStar,
  FaChevronRight,
  FaTimes,
  FaEdit,
  FaTrash,
  FaPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const MainContainer = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: 80px;
  }
`;

const ContentWrapper = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-height: calc(100vh - 4rem);
  width: 100%;
  max-width: 95vw;
  margin: 0 auto;
  @media (min-width: 600px) {
    max-width: 600px;
  }
  @media (min-width: 900px) {
    max-width: 800px;
  }
  @media (min-width: 1200px) {
    max-width: 1000px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const NoticeList = styled.div`
  padding: 2rem;
`;

const NoticeItem = styled.div`
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    margin: 0 0.5rem 1rem 0.5rem;
  }
`;

const NoticeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
`;

const NoticeTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  flex: 1;
  line-height: 1.4;
`;

const ImportantBadge = styled.span`
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  flex-shrink: 0;
`;

const NoticeMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  color: #718096;
  font-size: 0.875rem;
  
  @media (max-width: 768px) {
    gap: 1rem;
    flex-wrap: nowrap;
    overflow: hidden;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
`;

const NoticeContent = styled.p`
  color: #4a5568;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  @media (max-width: 768px) {
    -webkit-line-clamp: 3;
    word-break: break-word;
  }
`;

const DetailContainer = styled.div`
  padding: 2rem;
  background: white;
  min-height: calc(100vh - 4rem);
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #f7fafc;
  gap: 1rem;
`;

const DetailTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const DetailMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  color: #718096;
  font-size: 0.875rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const DetailContent = styled.div`
  color: #4a5568;
  line-height: 1.8;
  font-size: 1rem;
  background: #f7fafc;
  padding: 2rem;
  border-radius: 12px;
  border-left: 4px solid #667eea;
  white-space: pre-wrap;
`;

const DetailBackButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  flex-shrink: 0;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${props => {
    switch (props.variant) {
      case 'primary': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'secondary': return '#e2e8f0';
      case 'danger': return 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
      default: return '#e2e8f0';
    }
  }};
  color: ${props => props.variant === 'secondary' ? '#4a5568' : 'white'};
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #718096;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  color: #cbd5e0;
  margin-bottom: 1rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: #667eea;
  font-size: 1.2rem;
`;

interface Notice {
  id: number;
  title: string;
  content: string;
  author: string;
  is_important: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const NoticePage: React.FC<{ sidebarOpen?: boolean }> = ({ sidebarOpen = true }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      loadNoticeDetail(parseInt(id));
    } else {
      loadNotices();
    }
  }, [id]);

  const loadNotices = async () => {
    try {
      setLoading(true);
      const data = await noticeApi.getNotices();
      setNotices(data);
    } catch (error) {
      console.error('공지사항 로딩 오류:', error);
      toast.error('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadNoticeDetail = async (noticeId: number) => {
    try {
      setLoading(true);
      const data = await noticeApi.getNotice(noticeId);
      setSelectedNotice(data);
    } catch (error) {
      console.error('공지사항 상세 로딩 오류:', error);
      toast.error('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
    navigate(`/notice/${notice.id}`);
  };

  const handleBack = () => {
    setSelectedNotice(null);
    navigate('/notice');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <MainContainer $sidebarOpen={sidebarOpen}>
        <ContentWrapper>
          <LoadingSpinner>공지사항을 불러오는 중...</LoadingSpinner>
        </ContentWrapper>
      </MainContainer>
    );
  }

  if (selectedNotice) {
    return (
      <MainContainer $sidebarOpen={sidebarOpen}>
        <ContentWrapper>
          <DetailContainer>
            <DetailHeader>
              <div>
                <DetailTitle>
                  {selectedNotice.is_important && (
                    <ImportantBadge>
                      <FaStar />
                      중요
                    </ImportantBadge>
                  )}
                  {selectedNotice.title}
                </DetailTitle>
              </div>
              <DetailBackButton onClick={handleBack}>
                <FaArrowLeft />
              </DetailBackButton>
            </DetailHeader>
            
            <DetailMeta>
              <MetaItem>
                <FaCalendar />
                {formatDate(selectedNotice.created_at)}
              </MetaItem>
              <MetaItem>
                <FaEye />
                조회수 {selectedNotice.view_count}
              </MetaItem>
            </DetailMeta>
            
            <DetailContent>
              {selectedNotice.content}
            </DetailContent>
          </DetailContainer>
        </ContentWrapper>
      </MainContainer>
    );
  }

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <ContentWrapper>
        <Header>
          <Title>
            <FaBullhorn />
            공지사항
          </Title>
          <CloseButton onClick={() => navigate('/main')}>
            <FaTimes />
          </CloseButton>
        </Header>
        
        <NoticeList>
          {notices.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <FaBullhorn />
              </EmptyIcon>
              <h3>등록된 공지사항이 없습니다</h3>
              <p>새로운 공지사항을 기다려주세요.</p>
            </EmptyState>
          ) : (
            notices.map((notice) => (
              <NoticeItem key={notice.id} onClick={() => handleNoticeClick(notice)}>
                <NoticeHeader>
                  <NoticeTitle>{notice.title}</NoticeTitle>
                  {notice.is_important && (
                    <ImportantBadge>
                      <FaStar />
                      중요
                    </ImportantBadge>
                  )}
                </NoticeHeader>
                
                <NoticeMeta>
                  <MetaItem>
                    <FaCalendar />
                    {formatDate(notice.created_at)}
                  </MetaItem>
                  <MetaItem>
                    <FaEye />
                    {notice.view_count}
                  </MetaItem>
                </NoticeMeta>
                

              </NoticeItem>
            ))
          )}
        </NoticeList>
              </ContentWrapper>
    </MainContainer>
  );
};

export default NoticePage; 