import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getProfileCategories, getProfileOptions } from '../../services/api.ts';
import { useNavigate } from 'react-router-dom';
import { ProfileCategory, ProfileOption } from '../../types/index.ts';
import { toast } from 'react-toastify';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { FaArrowLeft } from 'react-icons/fa';
import AddressSelectModal from '../../components/AddressSelectModal.tsx';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 0 80px 0;
  
  /* 모바일 최적화 */
  @media (max-width: 480px) {
    padding: 10px 0 80px 0;
    overflow-x: hidden; /* 가로 스크롤 방지 */
  }
`;
const Section = styled.div`
  background: #fff;
  border-radius: 16px;
  margin: 16px auto;
  padding: 24px 16px;
  max-width: 480px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  
  /* 모바일 최적화 */
  @media (max-width: 480px) {
    margin: 8px 12px;
    padding: 20px 12px;
    max-width: calc(100% - 24px);
    overflow: hidden; /* 드롭다운이 컨테이너를 벗어나지 않도록 */
  }
`;
const Title = styled.h2`
  font-size: 1.2rem;
  margin-bottom: 12px;
`;
const Row = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;
const Label = styled.label`
  font-size: 1rem;
  margin-bottom: 8px;
  display: block;
  font-weight: 600;
  color: #333;
`;
const Select = styled.select`
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 1rem;
  height: 48px;
  margin-bottom: 20px;
  
  /* 모바일 드롭다운 최적화 */
  @media (max-width: 768px) {
    font-size: 16px; /* iOS에서 줌 방지 */
    max-width: 100%;
    box-sizing: border-box;
  }
  
  /* 드롭다운 옵션 스타일링 */
  option {
    font-size: 1rem;
    padding: 8px;
  }
  
  /* 모바일에서 드롭다운 위치 조정 */
  @media (max-width: 480px) {
    position: relative;
    z-index: 1;
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
const OptionButton = styled.button<{selected?: boolean}>`
  background: ${({selected}) => selected ? '#764ba2' : '#fff'};
  color: ${({selected}) => selected ? '#fff' : '#333'};
  border: 1.5px solid #764ba2;
  border-radius: 8px;
  padding: 8px 16px;
  margin: 4px 4px 0 0;
  cursor: pointer;
  font-size: 1rem;
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

const sliderStyle = {
  trackStyle: [{ backgroundColor: '#764ba2', height: 12 }],
  handleStyle: [
    { width: 32, height: 32, backgroundColor: '#764ba2', border: '3px solid #fff', marginTop: -10, opacity: 1, boxShadow: '0 2px 4px #764ba2' }
  ],
  railStyle: { backgroundColor: '#e0e0e0', height: 12 },
};

const HeightContainer = styled.div`
  margin-bottom: 24px;
  padding: 0 16px;
`;

const HeightValue = styled.div`
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #764ba2;
  margin: 20px 0;
`;

const HeightLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.8rem;
  color: #666;
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

const ResidenceButton = styled(OptionButton)`
  margin-bottom: 20px;
`;

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

function MultiSelectPopup({title, options, selected, onChange, max, onClose}:{title:string, options:string[], selected:string[], onChange:(v:string[])=>void, max:number, onClose:()=>void}) {
  const toggle = (opt:string) => {
    if(selected.includes(opt)) onChange(selected.filter(o=>o!==opt));
    else if(selected.length<max) onChange([...selected,opt]);
  };
  return (
    <PopupBg>
      <Popup>
        <PopupTitle>{title}</PopupTitle>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px', maxHeight:'300px', overflowY:'auto', padding:'8px', marginBottom:'16px'}}>
          {options.map(opt=>
            <PopupOption key={opt} selected={selected.includes(opt)} onClick={()=>toggle(opt)}>{opt}</PopupOption>
          )}
        </div>
        <PopupFooter>
          <Button onClick={onClose}>확인</Button>
        </PopupFooter>
      </Popup>
    </PopupBg>
  );
}


const ProfileSetupPage = () => {
  const navigate = useNavigate();
  // 성별 정보 가져오기
  const userGender = sessionStorage.getItem('userGender') as 'male' | 'female' | null;
  
  // DB에서 불러온 카테고리/옵션
  const [categories, setCategories] = useState<ProfileCategory[]>([]);
  const [options, setOptions] = useState<ProfileOption[]>([]);
  // 선택값 상태 (category_id: option_id[])
  const [selected, setSelected] = useState<{[catId:number]: number[]}>({});
  // 기본 정보
  const [height, setHeight] = useState('');
  // [1] 체형 선택 상태를 배열로 변경
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [residence, setResidence] = useState('');
  const [jobType, setJobType] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [religion, setReligion] = useState('');
  const [smoking, setSmoking] = useState('');
  const [drinking, setDrinking] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [mbti, setMbti] = useState('');
  const [appearance, setAppearance] = useState<string[]>([]);
  const [personality, setPersonality] = useState<string[]>([]);
  // 팝업 상태
  const [popup, setPopup] = useState<{type: string} | null>(null);
  const [addressPopup, setAddressPopup] = useState(false);
  // [3] 체형 MultiSelect 팝업
  // [삭제] bodyTypePopup 관련 상태/컴포넌트 제거
  // [추가] handleBodyTypeToggle 함수
  const handleBodyTypeToggle = (bodyType: string) => {
    setBodyTypes(prev => {
      if (prev.includes(bodyType)) {
        return prev.filter(type => type !== bodyType);
      } else if (prev.length < 3) {
        return [...prev, bodyType];
      } else {
        toast('최대 3개까지만 선택할 수 있습니다.');
        return prev;
      }
    });
  };

  useEffect(() => {
    // 성별이 없으면 이전 페이지로 돌아가기
    if (!userGender) {
      alert('성별 정보가 없습니다. 이전 페이지로 돌아갑니다.');
      navigate('/register/required-info');
      return;
    }
    
    getProfileCategories().then(setCategories).catch(() => setCategories([]));
    getProfileOptions().then(setOptions).catch(() => setOptions([]));
  }, [userGender, navigate]);

  useEffect(() => {
    // 복원: sessionStorage에 값이 있으면 setState
    const savedProfileData = sessionStorage.getItem('userProfileData');
    if (savedProfileData) {
      try {
        const parsed = JSON.parse(savedProfileData);
        if (parsed.height) setHeight(parsed.height.toString());
        if (parsed.mbti) setMbti(parsed.mbti);
        // [2] 복원 시 배열로 복원
        if (parsed.bodyTypes) setBodyTypes(parsed.bodyTypes);
        if (parsed.jobType) setJobType(parsed.jobType);
        if (parsed.residence) setResidence(parsed.residence);
        if (parsed.maritalStatus) setMaritalStatus(parsed.maritalStatus);
        if (parsed.interests) setInterests(parsed.interests);
        if (parsed.appearance) setAppearance(parsed.appearance);
        if (parsed.personality) setPersonality(parsed.personality);
        if (parsed.selected) setSelected(parsed.selected);
        if (parsed.religion) setReligion(parsed.religion);
        if (parsed.smoking) setSmoking(parsed.smoking);
        if (parsed.drinking) setDrinking(parsed.drinking);
      } catch {}
    }
  }, []);

  // 입력값 변경 시마다 sessionStorage에 저장 (함수로 분리)
  const saveProfileData = (next: Partial<any> = {}) => {
    const profileData = {
      height,
      mbti,
      // [4] 저장 시 bodyType을 배열로 저장
      bodyTypes,
      jobType,
      residence,
      maritalStatus,
      interests,
      appearance,
      personality,
      selected,
      religion,
      smoking,
      drinking,
      ...next
    };
    sessionStorage.setItem('userProfileData', JSON.stringify(profileData));
  };

  // 팝업에서 값 변경 시에도 즉시 저장
  const handleInterestsChange = (vals: string[]) => {
    setInterests(vals);
    saveProfileData({ interests: vals });
  };
  const handleAppearanceChange = (vals: string[]) => {
    setAppearance(vals);
    saveProfileData({ appearance: vals });
  };
  const handlePersonalityChange = (vals: string[]) => {
    setPersonality(vals);
    saveProfileData({ personality: vals });
  };

  // 성별에 따라 카테고리 필터링
  const filteredCategories = categories.filter(cat => {
    if (cat.gender === 'common') return true; // 공통 카테고리는 항상 표시
    if (!userGender) return true; // 성별이 없으면 모든 카테고리 표시
    return cat.gender === userGender; // 해당 성별의 카테고리만 표시
  });

  // 카테고리별 옵션 필터링
  const getOptions = (catId:number) => options.filter(o=>o.category_id===catId);

  // 선택 핸들러 예시 (단일/다중 구분 필요시 category 정보 활용)
  const handleSelect = (catId:number, optId:number, multi=false) => {
    setSelected(prev => {
      if(multi) {
        const arr = prev[catId]||[];
        return {...prev, [catId]: arr.includes(optId) ? arr.filter(id=>id!==optId) : [...arr,optId]};
      } else {
        return {...prev, [catId]: [optId]};
      }
    });
  };

  // 저장
  const handleSave = () => {
    // 필수 필드 검사
    const missingFields: string[] = [];
    
    if (!height) {
      missingFields.push('키');
    }
    
    if (!mbti) {
      missingFields.push('MBTI');
    }
    
    if (bodyTypes.length === 0) {
      missingFields.push('체형');
    }
    
    if (!jobType) {
      missingFields.push('직군');
    }
    
    if (!residence) {
      missingFields.push('거주지');
    }
    
    if (!maritalStatus) {
      missingFields.push('결혼상태');
    }
    
    if (interests.length === 0) {
      missingFields.push('관심사');
    }
    
    if (appearance.length === 0) {
      missingFields.push('이런 얘기 많이 들어요');
    }
    
    if (personality.length === 0) {
      missingFields.push('저는 이런 사람이예요');
    }

    // DB 카테고리가 있는 경우
    if (filteredCategories.length > 0) {
      const religionCat = filteredCategories.find(c => c.name === '종교');
      const smokingCat = filteredCategories.find(c => c.name === '흡연');
      const drinkingCat = filteredCategories.find(c => c.name === '음주');

      if (religionCat && (!selected[religionCat.id] || selected[religionCat.id].length === 0)) {
        missingFields.push('종교');
      }
      if (smokingCat && (!selected[smokingCat.id] || selected[smokingCat.id].length === 0)) {
        missingFields.push('흡연');
      }
      if (drinkingCat && (!selected[drinkingCat.id] || selected[drinkingCat.id].length === 0)) {
        missingFields.push('음주');
      }
    } else {
      // 기본 입력 필드 검사
      if (!religion) missingFields.push('종교');
      if (!smoking) missingFields.push('흡연');
      if (!drinking) missingFields.push('음주');
    }

    if (missingFields.length > 0) {
      toast.error(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
      return;
    }

    // 프로필 데이터를 sessionStorage에 저장
    const profileData = {
      height: height ? parseInt(height) : undefined,
      mbti,
      // [4] 저장 시 bodyType을 배열로 저장
      bodyTypes,
      jobType,
      residence,
      maritalStatus,
      interests,
      appearance,
      personality,
      selected, // DB 카테고리 선택 데이터
      // 기본 입력 필드들
      religion: filteredCategories.length === 0 ? religion : undefined,
      smoking: filteredCategories.length === 0 ? smoking : undefined,
      drinking: filteredCategories.length === 0 ? drinking : undefined
    };
    
    sessionStorage.setItem('userProfileData', JSON.stringify(profileData));
    sessionStorage.setItem('userHeight', height || '');
    sessionStorage.setItem('userResidence', residence || '');
    sessionStorage.setItem('userMaritalStatus', maritalStatus || '');
    navigate('/register/preference');
  };

  // 팝업에서 사용할 옵션 추출 함수
  const getPopupOptions = (type: string) => {
    const cat = filteredCategories.find(c => c.name === type);
    if (!cat) return [];
    return options.filter(o => o.category_id === cat.id).map(o => o.option_text);
  };

  return (
    <Container>
      <Section style={{ position: 'relative' }}>
        <BackButton onClick={() => navigate('/register/required-info')} title="이전 단계로">
          <FaArrowLeft />
        </BackButton>
        <Title>내 프로필 입력하기</Title>
        
        <Label>키</Label>
        <HeightContainer>
          <HeightLabels>
            <span>150 cm</span>
            <span>200 cm</span>
          </HeightLabels>
          <Slider
            min={150}
            max={200}
            value={height ? parseInt(height) : 150}
            onChange={(value) => setHeight(value.toString())}
            {...sliderStyle}
          />
          <HeightValue>{height ? `${parseInt(height)} cm` : '키를 입력해주세요'}</HeightValue>
        </HeightContainer>
        
        <Label>MBTI</Label>
        <Select value={mbti} onChange={e=>setMbti(e.target.value)}>
          <option value="">MBTI 선택</option>
          {getOptions(filteredCategories.find(c => c.name === 'MBTI')?.id || 0).map(opt => (
            <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
          ))}
        </Select>
        
        <Label>체형 (최대 3개)</Label>
        <BodyTypeGrid>
          {(() => {
            // '체형' 카테고리 중 gender가 userGender와 일치하는 것만 사용
            const bodyTypeCat = categories.find(c => c.name === '체형' && c.gender === userGender);
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
        
        <Label>직군</Label>
        <Row style={{flexWrap:'wrap'}}>
          {getOptions(filteredCategories.find(c => c.name === '직군')?.id || 0).map(opt => (
            <OptionButton
              key={opt.id}
              selected={jobType === opt.option_text}
              style={{minWidth:'80px', padding:'8px 16px', textAlign:'center'}}
              onClick={() => setJobType(opt.option_text)}
            >
              {opt.option_text}
            </OptionButton>
          ))}
        </Row>
        
        <Label>결혼상태</Label>
        <Row style={{flexWrap:'wrap'}}>
          {getOptions(filteredCategories.find(c => c.name === '결혼상태')?.id || 0).map(opt => (
            <OptionButton
              key={opt.id}
              selected={maritalStatus === opt.option_text}
              style={{minWidth:'80px', padding:'8px 16px', textAlign:'center'}}
              onClick={() => setMaritalStatus(opt.option_text)}
            >
              {opt.option_text}
            </OptionButton>
          ))}
        </Row>
        
        <Label>거주지</Label>
        <ResidenceButton onClick={() => setAddressPopup(true)}>
          {residence || '주소를 선택해주세요'}
        </ResidenceButton>
        
        {/* DB에서 불러온 카테고리별 옵션 동적 렌더링 */}
        {filteredCategories.length > 0 && (
          <>
            {filteredCategories.filter(cat => ['종교', '흡연', '음주'].includes(cat.name)).map(cat => (
              <div key={cat.id}>
                <Label>{cat.name}</Label>
                <Row>
                  {getOptions(cat.id).map(opt => (
                    <OptionButton
                      key={opt.id}
                      selected={selected[cat.id]?.includes(opt.id)}
                      onClick={()=>handleSelect(cat.id, opt.id, false)}
                    >
                      {opt.option_text}
                    </OptionButton>
                  ))}
                </Row>
              </div>
            ))}
          </>
        )}
        
        {/* 기본 입력 필드들 (DB 데이터가 없을 때 사용) */}
        {filteredCategories.length === 0 && (
          <>
            <Label>종교</Label>
            <input value={religion} onChange={e=>setReligion(e.target.value)} placeholder='예) 기독교' style={{width:'100%',padding:'12px',borderRadius:6,border:'1px solid #ccc',marginBottom:20,height:'48px',fontSize:'1rem'}}/>
            
            <Label>흡연</Label>
            <Row>
              <OptionButton selected={smoking==='흡연'} onClick={()=>setSmoking('흡연')}>흡연</OptionButton>
              <OptionButton selected={smoking==='비흡연'} onClick={()=>setSmoking('비흡연')}>비흡연</OptionButton>
            </Row>
            
            <Label>음주</Label>
            <Row>
              <OptionButton selected={drinking==='전혀'} onClick={()=>setDrinking('전혀')}>전혀</OptionButton>
              <OptionButton selected={drinking==='적당히'} onClick={()=>setDrinking('적당히')}>적당히</OptionButton>
              <OptionButton selected={drinking==='좋아함'} onClick={()=>setDrinking('좋아함')}>좋아함</OptionButton>
            </Row>
          </>
        )}
        
        <Label>제 관심사는요</Label>
        <Row>
          <OptionButton onClick={()=>setPopup({type:'관심사'})}>{interests.length>0?`${interests.join(', ')} (${interests.length})`:'선택하기'}</OptionButton>
        </Row>
        
        <Label>이런 얘기 많이 들어요</Label>
        <Row>
          <OptionButton onClick={()=>setPopup({type:'외모'})}>{appearance.length>0?`${appearance.join(', ')} (${appearance.length})`:'선택하기'}</OptionButton>
        </Row>
        
        <Label>저는 이런 사람이예요</Label>
        <Row>
          <OptionButton onClick={()=>setPopup({type:'성격'})}>{personality.length>0?`${personality.join(', ')} (${personality.length})`:'선택하기'}</OptionButton>
        </Row>
        <Button onClick={handleSave}>다음</Button>
      </Section>
      {/* 팝업 모달 - DB 옵션 기반 동적 처리 */}
      {filteredCategories.length > 0 && (
        <>
          {popup?.type === '관심사' && (
            <MultiSelectPopup
              title="제 관심사는요 (최대 7개)"
              options={getPopupOptions('관심사')}
              selected={interests}
              onChange={handleInterestsChange}
              max={7}
              onClose={()=>setPopup(null)}
            />
          )}
          {popup?.type === '외모' && (
            <MultiSelectPopup
              title="이런 얘기 많이 들어요 (최대 7개)"
              options={getPopupOptions('외모')}
              selected={appearance}
              onChange={handleAppearanceChange}
              max={7}
              onClose={()=>setPopup(null)}
            />
          )}
          {popup?.type === '성격' && (
            <MultiSelectPopup
              title="저는 이런 사람이예요 (최대 7개)"
              options={getPopupOptions('성격')}
              selected={personality}
              onChange={handlePersonalityChange}
              max={7}
              onClose={()=>setPopup(null)}
            />
          )}
        </>
      )}
      
      {/* 주소 팝업 */}
      {addressPopup && (
        <AddressSelectModal
          isOpen={addressPopup}
          onClose={() => setAddressPopup(false)}
          onSelect={(sido, gugun) => {
            setResidence(`${sido} ${gugun}`);
            saveProfileData({ residence: `${sido} ${gugun}` });
          }}
          defaultSido={residence.split(' ')[0] || ''}
          defaultGugun={residence.split(' ')[1] || ''}
        />
      )}
    </Container>
  );
};

export default ProfileSetupPage; 