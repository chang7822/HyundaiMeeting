import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Modal from 'react-modal';
import ProfileDetailModal from './ProfileDetailModal.tsx';
import { apiUrl } from '../../services/api.ts';

const Container = styled.div<{ sidebarOpen: boolean }>`
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(80,60,180,0.08);
  padding: 32px 24px;
  max-width: 1200px;
  margin-left: ${props => (window.innerWidth > 768 && props.sidebarOpen) ? '280px' : '0'};
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;
const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 24px;
`;
const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
`;
const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
  th, td {
    border-bottom: 1px solid #eee;
    padding: 10px 8px;
    text-align: center;
    white-space: nowrap;
  }
  th {
    background: #f7f7fa;
    font-weight: 600;
  }
`;
const NicknameBtn = styled.button`
  background: none;
  border: none;
  color: #4F46E5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: #7C3AED; }
`;
const StyledSelect = styled.select`
  padding: 10px 36px 10px 14px;
  border-radius: 8px;
  border: 1.5px solid #7C3AED;
  background: #f7f7fa url('data:image/svg+xml;utf8,<svg fill="%237C3AED" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7.293 8.293a1 1 0 011.414 0L10 9.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z"/></svg>') no-repeat right 12px center/18px 18px;
  font-size: 1.05rem;
  font-weight: 500;
  color: #4F46E5;
  outline: none;
  min-width: 120px;
  cursor: pointer;
  transition: border 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(80,60,180,0.04);
  &:hover, &:focus {
    border: 1.5px solid #5b21b6;
    box-shadow: 0 2px 8px rgba(80,60,180,0.10);
    background-color: #ede7f6;
  }
`;
Modal.setAppElement('#root');

const MatchingResultPage = ({ sidebarOpen = true }: { sidebarOpen?: boolean }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState<string>('all');
  const [nickname, setNickname] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<any>(null);

  // 회차 목록 불러오기
  useEffect(() => {
    fetch(apiUrl('/admin/matching-log')).then(r=>r.json()).then(setLogs);
  }, []);
  // 매칭 결과 불러오기
  useEffect(() => {
    const params = new URLSearchParams();
    if (periodId && periodId !== 'all') params.append('periodId', periodId);
    if (nickname) params.append('nickname', nickname);
    fetch(apiUrl(`/admin/matching-history?${params.toString()}`))
      .then(r=>r.json())
      .then(data => {
        setResults(Array.isArray(data) ? data : []);
      })
      .catch(()=>{
        setResults([]);
      });
  }, [periodId, nickname]);

  // 회차 인덱스 → 연속 번호로 변환 함수
  const getPeriodDisplayNumber = (period_id: number|string) => {
    const idx = logs.findIndex(log => String(log.id) === String(period_id));
    return idx >= 0 ? idx + 1 : period_id;
  };

  // 프로필/선호스타일 파싱 함수 (신청현황 페이지와 동일)
  const parseArray = (val: any) => {
    if (!val) return [];
    try { return Array.isArray(val) ? val : JSON.parse(val); } catch { return []; }
  };

  // 모달 열기 (남/여 모두 지원)
  const openModal = (user: any) => {
    setModalUser(user);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalUser(null);
  };

  return (
    <Container sidebarOpen={sidebarOpen}>
      <Title>매칭 결과(커플) 리스트</Title>
      <FilterRow>
        <span>회차:</span>
        <StyledSelect value={periodId} onChange={e=>setPeriodId(e.target.value)}>
          <option value="all">전체</option>
          {logs.map((log, idx) => (
            <option key={log.id} value={log.id}>{idx+1}회차</option>
          ))}
        </StyledSelect>
        <span>닉네임:</span>
        <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="닉네임 검색" style={{padding:'6px 10px',borderRadius:6,border:'1.5px solid #bbb',minWidth:120}}/>
      </FilterRow>
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <th>회차</th>
              <th>남성 닉네임</th>
              <th>남성 직군</th>
              <th>여성 닉네임</th>
              <th>여성 직군</th>
            </tr>
          </thead>
          <tbody>
            {results.map(row => (
              <tr key={row.id}>
                <td>{getPeriodDisplayNumber(row.period_id)}</td>
                <td>
                  <NicknameBtn onClick={()=>openModal(row.male)}>{row.male?.nickname || '-'}</NicknameBtn>
                </td>
                <td>{row.male?.job_type || '-'}</td>
                <td>
                  <NicknameBtn onClick={()=>openModal(row.female)}>{row.female?.nickname || '-'}</NicknameBtn>
                </td>
                <td>{row.female?.job_type || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
      {/* 프로필/선호스타일 모달 (신청현황 페이지와 동일 컴포넌트 사용) */}
      <ProfileDetailModal isOpen={modalOpen} onRequestClose={closeModal} user={modalUser ? { ...modalUser, email: modalUser.user?.email } : null} />
    </Container>
  );
};

export default MatchingResultPage; 