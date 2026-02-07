import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfileCategories, getProfileOptions, userApi, authApi } from '../services/api.ts';
import AddressSelectModal from '../components/AddressSelectModal.tsx';
import { ProfileCategory, ProfileOption, User, UserProfile, EDUCATION_OPTIONS, type EducationLevel } from '../types/index.ts';
import Slider from 'rc-slider';
import { useAuth } from '../contexts/AuthContext.tsx';
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';
import InlineSpinner from '../components/InlineSpinner.tsx';
import { getDisplayCompanyName } from '../utils/companyDisplay.ts';

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
const Card = styled.div`
  position: relative;
  background: white;
  border-radius: 15px;
  padding: 2rem;
  width: 100%;
  max-width: 95vw;
  margin: 0 auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
const CardOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  border-radius: 15px;
`;
const CloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #888;
  cursor: pointer;
  z-index: 10;
  &:hover { color: #e74c3c; }
`;
const Title = styled.h2`
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  text-align: center;
`;
const Label = styled.label`
  font-size: 1rem;
  margin-bottom: 8px;
  display: block;
  font-weight: 600;
  color: #333;
`;
const Input = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid #e1e5e9;
  font-size: 1rem;
  margin-bottom: 16px;
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;
const Button = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-2px);
  }
`;
const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
`;
const OptionButton = styled.button<{selected?: boolean}>`
  background: ${({selected}) => selected ? '#764ba2' : '#fff'};
  color: ${({selected}) => selected ? '#fff' : '#333'};
  border: 1.5px solid #764ba2;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
`;
const DangerButton = styled(Button)`
  background: #fff;
  color: #e74c3c;
  border: 2px solid #e74c3c;
  margin-top: 2rem;
  &:hover {
    background: #ffeaea;
    color: #e74c3c;
  }
`;
const ModalBg = styled.div`
  position: fixed; left:0; top:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); z-index:1000; display:flex; align-items:center; justify-content:center;
`;
const ModalCard = styled.div`
  background:#fff; border-radius:16px; padding:32px 24px; min-width:320px; max-width:90vw; box-shadow:0 2px 10px rgba(0,0,0,0.12);
`;
const SelectButton = styled.button`
  width: 100%;
  background: #f7f7fa;
  color: #764ba2;
  border: 2px solid #764ba2;
  border-radius: 8px;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 24px;
  transition: background 0.2s, color 0.2s, border 0.2s;
  &:hover {
    background: #ede7f6;
    color: #4b2e83;
    border: 2px solid #4b2e83;
  }
`;

const PopupBg = styled.div`
  position: fixed; left:0; top:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); z-index:1000; display:flex; align-items:center; justify-content:center;
`;
const Popup = styled.div`
  background:#fff; border-radius:16px; padding:32px 24px; min-width:400px; max-width:90vw; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;
`;
const PopupTitle = styled.h3`
  font-size:1.1rem; margin-bottom:16px; text-align:center;
`;
const PopupOption = styled.button<{selected?: boolean}>`
  background: ${({selected}) => selected ? '#764ba2' : '#f7f7fa'};
  color: ${({selected}) => selected ? '#fff' : '#333'};
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  &:hover {
    background: ${({selected}) => selected ? '#764ba2' : '#e8e8e8'};
    transform: translateY(-1px);
  }
`;
const PopupFooter = styled.div`
  margin-top: 24px; text-align: center;
`;

const MultiSelectModal = ({ isOpen, onClose, options, selected, onSelect, title }: {
  isOpen: boolean;
  onClose: () => void;
  options: string[];
  selected: string[];
  onSelect: (values: string[]) => void;
  title: string;
}) => {
  const [temp, setTemp] = useState<string[]>(selected);
  useEffect(() => { setTemp(selected); }, [selected, isOpen]);
  if (!isOpen) return null;
  return (
    <PopupBg>
      <Popup>
        <PopupTitle>{title}</PopupTitle>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px', maxHeight:'300px', overflowY:'auto', padding:'8px', marginBottom:'16px'}}>
          {options.map(opt => (
            <PopupOption key={opt} selected={temp.includes(opt)} onClick={() => {
              if (temp.includes(opt)) {
                setTemp(temp.filter(v=>v!==opt));
              } else if (temp.length < 7) {
                setTemp([...temp,opt]);
              } else {
                toast('최대 7개까지만 선택할 수 있습니다.');
              }
            }}>{opt}</PopupOption>
          ))}
        </div>
        <PopupFooter>
          <Button onClick={()=>{onSelect(temp);onClose();}}>확인</Button>
        </PopupFooter>
      </Popup>
    </PopupBg>
  );
};

const NICKNAME_REGEX = /^[\uac00-\ud7a3a-zA-Z0-9]+$/;

// [추가] BodyTypeGrid, BodyTypeButton styled-components 정의 (PreferenceSetupPage와 동일)
const BodyTypeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 24px;
`;
const BodyTypeButton = styled.button<{ selected: boolean }>`
  background: ${props => props.selected ? '#764ba2' : '#f7f7fa'};
  color: ${props => props.selected ? '#fff' : '#333'};
  border: 1.5px solid #764ba2;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  &:hover {
    background: ${props => props.selected ? '#764ba2' : '#e8e8e8'};
  }
`;

const ProfilePage = ({ sidebarOpen }: { sidebarOpen: boolean }) => {
  const navigate = useNavigate();
  const { isAuthenticated, fetchUser, user, logout } = useAuth();
  const [categories, setCategories] = useState<ProfileCategory[]>([]);
  const [options, setOptions] = useState<ProfileOption[]>([]);
  const [profile, setProfile] = useState<Partial<UserProfile & User>>({});
  const [addressPopup, setAddressPopup] = useState(false);
  const [pwPopup, setPwPopup] = useState(false);
  const [delPopup, setDelPopup] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [delPw, setDelPw] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [interestPopup, setInterestPopup] = useState(false);
  const [appearancePopup, setAppearancePopup] = useState(false);
  const [personalityPopup, setPersonalityPopup] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const isPwMatch = !!pw2 && pw === pw2;
  const isPwNotMatch = !!pw2 && pw !== pw2;
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  // [1] 체형 선택 상태를 배열로 변경 (정확히 3개 선택)
  const [bodyTypes, setBodyTypes] = useState<string[]>(Array.isArray(profile.body_type) ? profile.body_type : (profile.body_type ? JSON.parse(profile.body_type) : []));
  const [bodyTypeLimitWarned, setBodyTypeLimitWarned] = useState(false);
  // [2] 체형 MultiSelect 팝업
  // [삭제] bodyTypePopup 관련 상태/컴포넌트 제거
  // [추가] handleBodyTypeToggle 함수
  const handleBodyTypeToggle = (bodyType: string) => {
    setBodyTypes(prev => {
      if (prev.includes(bodyType)) {
        const next = prev.filter(type => type !== bodyType);
        if (next.length < 3) {
          setBodyTypeLimitWarned(false);
        }
        return next;
      } else if (prev.length < 3) {
        return [...prev, bodyType];
      } else {
        if (!bodyTypeLimitWarned) {
        toast('최대 3개까지만 선택할 수 있습니다.');
          setBodyTypeLimitWarned(true);
        }
        return prev;
      }
    });
  };

  // [추가] profile.body_type이 바뀔 때마다 bodyTypes 동기화
  useEffect(() => {
    setBodyTypes(
      Array.isArray(profile.body_type)
        ? profile.body_type
        : (profile.body_type ? JSON.parse(profile.body_type) : [])
    );
  }, [profile.body_type]);

  useEffect(() => {
    setLoading(true);
    // console.log('[ProfilePage] useEffect 진입, isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) return;
    // console.log('[ProfilePage] 인증 복원 완료, 내 정보 API 호출');
    (async () => {
      try {
        const [userProfile, categoriesData, optionsData] = await Promise.all([
          userApi.getMe(),
          getProfileCategories(),
          getProfileOptions(),
        ]);
        setProfile(userProfile);
        setCategories(categoriesData);
        setOptions(optionsData);
        // console.log('[ProfilePage] getMe 데이터:', userProfile);
        // console.log('[ProfilePage] getProfileCategories 데이터:', categoriesData);
        // console.log('[ProfilePage] getProfileOptions 데이터:', optionsData);
      } catch (err) {
        console.error('[ProfilePage] 데이터 로딩 에러:', err);
      } finally {
        setLoading(false); // 모든 데이터 로딩 후 로딩 해제
      }
    })();
  }, [isAuthenticated]);

  const getOptions = (catName:string) => {
    const cat = categories.find((c) => c.name === catName);
    if (!cat) return [];
    return options.filter((o) => o.category_id === cat.id);
  };

  const validateNickname = (value: string) => {
    if (!value) return '닉네임을 입력해주세요.';
    if (value.length < 2) return '닉네임은 최소 2자 이상이어야 합니다.';
    if (value.length > 10) return '닉네임은 최대 10자까지 가능합니다.';
    if (!NICKNAME_REGEX.test(value)) return '한글, 영문, 숫자만 사용 가능합니다.';
    return null;
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProfile({ ...profile, nickname: value });
    setNicknameError(validateNickname(value));
  };

  const handleSave = async () => {
    // 필수 입력값 검증
    const missingFields: string[] = [];
    const nicknameErr = validateNickname(profile.nickname || '');
    if (nicknameErr) {
      setNicknameError(nicknameErr);
      missingFields.push('닉네임');
    }
    if (!profile.height) missingFields.push('키');
    if (!profile.mbti) missingFields.push('MBTI');
    if (!profile.residence) missingFields.push('거주지');
    if (!profile.education) missingFields.push('학력');
    if (!profile.marital_status) missingFields.push('결혼상태');
    // [추가] 체형은 정확히 3개 선택 필수
    if (!bodyTypes || bodyTypes.length !== 3) missingFields.push('체형(3개)');
    const interestsArr = Array.isArray(profile.interests) ? profile.interests : (profile.interests ? JSON.parse(profile.interests) : []);
    if (!interestsArr || interestsArr.length === 0) missingFields.push('관심사');
    const appearanceArr = Array.isArray(profile.appearance) ? profile.appearance : (profile.appearance ? JSON.parse(profile.appearance) : []);
    if (!appearanceArr || appearanceArr.length === 0) missingFields.push('외모');
    const personalityArr = Array.isArray(profile.personality) ? profile.personality : (profile.personality ? JSON.parse(profile.personality) : []);
    if (!personalityArr || personalityArr.length === 0) missingFields.push('성격');
    if (!profile.appeal || profile.appeal.trim().length === 0) missingFields.push('자기소개');
    if (missingFields.length > 0) {
      if (missingFields.includes('체형(3개)')) {
        toast.error('원활한 매칭을 위해 체형 3개를 선택 바랍니다.');
        return;
      }
      toast.error(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
      return;
    }
    setIsSaving(true);
    try {
      // 허용된 필드만 추출
      const {
        nickname,
        height,
        mbti,
        interests,
        appearance,
        personality,
        residence,
        education,
        marital_status,
        appeal,
        religion,
        smoking,
        drinking,
        body_type,
      } = profile;
      // [3] 저장 시 body_type을 배열(JSON string)로 저장
      const updateData = {
        nickname,
        height,
        mbti,
        interests,
        appearance,
        personality,
        residence: profile.residence,
        education,
        marital_status,
        appeal,
        religion: profile.religion,
        smoking: profile.smoking,
        drinking: profile.drinking,
        body_type: JSON.stringify(bodyTypes),
      };
      // console.log('[디버깅] 저장 요청 updateData:', updateData);
      const res = await userApi.updateMe(updateData);
      // console.log('[디버깅] 서버 응답:', res);
      toast.success('프로필이 저장되었습니다.');
      setTimeout(() => navigate('/main'), 700);
    } catch (err) {
      console.error('[디버깅] 저장 에러:', err);
      if (err.response) {
        console.error('[디버깅] 에러 응답 데이터:', err.response.data);
      }
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePw = async () => {
    if (!currentPw || !pw || pw.length < 6) return toast.error('현재 비밀번호와 6자 이상 새 비밀번호를 입력하세요.');
    if (pw !== pw2) return toast.error('새 비밀번호가 일치하지 않습니다.');
    if (currentPw === pw) return toast.error('현재 비밀번호와 새 비밀번호가 같습니다. 다른 비밀번호를 입력하세요.');
    try {
      await userApi.changePassword(profile.user_id || '', currentPw, pw);
      toast.success('비밀번호가 변경되었습니다.');
      setCurrentPw(''); setPw(''); setPw2(''); setPwPopup(false);
      setTimeout(() => navigate('/main'), 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || '비밀번호 변경 실패');
    }
  };

  const handleDelete = async () => {
    if (!delPw) return toast.error('비밀번호를 입력하세요.');
    
    try {
      // 매칭 상태 확인을 위해 fetchUser 실행
      await fetchUser();
      
      // 매칭 중인지 확인
      if (user?.is_matched === true) {
        toast.error('현재 매칭이 진행중입니다. 회차가 종료된 후에 탈퇴가 가능합니다.');
        setDelPw('');
        setDelPopup(false);
        return;
      }
      
      // 비밀번호 확인
      await authApi.login({ email: profile.email!, password: delPw });
      
      // 탈퇴 API 호출 전에 현재 토큰 백업 (API 호출용)
      const currentToken = localStorage.getItem('token');
      
      // 즉시 로그아웃 처리 (AuthContext 초기화 + 폴링 중단)
      await logout();
      
      // 백업한 토큰으로 탈퇴 API 호출
      if (currentToken) {
        // 임시로 토큰 복원하여 탈퇴 API 호출
        localStorage.setItem('token', currentToken);
        try {
          await userApi.deleteMe();
        } finally {
          // 탈퇴 API 호출 후 토큰 완전 삭제
          localStorage.clear();
          sessionStorage.clear();
        }
      } else {
        // 토큰이 없으면 그냥 탈퇴 API 호출 시도
        await userApi.deleteMe();
        localStorage.clear();
        sessionStorage.clear();
      }
      
      toast.success('회원 탈퇴가 완료되었습니다.');
      
      // 홈으로 이동 (약간의 딜레이 추가하여 토스트 메시지 확인 가능)
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error: any) {
      // 탈퇴 실패 시에도 에러 내용에 따라 처리
      const errorMsg = error?.response?.data?.error || error?.message || '비밀번호가 올바르지 않거나 탈퇴 실패';
      toast.error(errorMsg);
      setDelPw('');
    }
  };

  // 카테고리 id 찾기
  const religionCat = categories.find(c => c.name === '종교');
  const smokingCat = categories.find(c => c.name === '흡연');
  const drinkingCat = categories.find(c => c.name === '음주');
  // 옵션 목록 추출
  const religionOptions = religionCat ? options.filter(o => o.category_id === religionCat.id) : [];
  const smokingOptions = smokingCat ? options.filter(o => o.category_id === smokingCat.id) : [];
  const drinkingOptions = drinkingCat ? options.filter(o => o.category_id === drinkingCat.id) : [];
  const interestOptions = getOptions('관심사').map(opt=>opt.option_text);
  const appearanceOptions = (() => {
    const cat = categories.find(c => c.name === '외모' && (c.gender === 'common' || c.gender === profile.gender));
    if (!cat) return [];
    return options.filter(o => o.category_id === cat.id).map(o => o.option_text);
  })();
  const personalityOptions = (() => {
    const cat = categories.find(c => c.name === '성격' && (c.gender === 'common' || c.gender === profile.gender));
    if (!cat) return [];
    return options.filter(o => o.category_id === cat.id).map(o => o.option_text);
  })();

  if (!isAuthenticated) return null;

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <Card>
        {loading && (
          <CardOverlay>
            <InlineSpinner text="프로필 정보를 불러오는 중입니다..." />
          </CardOverlay>
        )}
        <CloseButton onClick={() => navigate('/main')} title="닫기"><FaTimes /></CloseButton>
        <Title>내 프로필 관리</Title>
        
        {/* 이메일 인증 안내 */}
        {user?.is_verified === false && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#856404', margin: 0, fontSize: '0.9rem' }}>
              ⚠️ 프로필 수정을 위해서는 이메일 인증이 필요합니다.<br />
              메인 페이지에서 이메일 인증을 완료해주세요.
            </p>
          </div>
        )}
        <Label>닉네임</Label>
        <Input
          value={profile.nickname||''}
          onChange={handleNicknameChange}
          maxLength={10}
          minLength={2}
          disabled={true}
          style={{
            borderColor: nicknameError
              ? '#e74c3c'
              : profile.nickname && !nicknameError
              ? '#2ecc40'
              : '#e1e5e9',
            marginBottom:24,
            backgroundColor: '#f5f5f5',
            cursor: 'not-allowed'
          }}
        />
        {nicknameError && (
          <div style={{ color: '#e74c3c', fontSize: '0.95rem', marginTop: -12, marginBottom: 8 }}>{nicknameError}</div>
        )}
        {/* 회사 - 읽기 전용 */}
        <Label>소속</Label>
        <Input
          value={getDisplayCompanyName(profile.company, profile.custom_company_name) || '회사 정보가 없습니다.'}
          disabled={true}
          style={{
            marginBottom:24,
            backgroundColor: '#f5f5f5',
            cursor: 'not-allowed'
          }}
        />
        <Label>키</Label>
        <div style={{marginBottom:'8px',padding:'0 16px'}}>
          <Slider
            min={150}
            max={200}
            value={typeof profile.height === 'number' ? profile.height : Number(profile.height) || 150}
            onChange={value => setProfile({ ...profile, height: typeof value === 'number' ? value : (Array.isArray(value) ? value[0] : 150) })}
            trackStyle={[{ backgroundColor: '#764ba2', height: 10 }]}
            handleStyle={[{ width: 28, height: 28, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -8, opacity: 1, boxShadow: '0 2px 4px #764ba2' }]}
            railStyle={{ backgroundColor: '#e0e0e0', height: 10 }}
            style={{marginBottom:24}}
          />
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'2px',fontSize:'0.95rem',color:'#666',fontWeight:500}}>
            <span>150</span>
            <span>160</span>
            <span>170</span>
            <span>180</span>
            <span>190</span>
            <span>200</span>
          </div>
          <div style={{textAlign:'center',fontSize:'1.1rem',fontWeight:600,color:'#764ba2',margin:'10px 0 24px 0'}}>
            {profile.height ? `${profile.height} cm` : '키를 입력해주세요'}
          </div>
        </div>
        <Label>체형 (3개 선택)</Label>
        <BodyTypeGrid>
          {(() => {
            // '체형' 카테고리 중 gender가 profile.gender와 일치하는 것만 사용
            const bodyTypeCat = categories.find(c => c.name === '체형' && c.gender === profile.gender);
            if (!bodyTypeCat) return null;
            return options.filter(o => o.category_id === bodyTypeCat.id).map(opt => (
              <BodyTypeButton
                key={opt.option_text}
                selected={bodyTypes.includes(opt.option_text)}
                onClick={() => handleBodyTypeToggle(opt.option_text)}
              >
                {opt.option_text}
              </BodyTypeButton>
            ));
          })()}
        </BodyTypeGrid>
        <Label>거주지</Label>
        <SelectButton type="button" onClick={()=>setAddressPopup(true)}>
          {profile.residence||'주소를 선택해주세요'}
        </SelectButton>
        <Label>종교</Label>
        <Row>
          {religionOptions.map(opt => (
            <OptionButton
              key={opt.id}
              selected={profile.religion === opt.option_text}
              onClick={() => setProfile({ ...profile, religion: opt.option_text })}
            >{opt.option_text}</OptionButton>
          ))}
        </Row>
        <Label>흡연</Label>
        <Row>
          {smokingOptions.map(opt => (
            <OptionButton
              key={opt.id}
              selected={profile.smoking === opt.option_text}
              onClick={() => setProfile({ ...profile, smoking: opt.option_text })}
            >{opt.option_text}</OptionButton>
          ))}
        </Row>
        <Label>음주</Label>
        <Row>
          {drinkingOptions.map(opt => (
            <OptionButton
              key={opt.id}
              selected={profile.drinking === opt.option_text}
              onClick={() => setProfile({ ...profile, drinking: opt.option_text })}
            >{opt.option_text}</OptionButton>
          ))}
        </Row>
        <Label>학력</Label>
        <Row>
          {EDUCATION_OPTIONS.map((level) => (
            <OptionButton
              key={level}
              selected={profile.education === level}
              onClick={() => setProfile({ ...profile, education: level as EducationLevel })}
            >
              {level}
            </OptionButton>
          ))}
        </Row>
        <Label>결혼상태</Label>
        <Row>
          {getOptions('결혼상태').map((opt) => (
            <OptionButton key={opt.id} selected={profile.marital_status===opt.option_text} onClick={()=>setProfile({...profile, marital_status:opt.option_text})}>{opt.option_text}</OptionButton>
          ))}
        </Row>
        <Label>MBTI</Label>
        <select style={{width:'100%',padding:'12px',borderRadius:6,border:'1px solid #ccc',fontSize:'1rem',height:'48px',marginBottom:'20px'}} value={profile.mbti||''} onChange={e=>setProfile({...profile, mbti:e.target.value})}>
          <option value="">MBTI 선택</option>
          {getOptions('MBTI').map(opt => (
            <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
          ))}
        </select>
        <Label>제 관심사는요 (최대 7개)</Label>
        <SelectButton type="button" onClick={()=>setInterestPopup(true)}>
          {(() => {
            const arr = Array.isArray(profile.interests) ? profile.interests : (profile.interests ? JSON.parse(profile.interests) : []);
            return arr.length > 0 ? arr.join(', ') : '최소 1개 이상 선택해주세요';
          })()}
        </SelectButton>
        <Label>이런 얘기 많이 들어요 (최대 7개)</Label>
        <SelectButton type="button" onClick={()=>setAppearancePopup(true)}>
          {(() => {
            const arr = Array.isArray(profile.appearance) ? profile.appearance : (profile.appearance ? JSON.parse(profile.appearance) : []);
            return arr.length > 0 ? arr.join(', ') : '최소 1개 이상 선택해주세요';
          })()}
        </SelectButton>
        <Label>저는 이런 사람이예요 (최대 7개)</Label>
        <SelectButton type="button" onClick={()=>setPersonalityPopup(true)}>
          {(() => {
            const arr = Array.isArray(profile.personality) ? profile.personality : (profile.personality ? JSON.parse(profile.personality) : []);
            return arr.length > 0 ? arr.join(', ') : '최소 1개 이상 선택해주세요';
          })()}
        </SelectButton>
        <Label>더 표현하고 싶은 나에 대해</Label>
        <Input as="textarea" rows={10} maxLength={100} value={profile.appeal||''} onChange={e=>setProfile({...profile, appeal:e.target.value})} placeholder="100자 이내로 자기소개를 입력하세요" style={{marginBottom:16}} />
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !user?.is_verified}
          style={!user?.is_verified ? {opacity: 0.5, cursor: 'not-allowed'} : {}}
        >
          {isSaving ? '저장 중...' : '저장'}
        </Button>
        <Button 
          type="button" 
          style={{
            background:'#fff',
            color:'#764ba2',
            border:'2px solid #764ba2',
            ...((!user?.is_verified) && {opacity: 0.5, cursor: 'not-allowed'})
          }} 
          onClick={!user?.is_verified ? undefined : ()=>setPwPopup(true)}
          disabled={!user?.is_verified}
        >
          비밀번호 변경
        </Button>
        <DangerButton type="button" onClick={()=>setDelPopup(true)}>회원 탈퇴</DangerButton>
        <Button type="button" style={{background:'#fff',color:'#764ba2',border:'2px solid #764ba2',marginTop:32}} onClick={()=>navigate('/main')}>닫기</Button>
      </Card>
      {/* 주소 선택 모달 */}
      {addressPopup && (
        <AddressSelectModal
          isOpen={addressPopup}
          onClose={()=>setAddressPopup(false)}
          onSelect={(sido, gugun) => {
            setProfile({...profile, residence:`${sido} ${gugun}`});
            setAddressPopup(false);
          }}
          defaultSido={profile.residence?.split(' ')[0]||''}
          defaultGugun={profile.residence?.split(' ')[1]||''}
        />
      )}
      {/* 관심사/외모/성격 선택 모달 */}
      <MultiSelectModal
        isOpen={interestPopup}
        onClose={()=>setInterestPopup(false)}
        options={interestOptions}
        selected={Array.isArray(profile.interests) ? profile.interests : (profile.interests ? JSON.parse(profile.interests) : [])}
        onSelect={vals=>setProfile({...profile, interests: JSON.stringify(vals)})}
        title="관심사 선택"
      />
      <MultiSelectModal
        isOpen={appearancePopup}
        onClose={()=>setAppearancePopup(false)}
        options={appearanceOptions}
        selected={Array.isArray(profile.appearance) ? profile.appearance : (profile.appearance ? JSON.parse(profile.appearance) : [])}
        onSelect={vals=>setProfile({...profile, appearance: JSON.stringify(vals)})}
        title="외모 선택"
      />
      <MultiSelectModal
        isOpen={personalityPopup}
        onClose={()=>setPersonalityPopup(false)}
        options={personalityOptions}
        selected={Array.isArray(profile.personality) ? profile.personality : (profile.personality ? JSON.parse(profile.personality) : [])}
        onSelect={vals=>setProfile({...profile, personality: JSON.stringify(vals)})}
        title="성격 선택"
      />
      {/* 비밀번호 변경 모달 */}
      {pwPopup && (
        <ModalBg>
          <ModalCard>
            <h3 style={{textAlign:'center',marginBottom:16}}>비밀번호 변경</h3>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e=>setCurrentPw(e.target.value)} placeholder="현재 비밀번호" style={{ paddingRight: 40 }} />
              <button
                type="button"
                onClick={() => setShowCurrentPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0 }}
                tabIndex={-1}
                aria-label={showCurrentPw ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showCurrentPw ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Input type={showPw ? 'text' : 'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="새 비밀번호(6자 이상)" style={{ paddingRight: 40 }} />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0 }}
                tabIndex={-1}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Input type={showPw2 ? 'text' : 'password'} value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="새 비밀번호 확인" style={{ paddingRight: 40, borderColor: isPwMatch ? '#27ae60' : isPwNotMatch ? '#e74c3c' : undefined }} />
              <button
                type="button"
                onClick={() => setShowPw2(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0 }}
                tabIndex={-1}
                aria-label={showPw2 ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPw2 ? <FaEyeSlash /> : <FaEye />}
              </button>
              {isPwMatch && <FaCheckCircle style={{ position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)', color: '#27ae60' }} />}
              {isPwNotMatch && <FaTimesCircle style={{ position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)', color: '#e74c3c' }} />}
            </div>
            <Button onClick={handleChangePw}>변경</Button>
            <Button type="button" style={{background:'#fff',color:'#764ba2',border:'2px solid #764ba2'}} onClick={()=>{setCurrentPw('');setPw('');setPw2('');setPwPopup(false);}}>취소</Button>
          </ModalCard>
        </ModalBg>
      )}
      {/* 회원탈퇴 모달 */}
      {delPopup && (
        <ModalBg>
          <ModalCard>
            <h3 style={{textAlign:'center',marginBottom:16}}>회원 탈퇴</h3>
            <p style={{color:'#e74c3c',marginBottom:16}}>정말로 탈퇴하시려면 비밀번호를 입력하세요.</p>
            <Input type="password" value={delPw} onChange={e=>setDelPw(e.target.value)} placeholder="비밀번호" />
            <DangerButton onClick={handleDelete}>탈퇴</DangerButton>
            <Button type="button" style={{background:'#fff',color:'#764ba2',border:'2px solid #764ba2'}} onClick={()=>setDelPopup(false)}>취소</Button>
          </ModalCard>
        </ModalBg>
      )}
    </MainContainer>
  );
};

export default ProfilePage; 