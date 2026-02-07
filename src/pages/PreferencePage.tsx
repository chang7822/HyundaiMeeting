import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfileCategories, getProfileOptions, userApi, companyApi } from '../services/api.ts';
import { ProfileCategory, ProfileOption, Company, EDUCATION_OPTIONS } from '../types/index.ts';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext.tsx';
import InlineSpinner from '../components/InlineSpinner.tsx';
import PreferredCompanyModal from '../components/PreferredCompanyModal.tsx';
import PreferredRegionModal from '../components/PreferredRegionModal.tsx';
import PreferenceMultiSelectModal from '../components/PreferenceMultiSelectModal.tsx';

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
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
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
const NoPreferenceButton = styled.button<{ selected: boolean }>`
  background: ${props => props.selected ? '#764ba2' : '#f7f7fa'};
  color: ${props => props.selected ? '#fff' : '#333'};
  border: 1.5px solid #764ba2;
  border-radius: 8px;
  padding: 8px 16px;
  margin: 4px 4px 0 0;
  cursor: pointer;
  font-size: 1rem;
  width: 100%;
  margin-bottom: 8px;
`;
const BodyTypeContainer = styled.div`
  margin-bottom: 32px;
`;
const LastBodyTypeContainer = styled(BodyTypeContainer)`
  margin-bottom: 0;
`;
const BodyTypeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0;
  margin-bottom: 32px;
`;
const CompanySection = styled.div`
  margin-bottom: 32px;
`;
const CompanyOpenButton = styled.button`
  width: 100%;
  background: #f5f3ff;
  color: #4f46e5;
  border: 1.5px solid #a5b4fc;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: #e0e7ff;
    border-color: #818cf8;
  }
`;
const CompanySummaryText = styled.div`
  margin-top: 6px;
  padding-left: 2px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #4f46e5;
`;

const RegionSection = styled.div`
  margin-bottom: 32px;
`;

const RegionOpenButton = styled.button`
  width: 100%;
  background: #f5f3ff;
  color: #4f46e5;
  border: 1.5px solid #a5b4fc;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: #e0e7ff;
    border-color: #818cf8;
  }
`;

const RegionSummaryText = styled.div`
  margin-top: 6px;
  padding-left: 2px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #4f46e5;
`;
const BodyTypeButton = styled.button<{ selected: boolean; fullwidth?: boolean }>`
  background: ${props => props.selected ? '#764ba2' : '#f7f7fa'};
  color: ${props => props.selected ? '#fff' : '#333'};
  border: 1.5px solid #764ba2;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  min-width: 80px;
  text-align: center;
  ${props => props.fullwidth && 'width:100%;'}
  &:hover {
    background: ${props => props.selected ? '#764ba2' : '#e8e8e8'};
  }
`;
const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  font-size: 0.8rem;
  color: #666;
`;
const RangeValue = styled.div`
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #764ba2;
  margin: 10px 0;
`;
const SectionTitle = styled(Label)`
  margin-bottom: 10px;
`;
const AgeRangeContainer = styled.div`
  margin-bottom: 32px;
  padding: 0 16px;
`;
const HeightRangeContainer = styled.div`
  margin-bottom: 32px;
  padding: 0 16px;
`;
const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 32px;
`;

// 타입 정의
type PreferenceType = {
  ageMin: number;
  ageMax: number;
  heightMin: number;
  heightMax: number;
  preferredBodyTypes: string[];
  preferredEducations: string[];
  preferAgeNoPreference: boolean;
  preferHeightNoPreference: boolean;
  preferBodyTypeNoPreference: boolean;
  preferEducationNoPreference: boolean;
};

const PreferencePage = ({ sidebarOpen }: { sidebarOpen: boolean }) => {
  const navigate = useNavigate();
  const { profile, setProfile } = useAuth();
  const userGender = sessionStorage.getItem('userGender') as 'male' | 'female' | null;
  const userBirthYear = sessionStorage.getItem('userBirthYear');
  const [categories, setCategories] = useState<ProfileCategory[]>([]);
  const [options, setOptions] = useState<ProfileOption[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [loading, setLoading] = React.useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    setLoading(true);
    // 내 성별을 sessionStorage에 저장(없으면)
    userApi.getMe()
      .then(profile => {
        if (profile.gender && !sessionStorage.getItem('userGender')) {
          sessionStorage.setItem('userGender', profile.gender);
        }
        // 출생연도도 세션에 없으면 저장
        if (profile.birth_year && !sessionStorage.getItem('userBirthYear')) {
          sessionStorage.setItem('userBirthYear', String(profile.birth_year));
        }
      })
      .catch(() => {});
    getProfileCategories().then(data => { setCategories(data); setCategoriesLoaded(true); });
    getProfileOptions().then(data => { setOptions(data); setOptionsLoaded(true); });
    // 선호 회사 이름 매핑용 회사 목록 로드
    companyApi.getCompanies().then(setCompanies).catch(() => {
      // 회사 목록 로드 실패 시에도 페이지는 계속 동작하게 둔다.
    });
  }, []);

  const oppositeGender = userGender === 'male' ? 'female' : userGender === 'female' ? 'male' : null;
  const bodyTypeCategory = categories.find(cat => cat.name === '체형' && (cat.gender === oppositeGender || cat.gender === 'common'));
  const bodyTypeOptions = bodyTypeCategory ? options.filter(opt => opt.category_id === bodyTypeCategory.id).map(opt => opt.option_text) : [];
  const [ageMin, setAgeMin] = useState(-10);
  const [ageMax, setAgeMax] = useState(10);
  const [heightMin, setHeightMin] = useState(150);
  const [heightMax, setHeightMax] = useState(199);
  const [preferredBodyTypes, setPreferredBodyTypes] = useState<string[]>([]);
  const [preferredEducations, setPreferredEducations] = useState<string[]>([]);
  const [preferAgeNoPreference, setPreferAgeNoPreference] = useState(false);
  const [preferHeightNoPreference, setPreferHeightNoPreference] = useState(false);
  const [preferBodyTypeNoPreference, setPreferBodyTypeNoPreference] = useState(false);
  const [preferEducationNoPreference, setPreferEducationNoPreference] = useState(false);

  // 1. 상태 추가
  const [preferredMaritalStatuses, setPreferredMaritalStatuses] = useState<string[]>([]);
  const [preferMaritalNoPreference, setPreferMaritalNoPreference] = useState(false);
  const [preferCompanyIds, setPreferCompanyIds] = useState<string[]>([]);
  const [preferCompanyNames, setPreferCompanyNames] = useState<string[]>([]);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [preferRegions, setPreferRegions] = useState<string[]>([]);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isBodyTypeModalOpen, setIsBodyTypeModalOpen] = useState(false);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [isMaritalModalOpen, setIsMaritalModalOpen] = useState(false);

  // 2. 결혼상태 옵션 추출
  const maritalCategory = categories.find(cat => cat.name === '결혼상태');
  const maritalOptions = maritalCategory ? options.filter(opt => opt.category_id === maritalCategory.id).map(opt => opt.option_text) : [];

  // 복원 useEffect
  useEffect(() => {
    if (!categoriesLoaded || !optionsLoaded) return;
    // 1. 서버에서 내 선호 스타일 불러오기
    userApi.getMe().then(profile => {
      // 서버값 → 상태 반영
      if (typeof profile.preferred_age_min === 'number') setAgeMin(profile.preferred_age_min);
      if (typeof profile.preferred_age_max === 'number') setAgeMax(profile.preferred_age_max);
      if (typeof profile.preferred_height_min === 'number') setHeightMin(profile.preferred_height_min);
      if (typeof profile.preferred_height_max === 'number') setHeightMax(profile.preferred_height_max);
      if (typeof profile.preferred_body_types === 'string') {
        try { setPreferredBodyTypes(JSON.parse(profile.preferred_body_types)); } catch { setPreferredBodyTypes([]); }
      }
      if (typeof profile.preferred_educations === 'string') {
        try { setPreferredEducations(JSON.parse(profile.preferred_educations)); } catch { setPreferredEducations([]); }
      }
      // no preference 여부
      setPreferAgeNoPreference(profile.preferred_age_min === -99 && profile.preferred_age_max === 99);
      setPreferHeightNoPreference(profile.preferred_height_min === 150 && profile.preferred_height_max === 199);
      setPreferBodyTypeNoPreference(Array.isArray(profile.preferred_body_types) && profile.preferred_body_types.length === 0);
      setPreferEducationNoPreference(Array.isArray(profile.preferred_educations) && profile.preferred_educations.length === 0);
      // 3. 결혼상태 추가
      if (typeof profile.preferred_marital_statuses === 'string') {
        try { setPreferredMaritalStatuses(JSON.parse(profile.preferred_marital_statuses)); } catch { setPreferredMaritalStatuses([]); }
      }
      setPreferMaritalNoPreference(Array.isArray(profile.preferred_marital_statuses) && profile.preferred_marital_statuses.length === 0);
      // 4. 선호 회사 id 배열 복원 (이름은 모달에서 다시 선택 시 세팅)
      if (Array.isArray(profile.prefer_company)) {
        setPreferCompanyIds(profile.prefer_company.map((id: number) => String(id)));
      }
      // 5. 선호 지역 배열 복원 (시/도)
      if (Array.isArray(profile.prefer_region)) {
        setPreferRegions(profile.prefer_region);
      }
    }).finally(() => setLoading(false));
    // 2. sessionStorage 값이 있으면 덮어쓰기
    const saved = sessionStorage.getItem('userPreferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.ageMin === 'number' && typeof parsed.ageMax === 'number') {
          setAgeMin(parsed.ageMin);
          setAgeMax(parsed.ageMax);
          setPreferAgeNoPreference(parsed.ageMin === -99 && parsed.ageMax === 99);
        }
        if (typeof parsed.heightMin === 'number') setHeightMin(parsed.heightMin);
        if (typeof parsed.heightMax === 'number') setHeightMax(parsed.heightMax);
        if (Array.isArray(parsed.preferredBodyTypes)) setPreferredBodyTypes(parsed.preferredBodyTypes);
        if (Array.isArray(parsed.preferredEducations)) setPreferredEducations(parsed.preferredEducations);
        if (typeof parsed.preferHeightNoPreference === 'boolean') setPreferHeightNoPreference(parsed.preferHeightNoPreference);
        if (typeof parsed.preferBodyTypeNoPreference === 'boolean') setPreferBodyTypeNoPreference(parsed.preferBodyTypeNoPreference);
        if (typeof parsed.preferJobTypeNoPreference === 'boolean') setPreferJobTypeNoPreference(parsed.preferJobTypeNoPreference);
        if (Array.isArray(parsed.preferredMaritalStatuses)) setPreferredMaritalStatuses(parsed.preferredMaritalStatuses);
        if (typeof parsed.preferMaritalNoPreference === 'boolean') setPreferMaritalNoPreference(parsed.preferMaritalNoPreference);
        if (Array.isArray(parsed.preferCompanyIds)) {
          setPreferCompanyIds(parsed.preferCompanyIds);
        }
        if (Array.isArray(parsed.preferCompanyNames)) {
          setPreferCompanyNames(parsed.preferCompanyNames);
        }
        if (Array.isArray(parsed.preferRegions)) {
          setPreferRegions(parsed.preferRegions);
        }
      } catch {}
    }
  }, [categoriesLoaded, optionsLoaded]);

  // 프로필 및 회사 목록이 준비되면, 저장된 선호 회사 id를 이름으로 매핑해 요약 표시
  useEffect(() => {
    if (!companies.length) return;
    // 이미 모달에서 이름을 세팅했다면 다시 계산할 필요 없음
    if (preferCompanyNames.length > 0) return;
    // 컨텍스트 profile 혹은 서버에서 복원된 preferCompanyIds 기준으로 이름 매핑
    const ids =
      (profile && Array.isArray((profile as any).prefer_company))
        ? (profile as any).prefer_company as number[]
        : preferCompanyIds.map(id => parseInt(id, 10)).filter(n => !Number.isNaN(n));
    if (!ids || ids.length === 0) return;
    const names = ids
      .map(id => {
        const found = companies.find(c => Number(c.id) === id);
        return found?.name;
      })
      .filter((name): name is string => !!name);
    if (names.length > 0) {
      setPreferCompanyIds(ids.map(id => String(id)));
      setPreferCompanyNames(names);
    }
  }, [companies, profile, preferCompanyIds, preferCompanyNames.length]);

  // [추가] 모든 옵션 선택 시 '상관없음' 버튼 자동 활성화 useEffect
  useEffect(() => {
    // 체형
    if (bodyTypeOptions.length > 0 && preferredBodyTypes.length === bodyTypeOptions.length) {
      if (!preferBodyTypeNoPreference) setPreferBodyTypeNoPreference(true);
    } else {
      if (preferBodyTypeNoPreference && preferredBodyTypes.length !== bodyTypeOptions.length) setPreferBodyTypeNoPreference(false);
    }
    // 학력
    if (EDUCATION_OPTIONS.length > 0 && preferredEducations.length === EDUCATION_OPTIONS.length) {
      if (!preferEducationNoPreference) setPreferEducationNoPreference(true);
    } else {
      if (preferEducationNoPreference && preferredEducations.length !== EDUCATION_OPTIONS.length) setPreferEducationNoPreference(false);
    }
    // 결혼상태
    if (maritalOptions.length > 0 && preferredMaritalStatuses.length === maritalOptions.length) {
      if (!preferMaritalNoPreference) setPreferMaritalNoPreference(true);
    } else {
      if (preferMaritalNoPreference && preferredMaritalStatuses.length !== maritalOptions.length) setPreferMaritalNoPreference(false);
    }
  }, [preferredBodyTypes, preferredEducations, preferredMaritalStatuses, bodyTypeOptions, maritalOptions]);

  const companySummary = useMemo(() => {
    if (preferCompanyNames.length === 0) return '';
    const count = preferCompanyNames.length;
    const preview = preferCompanyNames.slice(0, 3);
    if (count <= 3) {
      return `${preview.join(', ')} (${count})`;
    }
    return `${preview.join(', ')} 등 (${count})`;
  }, [preferCompanyNames]);

  const regionSummary = useMemo(() => {
    if (preferRegions.length === 0) return '';
    const count = preferRegions.length;
    const preview = preferRegions.slice(0, 3);
    if (count <= 3) {
      return `${preview.join(', ')} (${count})`;
    }
    return `${preview.join(', ')} 등 (${count})`;
  }, [preferRegions]);

  // 저장
  const handleSave = async () => {
    // 선호 회사 필수
    if (preferCompanyIds.length === 0) {
      toast.error('선호 회사를 선택해주세요');
      return;
    }
    // 선호 지역 필수
    if (preferRegions.length === 0) {
      toast.error('선호 지역을 선택해주세요');
      return;
    }
    if (!preferAgeNoPreference && ageMin === ageMax) {
      toast.error('선호 나이 차이 범위를 설정해주세요');
      return;
    }
    if (!preferHeightNoPreference && heightMin === heightMax) {
      toast.error('선호 키 범위를 설정해주세요');
      return;
    }
    // 선호 체형 최소 3개 선택
    if (!preferBodyTypeNoPreference && preferredBodyTypes.length < 3) {
      toast.error('선호 체형은 최소 3개 이상 선택해주세요');
      return;
    }
    if (!preferEducationNoPreference && preferredEducations.length === 0) {
      toast.error('선호 학력을 선택해주세요');
      return;
    }
    if (!preferMaritalNoPreference && preferredMaritalStatuses.length === 0) {
      toast.error('선호 결혼상태를 선택해주세요');
      return;
    }
    // 서버에 저장
    try {
      await userApi.updateMe({
        preferred_age_min: ageMin,
        preferred_age_max: ageMax,
        preferred_height_min: heightMin,
        preferred_height_max: heightMax,
        preferred_body_types: JSON.stringify(preferredBodyTypes),
        preferred_educations: JSON.stringify(preferredEducations),
        preferred_marital_statuses: JSON.stringify(preferredMaritalStatuses),
        prefer_company: preferCompanyIds
          .map(id => parseInt(id, 10))
          .filter(n => !Number.isNaN(n)),
        prefer_region: preferRegions,
      });
      // [추가] 저장 후 최신 프로필 fetch 및 setProfile로 갱신
      const latestProfile = await userApi.getMe();
      setProfile(latestProfile);
      toast.success('선호 스타일이 저장되었습니다!');
      navigate('/main');
    } catch (err) {
      toast.error('저장에 실패했습니다.');
    }
  };

  // 체형 선택 핸들러
  const handleBodyTypeToggle = (bodyType: string) => {
    if (bodyType === '상관없음') {
      setPreferBodyTypeNoPreference(!preferBodyTypeNoPreference);
      setPreferredBodyTypes(preferBodyTypeNoPreference ? [] : bodyTypeOptions);
    } else {
      setPreferredBodyTypes(prev => {
        const next = prev.includes(bodyType)
          ? prev.filter(type => type !== bodyType)
          : [...prev, bodyType];
        // [추가] 모든 옵션 선택 시 상관없음 true, 아니면 false
        if (bodyTypeOptions.length > 0 && next.length === bodyTypeOptions.length) setPreferBodyTypeNoPreference(true);
        else setPreferBodyTypeNoPreference(false);
        return next;
      });
    }
  };
  const handleEducationToggle = (level: string) => {
    if (level === '상관없음') {
      setPreferEducationNoPreference(!preferEducationNoPreference);
      setPreferredEducations(preferEducationNoPreference ? [] : [...EDUCATION_OPTIONS]);
    } else {
      setPreferredEducations(prev => {
        const next = prev.includes(level)
          ? prev.filter(x => x !== level)
          : [...prev, level];
        if (EDUCATION_OPTIONS.length > 0 && next.length === EDUCATION_OPTIONS.length) setPreferEducationNoPreference(true);
        else setPreferEducationNoPreference(false);
        return next;
      });
    }
  };
  // 결혼상태 toggle도 동일하게 적용
  const handleMaritalStatusToggle = (status: string) => {
    setPreferredMaritalStatuses(prev => {
      const next = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
      if (maritalOptions.length > 0 && next.length === maritalOptions.length) setPreferMaritalNoPreference(true);
      else setPreferMaritalNoPreference(false);
      return next;
    });
  };

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <Card>
        {loading && (
          <CardOverlay>
            <InlineSpinner text="선호 정보를 불러오는 중입니다..." />
          </CardOverlay>
        )}
        <CloseButton onClick={() => navigate('/main')} title="닫기"><FaTimes /></CloseButton>
        <Title>내가 선호하는 스타일</Title>
        {/* 선호 나이 */}
        <Label>
          선호 나이
          {userBirthYear ? ` (본인 출생연도 : ${userBirthYear} 기준)` : ' (본인 출생연도 기준)'}
        </Label>
        <NoPreferenceButton 
          selected={preferAgeNoPreference}
          onClick={() => {
            if (!preferAgeNoPreference) {
              setAgeMin(-99);
              setAgeMax(99);
            } else {
              setAgeMin(-10);
              setAgeMax(10);
            }
            setPreferAgeNoPreference(!preferAgeNoPreference);
          }}
        >
          상관없음
        </NoPreferenceButton>
        {!preferAgeNoPreference && (
          <>
            <Slider
              range
              min={-10}
              max={10}
              value={[ageMin, ageMax]}
              onChange={value => {
                if (Array.isArray(value)) {
                  setAgeMin(value[0]);
                  setAgeMax(value[1]);
                }
              }}
              trackStyle={[{ backgroundColor: '#764ba2', height: 12 }]}
              handleStyle={[
                { width: 32, height: 32, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -10, opacity: 1, boxShadow: '0 2px 4px #764ba2' },
                { width: 32, height: 32, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -10, opacity: 1, boxShadow: '0 2px 4px #764ba2' }
              ]}
              railStyle={{ backgroundColor: '#e0e0e0', height: 12 }}
            />
            <RangeLabels>
              <span>10살 연하</span>
              <span>5살 연하</span>
              <span>동갑</span>
              <span>5살 연상</span>
              <span>10살 연상</span>
            </RangeLabels>
            <RangeValue>
              {ageMin < 0 ? `${Math.abs(ageMin)}살 연하` : ageMin === 0 ? '동갑' : `${ageMin}살 연상`} ~ {ageMax < 0 ? `${Math.abs(ageMax)}살 연하` : ageMax === 0 ? '동갑' : `${ageMax}살 연상`}
            </RangeValue>
          </>
        )}
        {/* 선호 키 */}
        <Label>선호 키</Label>
        <NoPreferenceButton 
          selected={preferHeightNoPreference}
          onClick={() => {
            if (!preferHeightNoPreference) {
              setHeightMin(150);
              setHeightMax(199);
            }
            setPreferHeightNoPreference(!preferHeightNoPreference);
          }}
        >
          상관없음
        </NoPreferenceButton>
        {!preferHeightNoPreference && (
          <>
            <Slider
              range
              min={150}
              max={199}
              value={[heightMin, heightMax]}
              onChange={value => {
                if (Array.isArray(value)) {
                  setHeightMin(value[0]);
                  setHeightMax(value[1]);
                }
              }}
              trackStyle={[{ backgroundColor: '#764ba2', height: 12 }]}
              handleStyle={[
                { width: 32, height: 32, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -10, opacity: 1, boxShadow: '0 2px 4px #764ba2' },
                { width: 32, height: 32, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -10, opacity: 1, boxShadow: '0 2px 4px #764ba2' }
              ]}
              railStyle={{ backgroundColor: '#e0e0e0', height: 12 }}
            />
            <RangeLabels>
              <span>150cm</span>
              <span>160cm</span>
              <span>170cm</span>
              <span>180cm</span>
              <span>190cm</span>
              <span>199cm</span>
            </RangeLabels>
            <RangeValue>
              {heightMin}cm ~ {heightMax}cm
            </RangeValue>
          </>
        )}
        {/* 선호 체형 */}
        <BodyTypeContainer>
          <SectionTitle>선호 체형 (최소 3개)</SectionTitle>
          <CompanySection>
            <CompanyOpenButton type="button" onClick={() => setIsBodyTypeModalOpen(true)}>
              <span>{preferredBodyTypes.length === 0 && !preferBodyTypeNoPreference ? '선호 체형을 선택해주세요' : '선호 체형 다시 선택하기'}</span>
              <span>선택하기</span>
            </CompanyOpenButton>
            {(!preferredBodyTypes.length && !preferBodyTypeNoPreference) ? (
              <CompanySummaryText style={{ color: '#ef4444' }}>
                아직 선호 체형을 선택하지 않았어요.
              </CompanySummaryText>
            ) : (
              <CompanySummaryText>
                {preferBodyTypeNoPreference
                  ? '모든 체형 (상관없음)'
                  : (() => {
                      const count = preferredBodyTypes.length;
                      const preview = preferredBodyTypes.slice(0, 3);
                      if (count <= 3) return `${preview.join(', ')} (${count})`;
                      return `${preview.join(', ')} 등 (${count})`;
                    })()}
              </CompanySummaryText>
            )}
          </CompanySection>
        </BodyTypeContainer>
        {/* 선호 회사 */}
        <BodyTypeContainer>
          <SectionTitle>선호 회사 (중복 선택 가능)</SectionTitle>
          <CompanySection>
            <CompanyOpenButton type="button" onClick={() => setIsCompanyModalOpen(true)}>
              <span>{preferCompanyIds.length === 0 ? '선호 회사를 선택해주세요' : '선호 회사 다시 선택하기'}</span>
              <span>선택하기</span>
            </CompanyOpenButton>
            {preferCompanyIds.length === 0 ? (
              <CompanySummaryText style={{ color: '#ef4444' }}>
                아직 선호 회사를 선택하지 않았어요.
              </CompanySummaryText>
            ) : (
              companySummary && <CompanySummaryText>{companySummary}</CompanySummaryText>
            )}
          </CompanySection>
        </BodyTypeContainer>
        {/* 선호 학력 */}
        <BodyTypeContainer>
          <SectionTitle>선호 학력 (중복 선택 가능)</SectionTitle>
          <CompanySection>
            <CompanyOpenButton type="button" onClick={() => setIsEducationModalOpen(true)}>
              <span>{preferredEducations.length === 0 && !preferEducationNoPreference ? '선호 학력을 선택해주세요' : '선호 학력 다시 선택하기'}</span>
              <span>선택하기</span>
            </CompanyOpenButton>
            {(!preferredEducations.length && !preferEducationNoPreference) ? (
              <CompanySummaryText style={{ color: '#ef4444' }}>
                아직 선호 학력을 선택하지 않았어요.
              </CompanySummaryText>
            ) : (
              <CompanySummaryText>
                {preferEducationNoPreference
                  ? '모든 학력 (상관없음)'
                  : (() => {
                      const count = preferredEducations.length;
                      const preview = preferredEducations.slice(0, 3);
                      if (count <= 3) return `${preview.join(', ')} (${count})`;
                      return `${preview.join(', ')} 등 (${count})`;
                    })()}
              </CompanySummaryText>
            )}
          </CompanySection>
        </BodyTypeContainer>

        {/* 선호 지역 */}
        <RegionSection>
          <SectionTitle>선호 지역 (중복 선택 가능)</SectionTitle>
          <RegionOpenButton type="button" onClick={() => setIsRegionModalOpen(true)}>
            <span>{preferRegions.length === 0 ? '선호 지역을 선택해주세요' : '선호 지역 다시 선택하기'}</span>
            <span>선택하기</span>
          </RegionOpenButton>
          {preferRegions.length === 0 ? (
            <RegionSummaryText style={{ color: '#ef4444' }}>
              아직 선호 지역을 선택하지 않았어요.
            </RegionSummaryText>
          ) : (
            <RegionSummaryText>{regionSummary}</RegionSummaryText>
          )}
        </RegionSection>

        {/* 선호 결혼상태 */}
        <LastBodyTypeContainer>
          <SectionTitle style={{marginTop: 0}}>선호 결혼상태 (중복 선택 가능)</SectionTitle>
          <CompanySection>
            <CompanyOpenButton type="button" onClick={() => setIsMaritalModalOpen(true)}>
              <span>{preferredMaritalStatuses.length === 0 && !preferMaritalNoPreference ? '선호 결혼상태를 선택해주세요' : '선호 결혼상태 다시 선택하기'}</span>
              <span>선택하기</span>
            </CompanyOpenButton>
            {(!preferredMaritalStatuses.length && !preferMaritalNoPreference) ? (
              <CompanySummaryText style={{ color: '#ef4444' }}>
                아직 선호 결혼상태를 선택하지 않았어요.
              </CompanySummaryText>
            ) : (
              <CompanySummaryText>
                {preferMaritalNoPreference
                  ? '모든 결혼상태 (상관없음)'
                  : (() => {
                      const count = preferredMaritalStatuses.length;
                      const preview = preferredMaritalStatuses.slice(0, 3);
                      if (count <= 3) return `${preview.join(', ')} (${count})`;
                      return `${preview.join(', ')} 등 (${count})`;
                    })()}
              </CompanySummaryText>
            )}
          </CompanySection>
        </LastBodyTypeContainer>
        {/* 저장/닫기 버튼 영역 */}
        <ButtonRow>
          <Button onClick={handleSave}>저장</Button>
          <Button style={{ background: '#eee', color: '#333' }} onClick={() => navigate('/main')}>닫기</Button>
        </ButtonRow>
      </Card>
      <PreferredCompanyModal
        isOpen={isCompanyModalOpen}
        initialSelectedIds={preferCompanyIds}
        onClose={() => setIsCompanyModalOpen(false)}
        onConfirm={(ids, names) => {
          setPreferCompanyIds(ids);
          setPreferCompanyNames(names);
          setIsCompanyModalOpen(false);
        }}
      />
      <PreferredRegionModal
        isOpen={isRegionModalOpen}
        initialSelectedRegions={preferRegions}
        onClose={() => setIsRegionModalOpen(false)}
        onConfirm={(regions) => {
          setPreferRegions(regions);
          setIsRegionModalOpen(false);
        }}
      />
      <PreferenceMultiSelectModal
        isOpen={isBodyTypeModalOpen}
        title="선호 체형 선택"
        description="매칭 시 참고되는 선호 체형을 선택해주세요. 상단의 상관없음 버튼을 누르면 모든 체형을 선호하는 것으로 처리돼요."
        options={bodyTypeOptions}
        initialSelected={preferredBodyTypes}
        initialNoPreference={preferBodyTypeNoPreference}
        minCount={3}
        anyInactiveLabel="상관없음 (모든 체형 선택)"
        anyActiveLabel="모든 체형 선택 해제"
        onClose={() => setIsBodyTypeModalOpen(false)}
        onConfirm={(selected, noPref) => {
          setPreferBodyTypeNoPreference(noPref);
          setPreferredBodyTypes(selected);
          setIsBodyTypeModalOpen(false);
        }}
      />
      <PreferenceMultiSelectModal
        isOpen={isEducationModalOpen}
        title="선호 학력 선택"
        description="매칭 시 참고되는 선호 학력을 선택해주세요. 상단의 상관없음 버튼을 누르면 모든 학력을 선호하는 것으로 처리돼요."
        options={EDUCATION_OPTIONS}
        initialSelected={preferredEducations}
        initialNoPreference={preferEducationNoPreference}
        minCount={1}
        anyInactiveLabel="상관없음 (모든 학력 선택)"
        anyActiveLabel="모든 학력 선택 해제"
        onClose={() => setIsEducationModalOpen(false)}
        onConfirm={(selected, noPref) => {
          setPreferEducationNoPreference(noPref);
          setPreferredEducations(selected);
          setIsEducationModalOpen(false);
        }}
      />
      <PreferenceMultiSelectModal
        isOpen={isMaritalModalOpen}
        title="선호 결혼상태 선택"
        description="매칭 시 참고되는 선호 결혼상태를 선택해주세요. 상단의 상관없음 버튼을 누르면 모든 결혼상태를 선호하는 것으로 처리돼요."
        options={maritalOptions}
        initialSelected={preferredMaritalStatuses}
        initialNoPreference={preferMaritalNoPreference}
        minCount={1}
        anyInactiveLabel="상관없음 (모든 결혼상태 선택)"
        anyActiveLabel="모든 결혼상태 선택 해제"
        onClose={() => setIsMaritalModalOpen(false)}
        onConfirm={(selected, noPref) => {
          setPreferMaritalNoPreference(noPref);
          setPreferredMaritalStatuses(selected);
          setIsMaritalModalOpen(false);
        }}
      />
    </MainContainer>
  );
};

export default PreferencePage; 