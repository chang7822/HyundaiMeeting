import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfileCategories, getProfileOptions, userApi } from '../services/api.ts';
import { ProfileCategory, ProfileOption } from '../types/index.ts';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext.tsx';
import InlineSpinner from '../components/InlineSpinner.tsx';

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
    padding-top: 80px;
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
  preferredJobTypes: string[];
  preferAgeNoPreference: boolean;
  preferHeightNoPreference: boolean;
  preferBodyTypeNoPreference: boolean;
  preferJobTypeNoPreference: boolean;
};

const PreferencePage = ({ sidebarOpen }: { sidebarOpen: boolean }) => {
  const navigate = useNavigate();
  const { setProfile } = useAuth();
  const userGender = sessionStorage.getItem('userGender') as 'male' | 'female' | null;
  const [categories, setCategories] = useState<ProfileCategory[]>([]);
  const [options, setOptions] = useState<ProfileOption[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    setLoading(true);
    // 내 성별을 sessionStorage에 저장(없으면)
    userApi.getMe().then(profile => {
      if (profile.gender && !sessionStorage.getItem('userGender')) {
        sessionStorage.setItem('userGender', profile.gender);
      }
    }).catch(()=>{});
    getProfileCategories().then(data => { setCategories(data); setCategoriesLoaded(true); });
    getProfileOptions().then(data => { setOptions(data); setOptionsLoaded(true); });
  }, []);

  const oppositeGender = userGender === 'male' ? 'female' : userGender === 'female' ? 'male' : null;
  const bodyTypeCategory = categories.find(cat => cat.name === '체형' && (cat.gender === oppositeGender || cat.gender === 'common'));
  const bodyTypeOptions = bodyTypeCategory ? options.filter(opt => opt.category_id === bodyTypeCategory.id).map(opt => opt.option_text) : [];
  const jobTypeCategory = categories.find(cat => cat.name === '직군');
  const jobTypeOptions = jobTypeCategory ? options.filter(opt => opt.category_id === jobTypeCategory.id).map(opt => opt.option_text) : [];

  const [ageMin, setAgeMin] = useState(-10);
  const [ageMax, setAgeMax] = useState(10);
  const [heightMin, setHeightMin] = useState(150);
  const [heightMax, setHeightMax] = useState(199);
  const [preferredBodyTypes, setPreferredBodyTypes] = useState<string[]>([]);
  const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);
  const [preferAgeNoPreference, setPreferAgeNoPreference] = useState(false);
  const [preferHeightNoPreference, setPreferHeightNoPreference] = useState(false);
  const [preferBodyTypeNoPreference, setPreferBodyTypeNoPreference] = useState(false);
  const [preferJobTypeNoPreference, setPreferJobTypeNoPreference] = useState(false);

  // 1. 상태 추가
  const [preferredMaritalStatuses, setPreferredMaritalStatuses] = useState<string[]>([]);
  const [preferMaritalNoPreference, setPreferMaritalNoPreference] = useState(false);

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
      if (typeof profile.preferred_job_types === 'string') {
        try { setPreferredJobTypes(JSON.parse(profile.preferred_job_types)); } catch { setPreferredJobTypes([]); }
      }
      // no preference 여부
      setPreferAgeNoPreference(profile.preferred_age_min === -99 && profile.preferred_age_max === 99);
      setPreferHeightNoPreference(profile.preferred_height_min === 150 && profile.preferred_height_max === 199);
      setPreferBodyTypeNoPreference(Array.isArray(profile.preferred_body_types) && profile.preferred_body_types.length === 0);
      setPreferJobTypeNoPreference(Array.isArray(profile.preferred_job_types) && profile.preferred_job_types.length === 0);
      // 3. 결혼상태 추가
      if (typeof profile.preferred_marital_statuses === 'string') {
        try { setPreferredMaritalStatuses(JSON.parse(profile.preferred_marital_statuses)); } catch { setPreferredMaritalStatuses([]); }
      }
      setPreferMaritalNoPreference(Array.isArray(profile.preferred_marital_statuses) && profile.preferred_marital_statuses.length === 0);
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
        if (Array.isArray(parsed.preferredJobTypes)) setPreferredJobTypes(parsed.preferredJobTypes);
        if (typeof parsed.preferHeightNoPreference === 'boolean') setPreferHeightNoPreference(parsed.preferHeightNoPreference);
        if (typeof parsed.preferBodyTypeNoPreference === 'boolean') setPreferBodyTypeNoPreference(parsed.preferBodyTypeNoPreference);
        if (typeof parsed.preferJobTypeNoPreference === 'boolean') setPreferJobTypeNoPreference(parsed.preferJobTypeNoPreference);
        if (Array.isArray(parsed.preferredMaritalStatuses)) setPreferredMaritalStatuses(parsed.preferredMaritalStatuses);
        if (typeof parsed.preferMaritalNoPreference === 'boolean') setPreferMaritalNoPreference(parsed.preferMaritalNoPreference);
      } catch {}
    }
  }, [categoriesLoaded, optionsLoaded]);

  // [추가] 모든 옵션 선택 시 '상관없음' 버튼 자동 활성화 useEffect
  useEffect(() => {
    // 체형
    if (bodyTypeOptions.length > 0 && preferredBodyTypes.length === bodyTypeOptions.length) {
      if (!preferBodyTypeNoPreference) setPreferBodyTypeNoPreference(true);
    } else {
      if (preferBodyTypeNoPreference && preferredBodyTypes.length !== bodyTypeOptions.length) setPreferBodyTypeNoPreference(false);
    }
    // 직군
    if (jobTypeOptions.length > 0 && preferredJobTypes.length === jobTypeOptions.length) {
      if (!preferJobTypeNoPreference) setPreferJobTypeNoPreference(true);
    } else {
      if (preferJobTypeNoPreference && preferredJobTypes.length !== jobTypeOptions.length) setPreferJobTypeNoPreference(false);
    }
    // 결혼상태
    if (maritalOptions.length > 0 && preferredMaritalStatuses.length === maritalOptions.length) {
      if (!preferMaritalNoPreference) setPreferMaritalNoPreference(true);
    } else {
      if (preferMaritalNoPreference && preferredMaritalStatuses.length !== maritalOptions.length) setPreferMaritalNoPreference(false);
    }
  }, [preferredBodyTypes, preferredJobTypes, preferredMaritalStatuses, bodyTypeOptions, jobTypeOptions, maritalOptions]);

  // 저장
  const handleSave = async () => {
    if (!preferAgeNoPreference && ageMin === ageMax) {
      toast.error('선호 나이 차이 범위를 설정해주세요');
      return;
    }
    if (!preferHeightNoPreference && heightMin === heightMax) {
      toast.error('선호 키 범위를 설정해주세요');
      return;
    }
    if (!preferBodyTypeNoPreference && preferredBodyTypes.length === 0) {
      toast.error('선호 체형을 선택해주세요');
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
    // 서버에 저장
    try {
      await userApi.updateMe({
        preferred_age_min: ageMin,
        preferred_age_max: ageMax,
        preferred_height_min: heightMin,
        preferred_height_max: heightMax,
        preferred_body_types: JSON.stringify(preferredBodyTypes),
        preferred_job_types: JSON.stringify(preferredJobTypes),
        preferred_marital_statuses: JSON.stringify(preferredMaritalStatuses),
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

  // 체형/직군 선택 핸들러
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
  const handleJobTypeToggle = (jobType: string) => {
    if (jobType === '상관없음') {
      setPreferJobTypeNoPreference(!preferJobTypeNoPreference);
      setPreferredJobTypes(preferJobTypeNoPreference ? [] : jobTypeOptions);
    } else {
      setPreferredJobTypes(prev => {
        const next = prev.includes(jobType)
          ? prev.filter(type => type !== jobType)
          : [...prev, jobType];
        if (jobTypeOptions.length > 0 && next.length === jobTypeOptions.length) setPreferJobTypeNoPreference(true);
        else setPreferJobTypeNoPreference(false);
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
          <SectionTitle>선호 체형 (중복 선택 가능)</SectionTitle>
          <NoPreferenceButton 
            selected={preferBodyTypeNoPreference}
            onClick={() => handleBodyTypeToggle('상관없음')}
          >
            {preferBodyTypeNoPreference ? '모든 체형 선택됨' : '모든 체형 (상관없음)'}
          </NoPreferenceButton>
          {!preferBodyTypeNoPreference && (
            bodyTypeOptions.length > 0 ? (
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
            ) : (
              <div style={{color:'#e74c3c',marginTop:8}}>체형 옵션이 없습니다. 관리자에게 문의하세요.</div>
            )
          )}
        </BodyTypeContainer>
        {/* 선호 직군 */}
        <BodyTypeContainer>
          <SectionTitle>선호 직군 (중복 선택 가능)</SectionTitle>
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
        <LastBodyTypeContainer>
          <SectionTitle style={{marginTop: 0}}>선호 결혼상태 (중복 선택 가능)</SectionTitle>
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
        </LastBodyTypeContainer>
        {/* 저장/닫기 버튼 영역 */}
        <ButtonRow>
          <Button onClick={handleSave}>저장</Button>
          <Button style={{ background: '#eee', color: '#333' }} onClick={() => navigate('/main')}>닫기</Button>
        </ButtonRow>
      </Card>
    </MainContainer>
  );
};

export default PreferencePage; 