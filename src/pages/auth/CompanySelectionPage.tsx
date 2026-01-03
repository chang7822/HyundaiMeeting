import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { companyApi } from '../../services/api.ts';
import { Company } from '../../types/index.ts';
import { FaArrowLeft } from 'react-icons/fa';
import CustomCompanyNameModal from '../../components/CustomCompanyNameModal.tsx';
import { toast } from 'react-toastify';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const Card = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Select = styled.select`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  margin-top: 1rem;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  border: 2px solid #667eea;
  color: #667eea;
  font-size: 1.8rem;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s, color 0.2s, border 0.2s;
  &:hover {
    background: #667eea;
    color: #fff;
    border: 2px solid #667eea;
  }
  @media (max-width: 600px) {
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
  }
`;

const InfoBox = styled.div`
  background: #f8f9fa;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.6;
  
  strong {
    color: #333;
    font-weight: 600;
  }
`;

const CompanyFooter = styled.div`
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const TextLinkButton = styled.button`
  border: 1px solid rgba(129, 140, 248, 0.7);
  background: rgba(79, 70, 229, 0.06);
  padding: 6px 12px;
  margin: 0;
  font-size: 0.8rem;
  color: #4f46e5;
  cursor: pointer;
  font-weight: 600;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.18s ease;

  &::before {
    content: '+';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(79, 70, 229, 0.12);
    font-size: 0.85rem;
    font-weight: 700;
  }

  &:hover {
    background: rgba(79, 70, 229, 0.12);
    border-color: rgba(79, 70, 229, 0.9);
    transform: translateY(-1px);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
`;

const ModalContent = styled.div`
  background: #f9fafb;
  border-radius: 18px;
  padding: 22px 22px 18px;
  width: 95vw;
  max-width: 420px;
  max-height: 85vh;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ModalTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModalCloseButton = styled.button`
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 999px;

  &:hover {
    background: rgba(209, 213, 219, 0.5);
    color: #111827;
  }
`;

const ModalBody = styled.div`
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.6;
  overflow-y: auto;
  text-align: left;
`;

const FormField = styled.div`
  margin-bottom: 12px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 1px #4f46e5;
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 1px #4f46e5;
  }
`;

const FormActions = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const SecondaryButton = styled.button`
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const PrimaryActionButton = styled.button`
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 0.85rem;
  font-weight: 600;
  color: #f9fafb;
  cursor: pointer;

  &:hover {
    opacity: 0.95;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const SubSelectionContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 10px;
  border: 2px solid #667eea;
`;

const SubSelectionTitle = styled.h3`
  font-size: 1rem;
  color: #333;
  margin-bottom: 0.75rem;
  font-weight: 600;
`;

const SubSelectionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const SubSelectionButton = styled.button<{ $selected: boolean }>`
  flex: 1;
  min-width: 140px;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid ${props => props.$selected ? '#667eea' : '#e1e5e9'};
  background: ${props => props.$selected ? '#667eea' : 'white'};
  color: ${props => props.$selected ? 'white' : '#333'};
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #667eea;
    background: ${props => props.$selected ? '#667eea' : '#f0f0ff'};
  }
`;

const CompanySelectionPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [showSubSelection, setShowSubSelection] = useState(false);
  const [selectedSubType, setSelectedSubType] = useState<'freelance' | 'other' | null>(null);
  const [showCustomCompanyModal, setShowCustomCompanyModal] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [showCompanyGuideTooltip, setShowCompanyGuideTooltip] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDomain, setNewCompanyDomain] = useState('');
  const [newCompanyMessage, setNewCompanyMessage] = useState('');
  const [isSubmittingCompanyRequest, setIsSubmittingCompanyRequest] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<{ company: string }>();

  const watchedCompany = watch('company');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await companyApi.getCompanies();
        const filtered = (data || []).filter(c => {
          // 9000번 이후 id는 제외
          const companyId = parseInt(String(c.id), 10);
          return !isNaN(companyId) && companyId < 9000;
        });
        const sorted = filtered.slice().sort((a, b) =>
          a.name.localeCompare(b.name, 'ko-KR'),
        );
        setCompanies(sorted);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
    // 복원: sessionStorage에 값이 있으면 setValue
    const savedCompany = sessionStorage.getItem('userCompany');
    if (savedCompany) {
      setValue('company', savedCompany);
      setSelectedCompany(savedCompany);
      // 회사 도메인 없음인 경우
      if (savedCompany === 'no-domain') {
        setShowSubSelection(true);
        const savedSubType = sessionStorage.getItem('userCompanySubType');
        if (savedSubType === 'freelance' || savedSubType === 'other') {
          setSelectedSubType(savedSubType);
        }
      }
    }
  }, [setValue]);

  useEffect(() => {
    if (watchedCompany === 'no-domain') {
      setShowSubSelection(true);
      setSelectedSubType(null);
    } else if (watchedCompany && watchedCompany !== 'no-domain') {
      setShowSubSelection(false);
      setSelectedSubType(null);
    }
    setSelectedCompany(watchedCompany || '');
  }, [watchedCompany]);

  const onSubmit = (data: { company: string }) => {
    if (data.company === 'no-domain') {
      // 회사 도메인 없음 선택 시 서브 타입 확인
      if (!selectedSubType) {
        return;
      }
      // custom_company_name이 이미 입력되어 있으면 바로 진행
      const savedCustomName = sessionStorage.getItem('customCompanyName');
      if (savedCustomName) {
        const companyId = selectedSubType === 'freelance' ? '9999' : '9998';
        sessionStorage.setItem('userCompany', companyId);
        sessionStorage.setItem('userCompanySubType', selectedSubType);
        sessionStorage.setItem('userCompanyType', 'no-domain');
        navigate('/register/email-verification');
      } else {
        // custom_company_name 입력 모달 표시
        setShowCustomCompanyModal(true);
      }
    } else {
      sessionStorage.setItem('userCompany', data.company);
      sessionStorage.removeItem('userCompanySubType');
      sessionStorage.removeItem('userCompanyType');
      sessionStorage.removeItem('customCompanyName');
      navigate('/register/email-verification');
    }
  };

  const handleCustomCompanyConfirm = (companyName: string) => {
    setCustomCompanyName(companyName);
    sessionStorage.setItem('customCompanyName', companyName);
    setShowCustomCompanyModal(false);
    
    // 회사 정보 저장 후 이메일 인증 페이지로 이동
    if (selectedSubType) {
      const companyId = selectedSubType === 'freelance' ? '9999' : '9998';
      sessionStorage.setItem('userCompany', companyId);
      sessionStorage.setItem('userCompanySubType', selectedSubType);
      sessionStorage.setItem('userCompanyType', 'no-domain');
      navigate('/register/email-verification');
    }
  };

  const handleSubmitNewCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = newCompanyName.trim();
    const domain = newCompanyDomain.trim();
    const message = newCompanyMessage.trim();

    if (!name || !domain) {
      toast.error('회사명과 이메일 도메인 주소를 입력해주세요.');
      return;
    }

    setIsSubmittingCompanyRequest(true);
    try {
      await companyApi.requestNewCompany({
        companyName: name,
        emailDomain: domain,
        message,
      });
      toast.success('관리자에게 요청이 전송되었습니다.');
      setShowAddCompanyModal(false);
      setNewCompanyName('');
      setNewCompanyDomain('');
      setNewCompanyMessage('');
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '요청 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      toast.error(msg);
    } finally {
      setIsSubmittingCompanyRequest(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Card>
          <Title>로딩 중...</Title>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>회사 선택</Title>
        <InfoBox>
          <strong>가입 가능 회사 안내</strong><br />
          회사 이메일 도메인이 있는 경우 해당 회사를 선택해주세요.<br /><br/>
          
          회사 도메인이 없는 경우<br/>
          <strong>프리랜서/자영업</strong> 또는 <strong>기타 회사</strong>를 선택하실 수 있습니다.<br/>
          
          <CompanyFooter>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* 회사 추가 가이드 안내 아이콘 (툴팁) */}
              <button
                type="button"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: '#e5e7eb',
                  color: '#4b5563',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="회사 추가 관련 안내"
                aria-label="회사 추가 관련 안내"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCompanyGuideTooltip(true);
                }}
              >
                i
              </button>

              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  lineHeight: 1.4,
                }}
              >
                회사 추가 안내
              </span>
            </div>

            <TextLinkButton
              type="button"
              onClick={() => {
                setShowAddCompanyModal(true);
              }}
            >
              내 회사 추가하기
            </TextLinkButton>
          </CompanyFooter>

        </InfoBox>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Select {...register('company', { required: '회사를 선택해주세요.' })}>
            <option value="">회사를 선택하세요</option>
            <option value="no-domain">프리랜서/자영업 및 기타회사</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
          
          {showSubSelection && (
            <SubSelectionContainer>
              <SubSelectionTitle>회사 유형을 선택해주세요</SubSelectionTitle>
              <SubSelectionButtons>
                <SubSelectionButton
                  type="button"
                  $selected={selectedSubType === 'freelance'}
                  onClick={() => setSelectedSubType('freelance')}
                >
                  프리랜서/자영업
                </SubSelectionButton>
                <SubSelectionButton
                  type="button"
                  $selected={selectedSubType === 'other'}
                  onClick={() => setSelectedSubType('other')}
                >
                  기타 회사
                </SubSelectionButton>
              </SubSelectionButtons>
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(102, 126, 234, 0.2)',
                  fontSize: '0.75rem',
                  color: '#666',
                  lineHeight: 1.5,
                  textAlign: 'left',
                }}
              >
                일반적으로 알려진 대기업, 공기업 및 의료기관의 경우<br />
                회사추가를 하셔서 회사 등록 후 가입 바랍니다.<br/><br/>
                이메일 주소가 있는 회사라도<br/> 회사 추가 등록이 거절될 수 있는 점 양해바랍니다..
              </div>
            </SubSelectionContainer>
          )}
          
          <Button 
            type="submit"
            disabled={selectedCompany === 'no-domain' && !selectedSubType}
          >
            다음
          </Button>
        </Form>
        
        <CustomCompanyNameModal
          isOpen={showCustomCompanyModal}
          companyType={selectedSubType || 'freelance'}
          initialValue={customCompanyName}
          onClose={() => setShowCustomCompanyModal(false)}
          onConfirm={handleCustomCompanyConfirm}
        />
        
        {showAddCompanyModal && (
          <ModalOverlay
            onClick={() => {
              if (!isSubmittingCompanyRequest) {
                setShowAddCompanyModal(false);
              }
            }}
          >
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  내 회사 추가 요청
                </ModalTitle>
                <ModalCloseButton
                  onClick={() => {
                    if (!isSubmittingCompanyRequest) {
                      setShowAddCompanyModal(false);
                    }
                  }}
                >
                  ×
                </ModalCloseButton>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmitNewCompany}>
                  <FormField>
                    <FormLabel>회사명</FormLabel>
                    <FormInput
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="예: 현대자동차, S-OIL 등"
                      disabled={isSubmittingCompanyRequest}
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>이메일 도메인 주소</FormLabel>
                    <FormInput
                      type="text"
                      value={newCompanyDomain}
                      onChange={(e) => setNewCompanyDomain(e.target.value)}
                      placeholder="예: hyundai.com"
                      disabled={isSubmittingCompanyRequest}
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>기타 요청사항 (선택)</FormLabel>
                    <FormTextarea
                      value={newCompanyMessage}
                      onChange={(e) => setNewCompanyMessage(e.target.value)}
                      placeholder={
                        '예 : 기존 메일주소가 잘못됐어요, 다른 도메인주소가 더 필요해요 등\n' +
                        '회사 추가 여부에 대한 회신을 받고 싶으시면 연락 받을 이메일 주소도 함께 남겨주세요.'
                      }
                      disabled={isSubmittingCompanyRequest}
                    />
                  </FormField>
                  <FormActions>
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        if (!isSubmittingCompanyRequest) {
                          setShowAddCompanyModal(false);
                        }
                      }}
                      disabled={isSubmittingCompanyRequest}
                    >
                      취소
                    </SecondaryButton>
                    <PrimaryActionButton
                      type="submit"
                      disabled={isSubmittingCompanyRequest}
                    >
                      {isSubmittingCompanyRequest ? '전송 중...' : '관리자에게 전송'}
                    </PrimaryActionButton>
                  </FormActions>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}

        {showCompanyGuideTooltip && (
          <ModalOverlay onClick={() => setShowCompanyGuideTooltip(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  회사 추가 관련 안내
                </ModalTitle>
                <ModalCloseButton onClick={() => setShowCompanyGuideTooltip(false)}>
                  ×
                </ModalCloseButton>
              </ModalHeader>
              <ModalBody>
                <p style={{ fontSize: '0.9rem', color: '#111827', lineHeight: 1.6 }}>
                  현재 공기업·공무원·의료기관 및 일부 대기업을 중심으로 우선 운영 중입니다.
                  무분별한 확대로 관리가 어려워질 수 있어, 검토 후 순차적으로 회사 도메인을 등록하고 있습니다.
                </p>
                <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.6, marginTop: 8 }}>
                  회사 추가를 신청하셔도 모든 요청이 바로 등록되지는 않을 수 있는 점 양해 부탁드립니다.
                </p>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </Card>
    </Container>
  );
};

export default CompanySelectionPage; 