import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { noticeApi } from '../../services/api.ts';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaStar, 
  FaCalendar, 
  FaUser,
  FaTimes,
  FaSave,
  FaBullhorn,
  FaExclamationTriangle
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

const NoticeList = styled.div`
  padding: 2rem;
`;

const NoticeItem = styled.div`
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
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
`;

const NoticeMeta = styled.div`
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

const NoticeContent = styled.p`
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

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Checkbox = styled.input`
  width: 1.2rem;
  height: 1.2rem;
  accent-color: #667eea;
`;

const CheckboxLabel = styled.label`
  font-weight: 500;
  color: #4a5568;
  cursor: pointer;
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

interface NoticeFormData {
  title: string;
  content: string;
  author: string;
  is_important: boolean;
}

const NoticeManagerPage: React.FC<{ sidebarOpen?: boolean }> = ({ sidebarOpen = true }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState<NoticeFormData>({
    title: '',
    content: '',
    author: '관리자',
    is_important: false
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotices();
  }, []);

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

  const handleAdd = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      content: '',
      author: '관리자',
      is_important: false
    });
    setIsModalOpen(true);
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      author: notice.author,
      is_important: notice.is_important
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      try {
        await noticeApi.deleteNotice(id);
        toast.success('공지사항이 삭제되었습니다.');
        loadNotices();
      } catch (error) {
        console.error('공지사항 삭제 오류:', error);
        toast.error('공지사항 삭제에 실패했습니다.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      if (editingNotice) {
        await noticeApi.updateNotice(editingNotice.id, formData);
        toast.success('공지사항이 수정되었습니다.');
      } else {
        await noticeApi.createNotice(formData);
        toast.success('공지사항이 생성되었습니다.');
      }
      
      setIsModalOpen(false);
      loadNotices();
    } catch (error) {
      console.error('공지사항 저장 오류:', error);
      toast.error('공지사항 저장에 실패했습니다.');
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
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

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <ContentWrapper>
        <Header>
          <Title>
            <FaBullhorn />
            공지사항 관리
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
        
        <NoticeList>
          {notices.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <FaBullhorn />
              </EmptyIcon>
              <h3>등록된 공지사항이 없습니다</h3>
              <p>새로운 공지사항을 등록해보세요.</p>
            </EmptyState>
          ) : (
            notices.map((notice) => (
              <NoticeItem key={notice.id}>
                <NoticeHeader>
                  <NoticeTitle>{notice.title}</NoticeTitle>
                  {notice.is_important && (
                    <ImportantBadge>
                      <FaStar />
                      중요
                    </ImportantBadge>
                  )}
                </NoticeHeader>
                

                

                
                <ActionButtons>
                  <ActionButton variant="secondary" onClick={() => handleEdit(notice)}>
                    <FaEdit />
                    수정
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => handleDelete(notice.id)}>
                    <FaTrash />
                    삭제
                  </ActionButton>
                </ActionButtons>
              </NoticeItem>
            ))
          )}
        </NoticeList>
      </ContentWrapper>

      <Modal $isOpen={isModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {editingNotice ? '공지사항 수정' : '새 공지사항 등록'}
            </ModalTitle>
            <CloseButton onClick={handleClose}>
              <FaTimes />
            </CloseButton>
          </ModalHeader>
          
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>제목 *</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="공지사항 제목을 입력하세요"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label>내용 *</Label>
              <TextArea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="공지사항 내용을 입력하세요"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label>작성자</Label>
              <Input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="작성자명"
              />
            </FormGroup>
            
            <CheckboxGroup>
              <Checkbox
                type="checkbox"
                id="is_important"
                checked={formData.is_important}
                onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
              />
              <CheckboxLabel htmlFor="is_important">
                <FaExclamationTriangle style={{ marginRight: '0.5rem', color: '#ff6b6b' }} />
                중요 공지사항으로 설정
              </CheckboxLabel>
            </CheckboxGroup>
            
            <ModalActions>
              <ActionButton type="button" variant="secondary" onClick={handleClose}>
                <FaTimes />
                취소
              </ActionButton>
              <ActionButton type="submit" variant="primary">
                <FaSave />
                {editingNotice ? '수정' : '등록'}
              </ActionButton>
            </ModalActions>
          </Form>
        </ModalContent>
      </Modal>
    </MainContainer>
  );
};

export default NoticeManagerPage; 