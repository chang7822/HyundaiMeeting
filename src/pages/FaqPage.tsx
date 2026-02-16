import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { faqApi } from '../services/api.ts';
import { 
  FaArrowLeft, 
  FaQuestionCircle, 
  FaCalendar, 
  FaChevronDown,
  FaChevronUp,
  FaTimes
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const MainContainer = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
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
    padding-top: var(--mobile-top-padding, 80px);
  }
`;

const ContentWrapper = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-height: calc(100vh - 4rem);
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;

  @media (max-width: 768px) {
    margin: 0 auto;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.8rem;
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
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`;



const FaqList = styled.div`
  padding: 1.5rem 1.25rem 2rem;
`;

const FaqItem = styled.div<{ $isOpen: boolean }>`
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 16px;
  margin-bottom: 1rem;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }
`;

const FaqHeader = styled.div<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  cursor: pointer;
  background: ${props => props.$isOpen ? '#f7fafc' : 'white'};
  transition: background 0.3s ease;
`;

const FaqQuestion = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  flex: 1;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
  
  svg {
    @media (max-width: 768px) {
      display: none;
    }
  }
`;



const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(102, 126, 234, 0.1);
  }
`;

const FaqContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '500px' : '0'};
  overflow-y: ${props => props.$isOpen ? 'auto' : 'hidden'};
  overflow-x: hidden;
  transition: max-height 0.3s ease;
  background: #f7fafc;
`;

const FaqAnswer = styled.div`
  padding: 1.5rem;
  color: #4a5568;
  line-height: 1.8;
  font-size: 1rem;
  border-top: 1px solid #e2e8f0;
  white-space: pre-wrap;
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
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const DetailMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  color: #718096;
  font-size: 0.875rem;
  margin-bottom: 2rem;
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
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
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



interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const FaqPage: React.FC<{ sidebarOpen?: boolean }> = ({ sidebarOpen = true }) => {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [selectedFaq, setSelectedFaq] = useState<Faq | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      loadFaqDetail(parseInt(id));
    } else {
      loadFaqs();
    }
  }, [id]);

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const data = await faqApi.getFaqs();
      setFaqs(data);
    } catch (error) {
      console.error('FAQ 로딩 오류:', error);
      toast.error('FAQ를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadFaqDetail = async (faqId: number) => {
    try {
      setLoading(true);
      const data = await faqApi.getFaq(faqId);
      setSelectedFaq(data);
    } catch (error) {
      console.error('FAQ 상세 로딩 오류:', error);
      toast.error('FAQ를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };





  const handleBack = () => {
    setSelectedFaq(null);
    navigate('/faq');
  };

  const toggleFaq = (faqId: number) => {
    const newOpenFaqs = new Set(openFaqs);
    if (newOpenFaqs.has(faqId)) {
      newOpenFaqs.delete(faqId);
    } else {
      newOpenFaqs.add(faqId);
    }
    setOpenFaqs(newOpenFaqs);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };



  if (loading) {
    return (
      <MainContainer $sidebarOpen={sidebarOpen}>
        <ContentWrapper>
          <LoadingSpinner>FAQ를 불러오는 중...</LoadingSpinner>
        </ContentWrapper>
      </MainContainer>
    );
  }

  if (selectedFaq) {
    return (
      <MainContainer $sidebarOpen={sidebarOpen}>
        <ContentWrapper>
          <DetailContainer>
            <DetailHeader>
              <DetailTitle>
                <FaQuestionCircle />
                {selectedFaq.question}
              </DetailTitle>
              <DetailBackButton onClick={handleBack}>
                <FaArrowLeft />
              </DetailBackButton>
            </DetailHeader>
            
            <DetailMeta>
              <MetaItem>
                <FaCalendar />
                {formatDate(selectedFaq.created_at)}
              </MetaItem>
            </DetailMeta>
            
            <DetailContent>
              {selectedFaq.answer}
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
            <FaQuestionCircle />
            자주 묻는 질문
          </Title>
          <CloseButton onClick={() => navigate('/main')}>
            <FaTimes />
          </CloseButton>
        </Header>
        
        <FaqList>
          {faqs.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <FaQuestionCircle />
              </EmptyIcon>
              <h3>등록된 FAQ가 없습니다</h3>
              <p>관리자에게 문의하세요.</p>
            </EmptyState>
          ) : (
            faqs.map((faq) => (
              <FaqItem key={faq.id} $isOpen={openFaqs.has(faq.id)}>
                <FaqHeader 
                  onClick={() => toggleFaq(faq.id)}
                  $isOpen={openFaqs.has(faq.id)}
                >
                  <FaqQuestion>
                    <FaQuestionCircle />
                    {faq.question}
                  </FaqQuestion>
                  
                  <ToggleButton>
                    {openFaqs.has(faq.id) ? <FaChevronUp /> : <FaChevronDown />}
                  </ToggleButton>
                </FaqHeader>
                
                <FaqContent $isOpen={openFaqs.has(faq.id)}>
                  <FaqAnswer>
                    {faq.answer}
                  </FaqAnswer>
                </FaqContent>
              </FaqItem>
            ))
          )}
        </FaqList>
      </ContentWrapper>
    </MainContainer>
  );
};

export default FaqPage; 