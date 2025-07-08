import React from 'react';
import Modal from 'react-modal';

const ProfileDetailModal = ({ isOpen, onRequestClose, user }: { isOpen: boolean, onRequestClose: () => void, user: any }) => {
  const parseArray = (val: any) => {
    if (!val) return [];
    try { return Array.isArray(val) ? val : JSON.parse(val); } catch { return []; }
  };
  if (!user) return null;
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{
        content: {
          maxWidth: 440,
          minWidth: 260,
          width: 'fit-content',
          maxHeight: '80vh',
          margin: 'auto',
          borderRadius: 16,
          padding: 20,
          overflowY: 'auto',
          overflowX: 'visible',
          boxShadow: '0 4px 24px rgba(80,60,180,0.13)',
        }
      }}
      contentLabel="프로필 상세"
    >
      <div style={{maxWidth:380, minWidth:220, width:'fit-content', margin:'0 auto', padding:0}}>
        <h3 style={{marginBottom:14, fontSize:'1.25rem', color:'#4F46E5', fontWeight:700}}>{user.nickname} 님 프로필</h3>
        <div style={{marginBottom:8}}><b>이메일:</b> {user.email}</div>
        <div style={{marginBottom:8}}><b>성별:</b> {user.gender}</div>
        <div style={{marginBottom:8}}><b>생년:</b> {user.birth_year}</div>
        <div style={{marginBottom:8}}><b>키:</b> {user.height}</div>
        <div style={{marginBottom:8}}><b>직군:</b> {user.job_type}</div>
        <div style={{marginBottom:8}}><b>결혼상태:</b> {user.marital_status}</div>
        <div style={{marginBottom:8}}><b>MBTI:</b> {user.mbti}</div>
        <div style={{marginBottom:8}}><b>자기소개:</b> {user.appeal}</div>
        <div style={{marginBottom:8}}><b>체형:</b> {user.body_type}</div>
        <hr style={{margin:'10px 0'}}/>
        <div style={{marginBottom:8}}><b>선호 나이:</b> {user.preferred_age_min} ~ {user.preferred_age_max}</div>
        <div style={{marginBottom:8}}><b>선호 키:</b> {user.preferred_height_min} ~ {user.preferred_height_max}</div>
        <div style={{marginBottom:8}}><b>선호 체형:</b> {parseArray(user.preferred_body_types).join(', ')}</div>
        <div style={{marginBottom:8}}><b>선호 직군:</b> {parseArray(user.preferred_job_types).join(', ')}</div>
        <div style={{marginBottom:8}}><b>선호 결혼상태:</b> {parseArray(user.preferred_marital_statuses).join(', ')}</div>
        <button onClick={onRequestClose} style={{marginTop:12, width:'100%',background:'#7C3AED',color:'#fff',border:'none',borderRadius:8,padding:'10px 0',fontWeight:600}}>닫기</button>
      </div>
    </Modal>
  );
};

export default ProfileDetailModal; 