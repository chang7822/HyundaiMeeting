import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfileCategories, getProfileOptions } from '../../services/api.ts';
import { ProfileCategory, ProfileOption } from '../../types/index.ts';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { FaArrowLeft } from 'react-icons/fa';
import PreferredCompanyModal from '../../components/PreferredCompanyModal.tsx';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 0 80px 0;
`;

const Section = styled.div`
  background: #fff;
  border-radius: 16px;
  margin: 16px auto;
  padding: 24px 16px;
  max-width: 480px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
`;

const Title = styled.h2`
  font-size: 1.2rem;
  margin-bottom: 12px;
  text-align: center;
  color: #333;
`;

const Label = styled.label`
  font-size: 1rem;
  margin-bottom: 8px;
  display: block;
  font-weight: 600;
  color: #333;
`;

const AgeRangeContainer = styled.div`
  margin-bottom: 24px;
  padding: 0 16px;
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
  
`;

const HeightRangeContainer = styled.div`
  margin-bottom: 24px;
  padding: 0 16px;
`;

const BodyTypeContainer = styled.div`
  margin-bottom: 24px;
`;

const BodyTypeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const CompanySection = styled.div`
  margin-bottom: 24px;
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
  padding-left: 30px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #4f46e5;
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

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  width: 100%;
`;

const sliderStyle = {
  trackStyle: [{ backgroundColor: '#764ba2', height: 12 }],
  handleStyle: [
    { width: 32, height: 32, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -10, opacity: 1, boxShadow: '0 2px 4px #764ba2' },
    { width: 32, height: 32, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -10, opacity: 1, boxShadow: '0 2px 4px #764ba2' }
  ],
  railStyle: { backgroundColor: '#e0e0e0', height: 12 },
};

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

// 1. 타입 정의 (PreferenceType)
type PreferenceType = {
  ageMin: number;
  ageMax: number;
  heightMin: number;
  heightMax: number;
  preferredBodyTypes: string[];
  preferredJobTypes: string[];
  preferAgeNoPreference: boolean;
  preferHeightNoPreference: boolean;
  preferBodyTypeNoPreference: boolean;
  preferJobTypeNoPreference: boolean;
};

const PreferenceSetupPage = () => {
  const navigate = useNavigate();
  
  // 성별 정보 가져오기
  const userGender = sessionStorage.getItem('userGender') as 'male' | 'female' | null;
  
  // DB에서 불러온 카테고리/옵션
  const [categories, setCategories] = useState<ProfileCategory[]>([]);
  const [options, setOptions] = useState<ProfileOption[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  
  useEffect(() => {
    getProfileCategories().then(data => { setCategories(data); setCategoriesLoaded(true); });
    getProfileOptions().then(data => { setOptions(data); setOptionsLoaded(true); });
  }, []);

  // 옵션 계산 (카테고리/옵션 모두 로드된 후에만)
  const oppositeGender = userGender === 'male' ? 'female' : 'male';
  const bodyTypeCategory = categories.find(cat =>
    cat.name === '체형' && cat.gender === oppositeGender
  );
  const bodyTypeOptions = bodyTypeCategory
    ? options.filter(opt => opt.category_id === bodyTypeCategory.id).map(opt => opt.option_text)
    : [];
  const jobTypeCategory = categories.find(cat => cat.name === '직군');
  const jobTypeOptions = jobTypeCategory
    ? options.filter(opt => opt.category_id === jobTypeCategory.id).map(opt => opt.option_text)
    : [];
  
  // 2. 모든 입력값을 각각 useState로 관리
  const [ageMin, setAgeMin] = useState(-10); // 기본값: 10살 연하
  const [ageMax, setAgeMax] = useState(10);  // 기본값: 10살 연상
  const [heightMin, setHeightMin] = useState(150);
  const [heightMax, setHeightMax] = useState(199);
  const [preferredBodyTypes, setPreferredBodyTypes] = useState<string[]>([]);
  const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);
  const [preferAgeNoPreference, setPreferAgeNoPreference] = useState(false);
  const [preferHeightNoPreference, setPreferHeightNoPreference] = useState(false);
  const [preferBodyTypeNoPreference, setPreferBodyTypeNoPreference] = useState(false);
  const [preferJobTypeNoPreference, setPreferJobTypeNoPreference] = useState(false);
  const [preferredMaritalStatuses, setPreferredMaritalStatuses] = useState<string[]>([]);
  const [preferMaritalNoPreference, setPreferMaritalNoPreference] = useState(false);
  const [preferCompanyIds, setPreferCompanyIds] = useState<string[]>([]);
  const [preferCompanyNames, setPreferCompanyNames] = useState<string[]>([]);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  // 3. savePreferenceData 함수
  const savePreferenceData = (
    next: Partial<
      PreferenceType & {
        preferredMaritalStatuses: string[];
        preferMaritalNoPreference: boolean;
        preferCompanyIds: string[];
        preferCompanyNames: string[];
      }
    > = {},
  ) => {
    const data = {
      ageMin, ageMax, heightMin, heightMax,
      preferredBodyTypes, preferredJobTypes,
      preferAgeNoPreference, preferHeightNoPreference,
      preferBodyTypeNoPreference, preferJobTypeNoPreference,
      preferredMaritalStatuses, preferMaritalNoPreference,
      preferCompanyIds,
      preferCompanyNames,
      ...next
    };
    sessionStorage.setItem('userPreferences', JSON.stringify(data));
  };

  // 복원 useEffect (카테고리/옵션 모두 로드된 후에만 실행)
  useEffect(() => {
    if (!categoriesLoaded || !optionsLoaded) return;
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
        if (Array.isArray(parsed.preferredJobTypes)) setPreferredJobTypes(parsed.preferredJobTypes);
        if (typeof parsed.preferHeightNoPreference === 'boolean') setPreferHeightNoPreference(parsed.preferHeightNoPreference);
        if (typeof parsed.preferBodyTypeNoPreference === 'boolean') setPreferBodyTypeNoPreference(parsed.preferBodyTypeNoPreference);
        if (typeof parsed.preferJobTypeNoPreference === 'boolean') setPreferJobTypeNoPreference(parsed.preferJobTypeNoPreference);
        if (Array.isArray(parsed.preferredMaritalStatuses)) setPreferredMaritalStatuses(parsed.preferredMaritalStatuses);
        if (typeof parsed.preferMaritalNoPreference === 'boolean') setPreferMaritalNoPreference(parsed.preferMaritalNoPreference);
        if (Array.isArray(parsed.preferCompanyIds)) setPreferCompanyIds(parsed.preferCompanyIds);
        if (Array.isArray(parsed.preferCompanyNames)) setPreferCompanyNames(parsed.preferCompanyNames);
      } catch {}
    }
  }, [categoriesLoaded, optionsLoaded]);

  // 나이 슬라이더 이벤트 핸들러
  const handleAgeMouseDown = (e: React.MouseEvent, thumb: 'min' | 'max') => {
    // console.log('Age mouse down:', thumb); // 디버깅용
    e.preventDefault();
    e.stopPropagation();
    setIsAgeDragging(thumb);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!ageSliderRef.current) return;
      
      const rect = ageSliderRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const value = Math.round((percent / 100) * 30 + 20);
      
      if (thumb === 'min') {
        setAgeMin(Math.min(value, ageMax - 1));
      } else {
        setAgeMax(Math.max(value, ageMin + 1));
      }
    };
    
    const handleMouseUp = () => {
      setIsAgeDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 키 슬라이더 이벤트 핸들러
  const handleHeightMouseDown = (e: React.MouseEvent, thumb: 'min' | 'max') => {
    e.preventDefault();
    e.stopPropagation();
    // console.log('Height mouse down:', thumb); // 디버깅용
    setIsHeightDragging(thumb);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!heightSliderRef.current) return;
      
      const rect = heightSliderRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const value = Math.round((percent / 100) * 30 + 150);
      
      if (thumb === 'min') {
        setHeightMin(Math.min(value, heightMax - 1));
      } else {
        setHeightMax(Math.max(value, heightMin + 1));
      }
    };
    
    const handleMouseUp = () => {
      setIsHeightDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 슬라이더 클릭 핸들러 (트랙 클릭 시) - 썸이 아닌 트랙을 클릭했을 때만
  const handleAgeSliderClick = (e: React.MouseEvent) => {
    // 썸을 클릭한 경우는 무시
    if ((e.target as HTMLElement).classList.contains('range-thumb')) {
      return;
    }
    
    // console.log('Age slider clicked'); // 디버깅용
    if (!ageSliderRef.current) return;
    
    const rect = ageSliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const value = Math.round((percent / 100) * 30 + 20);
    
    // 클릭한 위치가 어느 썸에 더 가까운지 확인
    const minDistance = Math.abs(value - ageMin);
    const maxDistance = Math.abs(value - ageMax);
    
    if (minDistance < maxDistance) {
      setAgeMin(Math.min(value, ageMax - 1));
    } else {
      setAgeMax(Math.max(value, ageMin + 1));
    }
  };

  const handleHeightSliderClick = (e: React.MouseEvent) => {
    // 썸을 클릭한 경우는 무시
    if ((e.target as HTMLElement).classList.contains('range-thumb')) {
      return;
    }
    
    // console.log('Height slider clicked'); // 디버깅용
    if (!heightSliderRef.current) return;
    
    const rect = heightSliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const value = Math.round((percent / 100) * 30 + 150);
    
    // 클릭한 위치가 어느 썸에 더 가까운지 확인
    const minDistance = Math.abs(value - heightMin);
    const maxDistance = Math.abs(value - heightMax);
    
    if (minDistance < maxDistance) {
      setHeightMin(Math.min(value, heightMax - 1));
    } else {
      setHeightMax(Math.max(value, heightMin + 1));
    }
  };
  
  // 체형 선택 핸들러
  const handleBodyTypeToggle = (bodyType: string) => {
    if (bodyType === '상관없음') {
      setPreferBodyTypeNoPreference(!preferBodyTypeNoPreference);
      // 상관없음 선택 시 모든 체형 옵션을 선택
      setPreferredBodyTypes(preferBodyTypeNoPreference ? [] : bodyTypeOptions);
    } else {
      setPreferBodyTypeNoPreference(false);
      setPreferredBodyTypes(prev => {
        const next = prev.includes(bodyType)
          ? prev.filter(type => type !== bodyType)
          : [...prev, bodyType];
        return next;
      });
    }
  };
  
  // 직군 선택 핸들러
  const handleJobTypeToggle = (jobType: string) => {
    if (jobType === '상관없음') {
      setPreferJobTypeNoPreference(!preferJobTypeNoPreference);
      // 상관없음 선택 시 모든 직군 옵션을 선택
      setPreferredJobTypes(preferJobTypeNoPreference ? [] : jobTypeOptions);
    } else {
      setPreferJobTypeNoPreference(false);
      setPreferredJobTypes(prev => {
        const next = prev.includes(jobType)
          ? prev.filter(type => type !== jobType)
          : [...prev, jobType];
        return next;
      });
    }
  };
  
  // 다음 단계로 이동
  const handleNext = () => {
    if (preferCompanyIds.length === 0) {
      toast.error('선호 회사를 선택해주세요');
      return;
    }
    // 유효성 검사
    if (!preferAgeNoPreference && ageMin === ageMax) {
      toast.error('선호 나이 차이 범위를 설정해주세요');
      return;
    }
    if (!preferHeightNoPreference && heightMin === heightMax) {
      toast.error('선호 키 범위를 설정해주세요');
      return;
    }
    if (!preferBodyTypeNoPreference && preferredBodyTypes.length < 3) {
      toast.error('선호 체형은 최소 3개 이상 선택해주세요');
      return;
    }
    if (!preferJobTypeNoPreference && preferredJobTypes.length === 0) {
      toast.error('선호 직군을 선택해주세요');
      return;
    }
    if (!preferMaritalNoPreference && preferredMaritalStatuses.length === 0) {
      toast.error('선호 결혼상태를 선택해주세요');
      return;
    }
    // 다음 페이지로 이동 (닉네임 설정 페이지)
    if (preferAgeNoPreference) {
      setAgeMin(-99);
      setAgeMax(99);
      savePreferenceData({ ageMin: -99, ageMax: 99 });
    } else {
      savePreferenceData();
    }
    navigate('/register/nickname');
  };

  const companySummary = useMemo(() => {
    if (preferCompanyNames.length === 0) return '';
    const count = preferCompanyNames.length;
    const preview = preferCompanyNames.slice(0, 3);
    if (count <= 3) {
      return `${preview.join(', ')} (${count})`;
    }
    return `${preview.join(', ')} 등 (${count})`;
  }, [preferCompanyNames]);
  
  // 나이 슬라이더 위치 계산
  const ageMinPercent = ((ageMin - 20) / 30) * 100;
  const ageMaxPercent = ((ageMax - 20) / 30) * 100;
  
  // 키 슬라이더 위치 계산
  const heightMinPercent = ((heightMin - 150) / 30) * 100;
  const heightMaxPercent = ((heightMax - 150) / 30) * 100;

  const ageSliderRef = useRef<HTMLDivElement>(null);
  const heightSliderRef = useRef<HTMLDivElement>(null);
  const [isAgeDragging, setIsAgeDragging] = useState<'min' | 'max' | null>(null);
  const [isHeightDragging, setIsHeightDragging] = useState<'min' | 'max' | null>(null);

  // 2. 결혼상태 옵션 추출
  const maritalCategory = categories.find(cat => cat.name === '결혼상태');
  const maritalOptions = maritalCategory ? options.filter(opt => opt.category_id === maritalCategory.id).map(opt => opt.option_text) : [];

  return (
    <Container>
      <Section style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/profile')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>원하는 상대 스타일 설정</Title>
        
        {/* 선호 나이 */}
        <AgeRangeContainer>
          <Label>선호 나이 (본인 출생연도 기준)</Label>
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
                {...sliderStyle}
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
        </AgeRangeContainer>
        
        {/* 선호 키 */}
        <HeightRangeContainer>
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
                {...sliderStyle}
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
        </HeightRangeContainer>
        
        {/* 선호 체형 */}
        <BodyTypeContainer>
          <Label>선호 체형 (최소 3개)</Label>
          <NoPreferenceButton 
            selected={preferBodyTypeNoPreference}
            onClick={() => handleBodyTypeToggle('상관없음')}
          >
            {preferBodyTypeNoPreference ? '모든 체형 선택됨' : '모든 체형 (상관없음)'}
          </NoPreferenceButton>
          
          {!preferBodyTypeNoPreference && (
            <BodyTypeGrid>
              {bodyTypeOptions.map(bodyType => (
                <BodyTypeButton
                  key={bodyType}
                  selected={preferredBodyTypes.includes(bodyType)}
                  onClick={() => handleBodyTypeToggle(bodyType)}
                >
                  {bodyType}
                </BodyTypeButton>
              ))}
            </BodyTypeGrid>
          )}
        </BodyTypeContainer>
        
        {/* 선호 회사 */}
        <CompanySection>
          <Label>선호 회사 (중복 선택 가능)</Label>
          <CompanyOpenButton type="button" onClick={() => setIsCompanyModalOpen(true)}>
            <span>{preferCompanyIds.length === 0 ? '선호 회사를 선택해주세요' : '선호 회사 다시 선택하기'}</span>
            <span>선택하기</span>
          </CompanyOpenButton>
          {preferCompanyIds.length === 0 ? (
            <CompanySummaryText style={{ color: '#ef4444' }}>
              아직 선호 회사를 선택하지 않았어요.
            </CompanySummaryText>
          ) : (
            <CompanySummaryText>{companySummary}</CompanySummaryText>
          )}
        </CompanySection>
        
        {/* 선호 직군 */}
        <BodyTypeContainer>
          <Label>선호 직군 (중복 선택 가능)</Label>
          <NoPreferenceButton 
            selected={preferJobTypeNoPreference}
            onClick={() => handleJobTypeToggle('상관없음')}
          >
            {preferJobTypeNoPreference ? '모든 직군 선택됨' : '모든 직군 (상관없음)'}
          </NoPreferenceButton>
          
          {!preferJobTypeNoPreference && (
            <BodyTypeGrid>
              {jobTypeOptions.map(jobType => (
                <BodyTypeButton
                  key={jobType}
                  selected={preferredJobTypes.includes(jobType)}
                  onClick={() => handleJobTypeToggle(jobType)}
                >
                  {jobType}
                </BodyTypeButton>
              ))}
            </BodyTypeGrid>
          )}
        </BodyTypeContainer>
        
        {/* 선호 결혼상태 */}
        <BodyTypeContainer>
          <Label style={{marginTop: '32px'}}>선호 결혼상태 (중복 선택 가능)</Label>
          <NoPreferenceButton 
            selected={preferMaritalNoPreference}
            onClick={() => {
              setPreferMaritalNoPreference(!preferMaritalNoPreference);
              setPreferredMaritalStatuses(!preferMaritalNoPreference ? maritalOptions : []);
            }}
          >
            {preferMaritalNoPreference ? '모든 결혼상태 선택됨' : '모든 결혼상태 (상관없음)'}
          </NoPreferenceButton>
          {!preferMaritalNoPreference && (
            <BodyTypeGrid>
              {maritalOptions.map(opt => (
                <BodyTypeButton
                  key={opt}
                  selected={preferredMaritalStatuses.includes(opt)}
                  onClick={() => {
                    setPreferredMaritalStatuses(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
                  }}
                >
                  {opt}
                </BodyTypeButton>
              ))}
            </BodyTypeGrid>
          )}
        </BodyTypeContainer>
        
        <Button onClick={handleNext}>
          다음
        </Button>
      </Section>

      <PreferredCompanyModal
        isOpen={isCompanyModalOpen}
        initialSelectedIds={preferCompanyIds}
        onClose={() => setIsCompanyModalOpen(false)}
        onConfirm={(ids, names) => {
          setPreferCompanyIds(ids);
          setPreferCompanyNames(names);
          savePreferenceData({ preferCompanyIds: ids, preferCompanyNames: names });
          setIsCompanyModalOpen(false);
        }}
      />
    </Container>
  );
};

export default PreferenceSetupPage; 