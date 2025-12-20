import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-toastify';
import { FaTimes } from 'react-icons/fa';
import { matchingHistoryApi } from '../services/api.ts';
import ReportModal from '../components/ReportModal.tsx';
import ReportDetailModal from '../components/ReportDetailModal.tsx';
import InlineSpinner from '../components/InlineSpinner.tsx';

interface MatchingHistoryPageProps {
  sidebarOpen: boolean;
}

const Container = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => props.$sidebarOpen ? '280px' : '0'};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: 80px;
  }
`;

const Content = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #ffffff;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
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

const HistoryCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem 1rem 1.1rem;
    gap: 0.75rem;
  }
`;

const skeletonAnimation = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const SkeletonCard = styled.div`
  height: 150px;
  border-radius: 15px;
  margin-bottom: 1.5rem;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
  background-size: 400% 100%;
  animation: ${skeletonAnimation} 1.4s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  width: 100%;
  justify-content: space-between;
`;

const PartnerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PartnerAvatar = styled.div<{ $gender: string }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => props.$gender === 'male' ? '#3B82F6' : '#EC4899'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.2rem;
`;

const PartnerDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const PartnerName = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const PartnerGender = styled.span`
  font-size: 0.9rem;
  color: #6b7280;
`;

const HistoryContent = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1;
  
  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    width: 100%;
    flex-wrap: wrap;
    justify-content: space-between;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 0.35rem;
  }
`;

const InfoLabel = styled.span`
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-size: 1rem;
  color: #333;
  font-weight: 600;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
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

const ActionSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MobileActionSection = styled(ActionSection)`
  @media (min-width: 769px) {
    display: none;
  }
`;

const DesktopActionSection = styled(ActionSection)`
  margin-left: auto;
  @media (max-width: 768px) {
    display: none;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #374151;
`;

const EmptyDescription = styled.p`
  font-size: 1rem;
  color: #6b7280;
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

const MatchingHistoryPage: React.FC<MatchingHistoryPageProps> = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    reportedUser: { id: string; nickname: string } | null;
    periodId: number | null;
  }>({
    isOpen: false,
    reportedUser: null,
    periodId: null
  });

  const [reportDetailModal, setReportDetailModal] = useState<{
    isOpen: boolean;
    reportInfo: any;
    partnerNickname: string;
  }>({
    isOpen: false,
    reportInfo: null,
    partnerNickname: ''
  });

  useEffect(() => {
    loadMatchingHistory();
  }, []);

  const loadMatchingHistory = async () => {
    try {
      setLoading(true);
      const response = await matchingHistoryApi.getMyHistory();
              setHistory(response.data || []);
    } catch (error) {
      console.error('매칭 이력 로드 오류:', error);
      alert('매칭 이력을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = (reportedUser: { id: string; nickname: string; email?: string }, periodId: number) => {
    if (!periodId || periodId <= 0) {
      toast.error('매칭 회차 정보가 올바르지 않습니다.');
      return;
    }
    setReportModal({
      isOpen: true,
      reportedUser,
      periodId
    });
  };

  const handleReportSuccess = () => {
    // 신고 성공 시 필요한 경우 이력 새로고침
    loadMatchingHistory();
  };

  const handleCloseReportModal = () => {
    setReportModal({
      isOpen: false,
      reportedUser: null,
      periodId: null
    });
  };

  const handleViewReportDetail = (reportInfo: any, partnerNickname: string) => {
    setReportDetailModal({
      isOpen: true,
      reportInfo,
      partnerNickname
    });
  };

  const handleCloseReportDetailModal = () => {
    setReportDetailModal({
      isOpen: false,
      reportInfo: null,
      partnerNickname: ''
    });
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Header>
          <Title>내 매칭 이력</Title>
          <CloseButton onClick={() => navigate('/main')}>
            <FaTimes />
          </CloseButton>
        </Header>
        
        {loading ? (
          <>
            {[1, 2, 3].map(key => (
              <SkeletonCard key={key}>
                <InlineSpinner text="매칭 이력을 불러오는 중입니다..." />
              </SkeletonCard>
            ))}
          </>
        ) : history.length === 0 ? (
          <EmptyState>
            <EmptyIcon>📝</EmptyIcon>
            <EmptyTitle>매칭 이력이 없습니다</EmptyTitle>
            <EmptyDescription>
              아직 매칭에 참여한 적이 없습니다.<br />
              매칭에 참여하면 여기에 이력이 표시됩니다.
            </EmptyDescription>
          </EmptyState>
        ) : (
          history.map((match) => (
            <HistoryCard key={match.id}>
              {/** 공통 신고 버튼 JSX를 한 번 정의해서 모바일/PC에서 재사용 */}
              {match.matched && (
                (() => {
                  const buttons = (
                    <>
                      {match.can_report ? (
                        <ActionButton
                          $variant="danger"
                          onClick={() => handleReport(
                            { 
                              id: match.partner_user_id, 
                              nickname: match.partner_nickname,
                              email: match.partner_email 
                            },
                            match.period_id
                          )}
                        >
                          신고하기
                        </ActionButton>
                      ) : match.report_info ? (
                        <ActionButton
                          $variant="secondary"
                          onClick={() => handleViewReportDetail(match.report_info, match.partner_nickname)}
                        >
                          신고완료
                        </ActionButton>
                      ) : null}
                    </>
                  );

                  return (
                    <>
                      <HistoryHeader>
                        <PartnerInfo>
                          <PartnerAvatar $gender={match.partner_gender}>
                            {match.partner_gender === 'male' ? '👨' : '👩'}
                          </PartnerAvatar>
                          <PartnerDetails>
                            <PartnerName>{match.partner_nickname}</PartnerName>
                            <PartnerGender>
                              {match.partner_gender === 'male' ? '남성' : '여성'}
                            </PartnerGender>
                          </PartnerDetails>
                        </PartnerInfo>
                        <MobileActionSection>
                          {buttons}
                        </MobileActionSection>
                      </HistoryHeader>

                      <HistoryContent>
                        <InfoItem>
                          <InfoLabel>매칭 날짜</InfoLabel>
                          <InfoValue>{formatDate(match.matched_at)}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                          <InfoLabel>회차</InfoLabel>
                          <InfoValue>{match.round_number}회차</InfoValue>
                        </InfoItem>
                      </HistoryContent>

                      <DesktopActionSection>
                        {buttons}
                      </DesktopActionSection>
                    </>
                  );
                })()
              )}

              {!match.matched && (
                <>
              <HistoryHeader>
                <PartnerInfo>
                  <PartnerAvatar $gender={match.partner_gender}>
                    {match.partner_gender === 'male' ? '👨' : '👩'}
                  </PartnerAvatar>
                  <PartnerDetails>
                    <PartnerName>{match.partner_nickname}</PartnerName>
                    <PartnerGender>
                      {match.partner_gender === 'male' ? '남성' : '여성'}
                    </PartnerGender>
                  </PartnerDetails>
                </PartnerInfo>
              </HistoryHeader>
              
              <HistoryContent>
                <InfoItem>
                  <InfoLabel>매칭 날짜</InfoLabel>
                  <InfoValue>{formatDate(match.matched_at)}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>회차</InfoLabel>
                  <InfoValue>{match.round_number}회차</InfoValue>
                </InfoItem>
              </HistoryContent>
                </>
              )}
            </HistoryCard>
          ))
        )}

        <ReportModal
          isOpen={reportModal.isOpen}
          onClose={handleCloseReportModal}
          reportedUser={reportModal.reportedUser!}
          periodId={reportModal.periodId!}
          onSuccess={handleReportSuccess}
        />

        <ReportDetailModal
          isOpen={reportDetailModal.isOpen}
          onClose={handleCloseReportDetailModal}
          reportInfo={reportDetailModal.reportInfo}
          partnerNickname={reportDetailModal.partnerNickname}
        />
      </Content>
    </Container>
  );
};

export default MatchingHistoryPage; 