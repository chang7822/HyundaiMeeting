import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { authApi, companyApi } from '../../services/api.ts';
import { Company } from '../../types/index.ts';
import { FaArrowLeft } from 'react-icons/fa';

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

const Input = styled.input`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #e74c3c;
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

const VerificationSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e1e5e9;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
`;

const VerificationButton = styled(Button)`
  margin-top: 0;
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
  margin-top: 0;
  &:hover {
    background: #f7f7fa;
    color: #764ba2;
  }
`;

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

const SuccessMessage = styled.div`
  color: #27ae60;
  background: #d5f4e6;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
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
  
  &.error {
    border-color: #e74c3c;
  }
`;

const ResponsiveRow = styled.div`
  display: flex;
  gap: 8px;
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 0;
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

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [companyDomains, setCompanyDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<{ emailId: string }>();

  React.useEffect(() => {
    // 회사 id로 도메인 목록 불러오기
    const fetchDomains = async () => {
      const companyId = sessionStorage.getItem('userCompany');
      if (!companyId) return;
      const companies = await companyApi.getCompanies();
      const company = companies.find(c => c.id === companyId);
      if (company && company.emailDomains && company.emailDomains.length > 0) {
        setCompanyDomains(company.emailDomains);
        // 복원: sessionStorage에 저장된 도메인 있으면 사용
        const savedDomain = sessionStorage.getItem('userEmailDomain');
        if (savedDomain && company.emailDomains.includes(savedDomain)) {
          setSelectedDomain(savedDomain);
        } else {
          setSelectedDomain(company.emailDomains[0]);
        }
      }
    };
    fetchDomains();
    // 복원: sessionStorage에 저장된 emailId 있으면 setValue
    const savedEmail = sessionStorage.getItem('userEmail');
    if (savedEmail && savedEmail.includes('@')) {
      setValue('emailId', savedEmail.split('@')[0]);
    }
  }, [setValue]);

  const onSubmit = async (data: { emailId: string }) => {
    setIsLoading(true);
    setEmailError('');
    try {
      if (!selectedDomain) {
        setEmailError('이메일 도메인을 선택해주세요.');
        setIsLoading(false);
        return;
      }
      const email = `${data.emailId}@${selectedDomain}`;
      sessionStorage.setItem('userEmail', email);
      sessionStorage.setItem('userEmailDomain', selectedDomain);
      await authApi.verifyEmail(email);
      setIsVerificationSent(true);
      toast.success('인증 메일이 발송되었습니다!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '이메일 발송에 실패했습니다.';
      if (errorMessage.includes('이미 등록된 이메일')) {
        setEmailError('이미 등록된 이메일입니다.');
        setTimeout(() => setEmailError(''), 3000); // 3초 후에 에러 메시지 삭제
        toast.error('이미 등록된 이메일입니다. 로그인해주세요.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    try {
      const email = sessionStorage.getItem('userEmail') || '';
      await authApi.confirmVerification(email, verificationCode);
      toast.success('이메일 인증이 완료되었습니다!');
      navigate('/register/password');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '인증번호가 올바르지 않습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <Container>
      <Card style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/company')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>이메일 인증</Title>
        
        {!isVerificationSent ? (
          <Form onSubmit={handleSubmit(onSubmit)}>
            <ResponsiveRow>
              <Input
                type="text"
                {...register('emailId', {
                  required: '이메일 아이디를 입력해주세요.',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+$/i,
                    message: '올바른 이메일 아이디 형식이어야 합니다.',
                  },
                })}
                className={errors.emailId || emailError ? 'error' : ''}
                placeholder="이메일 아이디"
                style={{ flex: 2 }}
              />
              <Select
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                style={{ flex: 2 }}
              >
                {companyDomains.map(domain => (
                  <option key={domain} value={domain}>@{domain}</option>
                ))}
              </Select>
            </ResponsiveRow>
            {errors.emailId && <ErrorMessage>{errors.emailId.message}</ErrorMessage>}
            {emailError && <ErrorMessage>{emailError}</ErrorMessage>}
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '발송 중...' : '인증 메일 발송'}
            </Button>
            
            {emailError && (
              <Button 
                type="button"
                onClick={handleLoginClick}
                style={{ 
                  background: 'transparent', 
                  color: '#667eea', 
                  border: '2px solid #667eea',
                  marginTop: '0.5rem'
                }}
              >
                로그인하기
              </Button>
            )}
          </Form>
        ) : (
          <div>
            <SuccessMessage>
              인증 메일이 발송되었습니다!<br />
              메일함을 확인하여 인증번호를 입력해주세요.
            </SuccessMessage>
            
            <VerificationSection>
              <Input
                type="text"
                placeholder="인증번호 6자리를 입력하세요"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
              
              <VerificationButton 
                onClick={handleVerificationSubmit}
                disabled={isVerifying || !verificationCode}
              >
                {isVerifying ? '인증 중...' : '인증 확인'}
              </VerificationButton>
              
              <SecondaryButton
                type="button"
                onClick={() => setIsVerificationSent(false)}
              >
                이메일 다시 입력
              </SecondaryButton>
            </VerificationSection>
          </div>
        )}
      </Card>
    </Container>
  );
};

export default EmailVerificationPage; 