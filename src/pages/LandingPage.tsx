import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { companyApi } from '../services/api.ts';
import type { Company } from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

const LandingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 20px;
  padding-top: 60px;
  
  @media (max-width: 768px) {
    padding-top: 80px;
    padding-bottom: 40px;
  }
  
  @media (max-width: 480px) {
    padding-top: 100px;
    padding-bottom: 30px;
  }
`;

const Logo = styled.div`
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 2rem;
  margin-top: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 2rem;
    margin-top: 3rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.8rem;
    margin-top: 4rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  margin-bottom: 3rem;
  max-width: 600px;
  line-height: 1.6;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
  
  background: ${props => props.$primary ? 'white' : 'transparent'};
  color: ${props => props.$primary ? '#667eea' : 'white'};
  border: 2px solid white;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Features = styled.div`
  margin-top: 4rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  width: 100%;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    margin-top: 2rem;
  }
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }
  
  p {
    line-height: 1.6;
    opacity: 0.9;
  }
`;

const IntroButton = styled.button`
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 100;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  background: rgba(15, 23, 42, 0.25);
  color: #f9fafb;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.45);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.6);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.4);
  }

  @media (max-width: 768px) {
    top: 14px;
    right: 12px;
    padding: 6px 12px;
    font-size: 0.8rem;
  }
`;

const CompanyButton = styled(IntroButton)`
  top: 18px;
  left: 18px;
  right: auto;
  font-size: 0.85rem;
  padding: 6px 12px;

  @media (max-width: 768px) {
    top: 14px;
    left: 12px;
    right: auto;
  }
`;

const IntroModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
`;

const IntroModalContent = styled.div`
  background: #f9fafb;
  border-radius: 18px;
  padding: 22px 22px 18px;
  width: 95vw;
  max-width: 720px;
  max-height: 85vh;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const IntroModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const IntroTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IntroBadge = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
`;

const IntroCloseButton = styled.button`
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

const IntroBody = styled.div`
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.6;
  overflow-y: auto;
  text-align: left;
`;

const IntroSectionTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
  margin: 14px 0 6px;
`;

const IntroList = styled.ol`
  margin: 0;
  padding-left: 1.1rem;
  li {
    margin-bottom: 8px;
  }
`;

const CompanyFooter = styled.div`
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  justify-content: flex-start;
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
    border-radius: 999px;
    background: #4f46e5;
    color: #f9fafb;
    font-size: 0.75rem;
    font-weight: 700;
  }

  &:hover {
    background: rgba(79, 70, 229, 0.12);
    box-shadow: 0 4px 10px rgba(79, 70, 229, 0.18);
    transform: translateY(-0.5px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(79, 70, 229, 0.15);
  }
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

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth() as any;
  const [showIntro, setShowIntro] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);
  const [activeCompanies, setActiveCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDomain, setNewCompanyDomain] = useState('');
  const [newCompanyMessage, setNewCompanyMessage] = useState('');
  const [isSubmittingCompanyRequest, setIsSubmittingCompanyRequest] = useState(false);
  const [showCompanyGuideTooltip, setShowCompanyGuideTooltip] = useState(false);

  // 이미 로그인된 상태에서 랜딩( "/" )로 진입하면 메인으로 보내기
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/main');
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!showCompanies) return;

    let cancelled = false;
    companyApi
      .getCompanies()
      .then((list) => {
        if (cancelled) return;
        const actives = (list || [])
          .filter((c) => {
            // isActive 체크
            const isActive = (c as any).is_active === true || (c as any).isActive === true;
            if (!isActive) return false;
            // 9000번 이후 id는 제외
            const companyId = parseInt(String(c.id), 10);
            return !isNaN(companyId) && companyId < 9000;
          })
          .slice()
          .sort((a, b) => (a as any).name.localeCompare((b as any).name, 'ko-KR'));
        setActiveCompanies(actives);
      })
      .catch(() => {
        if (cancelled) return;
        setActiveCompanies([]);
      });

    return () => {
      cancelled = true;
    };
  }, [showCompanies]);

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

  return (
    <LandingContainer>
      <IntroButton onClick={() => setShowIntro(true)}>
        직쏠공이란?
      </IntroButton>
      <CompanyButton onClick={() => setShowCompanies(true)}>
        가입 가능 회사
      </CompanyButton>
      <Logo>울산 직장인 솔로 공모</Logo>
      <Subtitle>
        신분이 보장된 내 맘에 드는 사람을 만나고 싶은데<br/>
        실패하면서 주선자와의 관계가 신경쓰이고<br/>
        잦은 사진교환이 부담스러웠다면<br/>
        이런 걱정은 그만!<br/><br/>
        직장인 솔로 공모에서<br/>
        정기적으로 소개팅을 주선해드립니다.<br/>
        이제 부담없이 만나보세요.
      </Subtitle>
      
      <ButtonContainer>
        <Button onClick={() => navigate('/login')}>
          로그인
        </Button>
        <Button $primary onClick={() => navigate('/register')}>
          회원가입
        </Button>
      </ButtonContainer>
      
      <Features>
        <FeatureCard>
          <h3>🔒 안전한 만남</h3>
          <p>100% 회사 메일을 통해 인증 받은 직장인만을 위한 확실한 만남을 경험하세요.</p>
        </FeatureCard>
        
        <FeatureCard>
          <h3>🎯 취향 저격</h3>
          <p>서로의 취향과 선호도를 반영하여 최적의 매칭을 제공합니다.</p>
        </FeatureCard>
        
        <FeatureCard>
          <h3>💝 부담없는 만남</h3>
          <p>사진 공개 없이! 주선자없이! 진심어린 소통으로 새로운 인연을 만들어보세요.</p>
        </FeatureCard>
      </Features>

      {showIntro && (
        <IntroModalOverlay onClick={() => setShowIntro(false)}>
          <IntroModalContent onClick={e => e.stopPropagation()}>
            <IntroModalHeader>
              <IntroTitle>
                직쏠공이란?
                <IntroBadge>울산 직장인 솔로 공모</IntroBadge>
              </IntroTitle>
              <IntroCloseButton onClick={() => setShowIntro(false)}>×</IntroCloseButton>
            </IntroModalHeader>

            <IntroBody>
              <p style={{ marginBottom: 10 }}>
                안녕하세요. 울산 지역에서 근무하고 있는 현대차 일반직 직원입니다.
                개인적으로 준비해 오다 최근 오픈하게 된 
                <br/><strong>울산 직장인 솔로 공모 </strong>
                서비스를 소개드리고자 합니다.
              </p><br/>

              <IntroSectionTitle>왜 이 서비스를 만들었나요?</IntroSectionTitle>
              <p style={{ marginBottom: 8 }}>
                근무하면서 보니 괜찮은 선후배들이 솔로로 지내는 경우가 종종 있고,
                어느 팀에 누가 솔로인지 수소문해 소개해 주기에도 한계가 있었습니다.
                예전에 학교 커뮤니티에서 매칭해 주던 방식이 떠올라, 울산 현대차 사내
                근무자를 위한 매칭 웹서비스를 직접 만들게 되었습니다.
              </p>
              <p style={{ marginBottom: 10 }}>
                네, 홍보가 맞습니다만 <strong>비영리 목적</strong>으로 운영되는 무료 서비스입니다.
              </p><br/>

              <IntroSectionTitle>서비스 구성</IntroSectionTitle>
              <IntroList>
                <li>
                  <strong>회사 메일 인증 가입</strong>
                  <br />
                  사내 직원 간 기본적인 신뢰를 확보하기 위해 회사 이메일 인증을 통해 가입합니다.
                </li>
                <li>
                  <strong>프로필 기반 자동 매칭</strong>
                  <br />
                  나이, 키, 체형 등 프로필과 선호 스타일을 기반으로 매칭 알고리즘이 동작합니다.
                  매칭 주기는 현재 <strong>2주 1회</strong>를 계획하고 있습니다.
                </li>
                <li>
                  <strong>매칭 성공 시 1:1 채팅방 생성</strong>
                  <br />
                  개인정보 보호를 위해 휴대폰 번호나 소속 등 직접적인 개인정보 교환보다는,
                  서비스 내 채팅을 통해 약속을 잡고 만나시는 것을 권장드립니다.
                </li>
                <li>
                  <strong>안전한 정보 처리</strong>
                  <br />
                  인증 및 제재를 위한 이메일 정보만 관리자가 보관하며,
                  비밀번호와 채팅 내용은 모두 암호화되어 관리자도 열람할 수 없습니다.
                </li>
              </IntroList><br/>

              <IntroSectionTitle>운영과 약속</IntroSectionTitle>
              <p style={{ marginBottom: 8 }}>
                비매너 유저 신고, 과거 매칭 대상자 재매칭 제외 등 여러 운영 요소들을 준비해 두었습니다.
                실제 이용해 보시면 직관적으로 이해하실 수 있을 것입니다.
              </p>
              <p style={{ marginBottom: 8 }}>
                초기에는 인원이 적어 매칭률이 낮을 수 있지만, 꾸준히 운영하면서
                좋은 솔로 분들을 많이 모셔보겠습니다. 주변에 떠오르는 지인이나 선후배가 있다면
                가볍게 추천해 주세요.
              </p><br/>

              <IntroSectionTitle>마지막으로</IntroSectionTitle>
              <p style={{ marginBottom: 8 }}>
                서비스는 전부 <strong>무료</strong>로 이용 가능하며, 추후에는 타 대기업·지역
                기반으로도 확장을 꿈꾸고 있습니다. 많은 관심과 응원, 그리고 자연스러운 홍보까지
                감사히 받겠습니다.
              </p>
              <p style={{ marginBottom: 4 }}>
                추가적인 질문은 가입 후 고객센터 문의사항 또는 FAQ를 통해 남겨주시면 성심껏
                답변드리겠습니다.
              </p>
              <p style={{ marginTop: 10, fontSize: '0.85rem', color: '#6b7280' }}>
                #현대자동차 #에스오일 #현대중공업 #공무원 #울산광역시 #울산광역시교육청
              </p>
            </IntroBody>
          </IntroModalContent>
        </IntroModalOverlay>
      )}

      {showCompanies && (
        <IntroModalOverlay onClick={() => setShowCompanies(false)}>
          <IntroModalContent onClick={e => e.stopPropagation()}>
            <IntroModalHeader>
              <IntroTitle>
                가입 가능 회사 목록
              </IntroTitle>
              <IntroCloseButton onClick={() => setShowCompanies(false)}>×</IntroCloseButton>
            </IntroModalHeader>
            <IntroBody>
              {activeCompanies.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  현재 가입 가능한 회사 정보가 없습니다. 추후 공지를 통해 추가 안내드리겠습니다.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {activeCompanies.map((c) => (
                    <li
                      key={c.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        marginBottom: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: c.emailDomains && c.emailDomains.length > 0 ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (c.emailDomains && c.emailDomains.length > 0) {
                          setSelectedCompany(c);
                        }
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#111827' }}>{c.name}</span>
                      {c.emailDomains && c.emailDomains.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                          {c.emailDomains.slice(0, 2).map((domain) => (
                            <span
                              key={domain}
                              style={{
                                fontSize: '0.8rem',
                                color: '#4b5563',
                                backgroundColor: '#e5e7eb',
                                padding: '2px 8px',
                                borderRadius: 999,
                              }}
                            >
                              {domain}
                            </span>
                          ))}
                          {c.emailDomains.length > 2 && (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: '#4b5563',
                                backgroundColor: '#e5e7eb',
                                padding: '2px 8px',
                                borderRadius: 999,
                              }}
                            >
                              +{c.emailDomains.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <CompanyFooter>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    width: '100%',
                    flexWrap: 'wrap',
                  }}
                >
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
                      회사 추가 관련 안내
                    </span>
                  </div>

                  <TextLinkButton
                    type="button"
                    onClick={() => {
                      setShowCompanies(false);
                      setShowAddCompanyModal(true);
                    }}
                  >
                    내 회사 추가하기
                  </TextLinkButton>
                </div>
              </CompanyFooter>
              
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  lineHeight: 1.4,
                  textAlign: 'center',
                }}
              >
                회사 도메인이 없는 경우 회원가입 시 <strong style={{ color: '#6b7280' }}>프리랜서/자영업</strong> 또는 <strong style={{ color: '#6b7280' }}>기타 회사</strong>를 선택하실 수 있습니다.
              </div>
            </IntroBody>
          </IntroModalContent>
        </IntroModalOverlay>
      )}

      {selectedCompany && (
        <IntroModalOverlay onClick={() => setSelectedCompany(null)}>
          <IntroModalContent onClick={e => e.stopPropagation()}>
            <IntroModalHeader>
              <IntroTitle>
                {selectedCompany.name} 도메인 목록
              </IntroTitle>
              <IntroCloseButton onClick={() => setSelectedCompany(null)}>×</IntroCloseButton>
            </IntroModalHeader>
            <IntroBody>
              {selectedCompany.emailDomains && selectedCompany.emailDomains.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {[...selectedCompany.emailDomains]
                    .sort((a, b) => a.localeCompare(b))
                    .map((domain) => (
                      <li
                        key={domain}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          marginBottom: 6,
                          fontSize: '0.9rem',
                          color: '#111827',
                        }}
                      >
                        {domain}
                      </li>
                    ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  등록된 도메인 정보가 없습니다.
                </p>
              )}
            </IntroBody>
          </IntroModalContent>
        </IntroModalOverlay>
      )}

      {showAddCompanyModal && (
        <IntroModalOverlay
          onClick={() => {
            if (!isSubmittingCompanyRequest) {
              setShowAddCompanyModal(false);
            }
          }}
        >
          <IntroModalContent onClick={e => e.stopPropagation()}>
            <IntroModalHeader>
              <IntroTitle>
                내 회사 추가 요청
              </IntroTitle>
              <IntroCloseButton
                onClick={() => {
                  if (!isSubmittingCompanyRequest) {
                    setShowAddCompanyModal(false);
                  }
                }}
              >
                ×
              </IntroCloseButton>
            </IntroModalHeader>
            <IntroBody>
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
            </IntroBody>
          </IntroModalContent>
        </IntroModalOverlay>
      )}

      {showCompanyGuideTooltip && (
        <IntroModalOverlay onClick={() => setShowCompanyGuideTooltip(false)}>
          <IntroModalContent
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <IntroModalHeader>
              <IntroTitle>
                회사 추가 관련 안내
              </IntroTitle>
              <IntroCloseButton onClick={() => setShowCompanyGuideTooltip(false)}>
                ×
              </IntroCloseButton>
            </IntroModalHeader>
            <IntroBody>
              <p style={{ fontSize: '0.9rem', color: '#111827', lineHeight: 1.6 }}>
                현재 공기업·공무원·의료기관 및 일부 대기업을 중심으로 우선 운영 중입니다.
                무분별한 확대로 관리가 어려워질 수 있어, 검토 후 순차적으로 회사 도메인을 등록하고 있습니다.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.6, marginTop: 8 }}>
                회사 추가를 신청하셔도 모든 요청이 바로 등록되지는 않을 수 있는 점 양해 부탁드립니다.
              </p>
            </IntroBody>
          </IntroModalContent>
        </IntroModalOverlay>
      )}
    </LandingContainer>
  );
};

export default LandingPage; 