import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { faqApi } from '../../services/api.ts';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaQuestionCircle, 
  FaCalendar,
  FaTimes,
  FaSave,
  FaSort
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
    padding-top: calc(var(--mobile-top-padding, 80px) + var(--safe-area-inset-top));
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

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AddButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  white-space: nowrap;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
`;

const FaqList = styled.div`
  padding: 2rem;
`;

const FaqItem = styled.div`
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }
`;

const FaqHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
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
`;

const FaqMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  color: #718096;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CategoryBadge = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
`;

const FaqAnswer = styled.p`
  color: #4a5568;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
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
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const Modal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f7fafc;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f7fafc;
    color: #4a5568;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #2d3748;
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  min-height: 120px;
  resize: vertical;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #f7fafc;
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
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FaqFormData {
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

const FaqManagerPage: React.FC<{ sidebarOpen?: boolean }> = ({ sidebarOpen = true }) => {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState<FaqFormData>({
    question: '',
    answer: '',
    display_order: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();



  useEffect(() => {
    loadFaqs();
  }, []);

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

  const handleAdd = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      display_order: 0,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      display_order: faq.display_order,
      is_active: faq.is_active
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('정말로 이 FAQ를 삭제하시겠습니까?')) {
      try {
        await faqApi.deleteFaq(id);
        toast.success('FAQ가 삭제되었습니다.');
        loadFaqs();
      } catch (error) {
        console.error('FAQ 삭제 오류:', error);
        toast.error('FAQ 삭제에 실패했습니다.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('질문과 답변을 입력해주세요.');
      return;
    }

    try {
      if (editingFaq) {
        await faqApi.updateFaq(editingFaq.id, formData);
        toast.success('FAQ가 수정되었습니다.');
      } else {
        await faqApi.createFaq(formData);
        toast.success('FAQ가 생성되었습니다.');
      }
      
      setIsModalOpen(false);
      loadFaqs();
    } catch (error) {
      console.error('FAQ 저장 오류:', error);
      toast.error('FAQ 저장에 실패했습니다.');
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingFaq(null);
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
          <LoadingSpinner>FAQ를 불러오는 중...</LoadingSpinner>
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
            FAQ 관리
          </Title>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <AddButton onClick={handleAdd}>
              <FaPlus />
              
            </AddButton>
            <CloseButton onClick={() => navigate('/main')}>
              <FaTimes />
            </CloseButton>
          </div>
        </Header>
        
        <FaqList>
          {faqs.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <FaQuestionCircle />
              </EmptyIcon>
              <h3>등록된 FAQ가 없습니다</h3>
              <p>새로운 FAQ를 등록해보세요.</p>
            </EmptyState>
          ) : (
            faqs.map((faq) => (
              <FaqItem key={faq.id}>
                <FaqHeader>
                  <FaqQuestion>
                    <FaQuestionCircle />
                    {faq.question}
                  </FaqQuestion>
                </FaqHeader>
                

                

                
                <ActionButtons>
                  <ActionButton variant="secondary" onClick={() => handleEdit(faq)}>
                    <FaEdit />
                    수정
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => handleDelete(faq.id)}>
                    <FaTrash />
                    삭제
                  </ActionButton>
                </ActionButtons>
              </FaqItem>
            ))
          )}
        </FaqList>
      </ContentWrapper>

      <Modal $isOpen={isModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {editingFaq ? 'FAQ 수정' : '새 FAQ 등록'}
            </ModalTitle>
            <CloseButton onClick={handleClose}>
              <FaTimes />
            </CloseButton>
          </ModalHeader>
          
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>질문 *</Label>
              <Input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="FAQ 질문을 입력하세요"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label>답변 *</Label>
              <TextArea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="FAQ 답변을 입력하세요"
                required
              />
            </FormGroup>
            

            
            <FormGroup>
              <Label>표시 순서</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min="0"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ marginRight: '0.5rem' }}
                />
                활성 상태
              </Label>
            </FormGroup>
            
            <ModalActions>
              <ActionButton type="button" variant="secondary" onClick={handleClose}>
                <FaTimes />
                취소
              </ActionButton>
              <ActionButton type="submit" variant="primary">
                <FaSave />
                {editingFaq ? '수정' : '등록'}
              </ActionButton>
            </ModalActions>
          </Form>
        </ModalContent>
      </Modal>
    </MainContainer>
  );
};

export default FaqManagerPage; 