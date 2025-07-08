import React from 'react';
import { FaUserCircle, FaRegSmile, FaRegStar, FaRegCommentDots } from 'react-icons/fa';

interface ProfileCardProps {
  nickname: string;
  birthYear: number;
  gender: string;
  job: string;
  mbti?: string;
  maritalStatus?: string;
  appeal?: string;
  interests?: string;
  appearance?: string;
  personality?: string;
}

const parseArray = (value?: string) => {
  if (!value) return [];
  try {
    const arr = Array.isArray(value) ? value : JSON.parse(value);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#4F46E5',
  fontSize: '0.98rem',
  minWidth: 80,
  flex: 1,
  textAlign: 'left',
};
const valueStyle: React.CSSProperties = {
  color: '#222',
  fontSize: '1rem',
  wordBreak: 'break-all',
  flex: 1,
  textAlign: 'right',
};
const sectionStyle: React.CSSProperties = {
  marginBottom: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
const divider = <div style={{borderTop:'1px solid #eee',margin:'12px 0'}} />;
const boxStyle: React.CSSProperties = {
  background: '#f3f0fa',
  borderRadius: 8,
  padding: '10px 12px',
  marginTop: 6,
  marginBottom: 6,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  minHeight: 36,
};
const tagStyle: React.CSSProperties = {
  background: '#ede7f6',
  color: '#5b3ec8',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: '0.97rem',
  fontWeight: 500,
  marginBottom: 2,
};

const ProfileIcon: React.FC<{gender: string; size?: number}> = ({ gender, size = 44 }) => {
  if (gender === 'male' || gender === '남성') {
    return <FaUserCircle size={size} color="#7C3AED" style={{flexShrink:0}} />;
  } else if (gender === 'female' || gender === '여성') {
    return <FaUserCircle size={size} color="#F472B6" style={{flexShrink:0}} />;
  } else {
    return <FaUserCircle size={size} color="#bbb" style={{flexShrink:0}} />;
  }
};

const ProfileCard: React.FC<ProfileCardProps> = ({
  nickname,
  birthYear,
  gender,
  job,
  mbti,
  maritalStatus,
  appeal,
  interests,
  appearance,
  personality,
}) => {
  return (
    <div style={{
      border: 'none',
      borderRadius: '18px',
      padding: '28px 24px 20px 24px',
      maxWidth: '350px',
      maxHeight: '80vh',
      overflowY: 'auto',
      boxShadow: '0 4px 24px rgba(80,60,180,0.10)',
      background: 'linear-gradient(135deg, #f7f7fa 0%, #e9e6f7 100%)',
      fontSize: '1rem',
      position: 'relative',
      margin: '0 auto',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
        <ProfileIcon gender={gender} />
        <div>
          <div style={{fontWeight:700,fontSize:'1.25rem',color:'#4F46E5',marginBottom:2}}>{nickname}</div>
          <div style={{fontSize:'0.98rem',color:'#666'}}>{birthYear}년생 · {gender} · {job}</div>
        </div>
      </div>
      {divider}
      <div style={sectionStyle}>
        <span style={labelStyle}>MBTI</span>
        <span style={valueStyle}>{mbti || '-'}</span>
      </div>
      <div style={sectionStyle}>
        <span style={labelStyle}>결혼상태</span>
        <span style={valueStyle}>{maritalStatus || '-'}</span>
      </div>
      {divider}
      <div style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}><FaRegStar style={{color:'#7C3AED'}}/><span style={{fontWeight:600,color:'#4F46E5'}}>관심사</span></div>
        <div style={boxStyle}>
          {parseArray(interests).length > 0 ? parseArray(interests).map((item:string,idx:number)=>(<span key={idx} style={tagStyle}>{item}</span>)) : <span style={{color:'#aaa'}}>없음</span>}
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}><FaRegCommentDots style={{color:'#7C3AED'}}/><span style={{fontWeight:600,color:'#4F46E5'}}>이런 말 자주들어요</span></div>
        <div style={boxStyle}>
          {parseArray(appearance).length > 0 ? parseArray(appearance).map((item:string,idx:number)=>(<span key={idx} style={tagStyle}>{item}</span>)) : <span style={{color:'#aaa'}}>없음</span>}
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}><FaRegSmile style={{color:'#7C3AED'}}/><span style={{fontWeight:600,color:'#4F46E5'}}>나는 이런 사람이에요</span></div>
        <div style={boxStyle}>
          {parseArray(personality).length > 0 ? parseArray(personality).map((item:string,idx:number)=>(<span key={idx} style={tagStyle}>{item}</span>)) : <span style={{color:'#aaa'}}>없음</span>}
        </div>
      </div>
      {divider}
      <div style={{marginBottom:0}}>
        <div style={{fontWeight:600,color:'#4F46E5',marginBottom:4}}>자기소개</div>
        <div style={{...boxStyle,background:'#f8f6fd',minHeight:48,whiteSpace:'pre-line',color:'#444',fontSize:'0.98rem'}}>{appeal || '아직 자기소개가 없습니다.'}</div>
      </div>
    </div>
  );
};

export default ProfileCard;
export { ProfileIcon }; 