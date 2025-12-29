import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { companyApi } from '../../services/api.ts';
import { Company } from '../../types/index.ts';
import { FaArrowLeft } from 'react-icons/fa';
import CustomCompanyNameModal from '../../components/CustomCompanyNameModal.tsx';

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
          회사 이메일 도메인이 있는 경우 해당 회사를 선택해주세요.<br />
          회사 도메인이 없는 경우 <strong>프리랜서/자영업</strong> 또는 <strong>기타 회사</strong>를 선택하실 수 있습니다.
        </InfoBox>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Select {...register('company', { required: '회사를 선택해주세요.' })}>
            <option value="">회사를 선택하세요</option>
            <option value="no-domain">회사 도메인 없음</option>
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
      </Card>
    </Container>
  );
};

export default CompanySelectionPage; 