import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { companyApi } from '../../services/api.ts';
import { Company } from '../../types/index.ts';
import { getDisplayCompanyName } from '../../utils/companyDisplay.ts';

const ProfileDetailModal = ({ isOpen, onRequestClose, user }: { isOpen: boolean, onRequestClose: () => void, user: any }) => {
  const [companies, setCompanies] = useState<Company[]>([]);

  const parseArray = (val: any) => {
    if (!val) return [];
    try { return Array.isArray(val) ? val : JSON.parse(val); } catch { return []; }
  };

  useEffect(() => {
    if (!isOpen) return;
    companyApi.getCompanies()
      .then(setCompanies)
      .catch(() => {
        // 회사 목록 로드 실패 시에도 모달은 계속 동작
      });
  }, [isOpen]);

  const preferCompanyNames = (() => {
    const ids = user && Array.isArray(user.prefer_company) ? user.prefer_company as number[] : [];
    if (!ids.length || !companies.length) return '-';
    const names = ids
      .map(id => {
        const found = companies.find(c => Number(c.id) === id);
        return found?.name;
      })
      .filter((name): name is string => !!name);
    return names.length ? names.join(', ') : '-';
  })();

  const preferRegions = (() => {
    const regions = user && Array.isArray(user.prefer_region) ? user.prefer_region as string[] : [];
    if (!regions.length) return '-';
    return regions.join(', ');
  })();

  if (!user) return null;
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
          width: '95%',
          maxWidth: '95%',
          minWidth: 280,
          maxHeight: '80vh',
          borderRadius: 16,
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(80,60,180,0.13)',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
      contentLabel="프로필 상세"
    >
      {/* 고정 헤더 */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          color: '#4F46E5',
          fontWeight: 700
        }}>
          {user.nickname} 님 프로필
        </h3>
      </div>

      {/* 스크롤 가능한 내용 영역 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        minHeight: 0
      }}>
        <div style={{marginBottom:8}}><b>이메일:</b> {user.email}</div>
        <div style={{marginBottom:8}}><b>성별:</b> {user.gender}</div>
        <div style={{marginBottom:8}}><b>생년:</b> {user.birth_year}</div>
        <div style={{marginBottom:8}}><b>키:</b> {user.height}</div>
        <div style={{marginBottom:8}}><b>거주지:</b> {user.residence}</div>
        <div style={{marginBottom:8}}><b>회사:</b> {getDisplayCompanyName(user.company, user.custom_company_name) || '-'}</div>
        <div style={{marginBottom:8}}><b>학력:</b> {user.education}</div>
        <div style={{marginBottom:8}}><b>결혼상태:</b> {user.marital_status}</div>
        <div style={{marginBottom:8}}><b>MBTI:</b> {user.mbti}</div>
        <div style={{marginBottom:8}}><b>자기소개:</b> {user.appeal}</div>
        <div style={{marginBottom:8}}><b>체형:</b> {user.body_type}</div>
        <hr style={{margin:'16px 0', border:'none', borderTop:'1px solid #e5e7eb'}}/>
        <div style={{marginBottom:8, fontSize:'0.95rem', color:'#6b7280', fontWeight:600}}>선호 조건</div>
        <div style={{marginBottom:8}}><b>선호 나이:</b> {user.preferred_age_min} ~ {user.preferred_age_max}</div>
        <div style={{marginBottom:8}}><b>선호 키:</b> {user.preferred_height_min} ~ {user.preferred_height_max}</div>
        <div style={{marginBottom:8}}><b>선호 체형:</b> {parseArray(user.preferred_body_types).join(', ')}</div>
        <div style={{marginBottom:8}}><b>선호 회사:</b> {preferCompanyNames}</div>
        <div style={{marginBottom:8}}><b>선호 학력:</b> {parseArray(user.preferred_educations).join(', ')}</div>
        <div style={{marginBottom:8}}><b>선호 지역:</b> {preferRegions}</div>
        <div style={{marginBottom:8}}><b>선호 결혼상태:</b> {parseArray(user.preferred_marital_statuses).join(', ')}</div>
      </div>

      {/* 고정 푸터 */}
      <div style={{
        padding: '16px 24px 20px',
        borderTop: '1px solid #e5e7eb',
        flexShrink: 0
      }}>
        <button 
          onClick={onRequestClose} 
          style={{
            width: '100%',
            background: '#7C3AED',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#5b21b6'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#7C3AED'}
        >
          닫기
        </button>
      </div>
    </Modal>
  );
};

export default ProfileDetailModal;