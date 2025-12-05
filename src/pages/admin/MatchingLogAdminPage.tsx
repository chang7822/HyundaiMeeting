import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Modal from 'react-modal';
import { adminMatchingApi } from '../../services/api.ts';
import InlineSpinner from '../../components/InlineSpinner.tsx';

// API 함수들
const fetchMatchingLogs = async () => {
  try {
    return await adminMatchingApi.getMatchingLogs();
  } catch (error) {
    console.error('매칭 로그 조회 오류:', error);
    return [];
  }
};
const createMatchingLog = async (log: any) => {
  try {
    return await adminMatchingApi.createMatchingLog(log);
  } catch (error) {
    console.error('매칭 로그 생성 오류:', error);
    throw new Error('생성 실패');
  }
};
const updateMatchingLog = async (id: number, log: any) => {
  try {
    return await adminMatchingApi.updateMatchingLog(id, log);
  } catch (error) {
    console.error('매칭 로그 수정 오류:', error);
    throw new Error('수정 실패');
  }
};
const deleteMatchingLog = async (id: number) => {
  try {
    return await adminMatchingApi.deleteMatchingLog(id);
  } catch (error) {
    console.error('매칭 로그 삭제 오류:', error);
    throw new Error('삭제 실패');
  }
};

const Container = styled.div<{ $sidebarOpen: boolean }>`
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(80,60,180,0.08);
  padding: 32px 24px;
  max-width: 1200px;
  margin-left: ${props => (window.innerWidth > 768 && props.$sidebarOpen) ? '280px' : '0'};
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;
const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 24px;
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
    padding: 12px 8px;
    text-align: center;
    white-space: nowrap;
  }
  th {
    background: #f7f7fa;
    font-weight: 600;
  }
`;
const Button = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-weight: 600;
  margin: 0 4px;
  cursor: pointer;
  &:hover { background: #5b21b6; }
`;
const Input = styled.input`
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 8px;
`;

Modal.setAppElement('#root');

// 날짜/시간 포맷 함수 (KST 기준)
const formatKST = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}시 ${min}분`;
};

const MatchingLogAdminPage = ({ isSidebarOpen, setSidebarOpen }: { isSidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    application_start: null,
    application_end: null,
    matching_announce: null,
    matching_run: null,
    finish: null,
    executed: false,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMatchingLogs().then(setLogs).finally(()=>setLoading(false));
  }, []);

  const handleEdit = (log: any) => {
    setEditing(log.id);
    setForm({ ...log, executed: !!log.executed });
    setModalOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm('이 회차의 모든 신청/매칭 데이터도 함께 삭제됩니다.\n정말 삭제하시겠습니까?')) return;
    await deleteMatchingLog(id);
    setLogs(logs.filter(l => l.id !== id));
  };
  // 5개 항목 모두 입력됐는지 체크
  const isFormValid = !!(form.application_start && form.application_end && form.matching_announce && form.matching_run && form.finish);

  const handleSave = async () => {
    if (!isFormValid) {
      alert('모든 날짜/시간 항목을 입력해 주세요.');
      return;
    }

    try {
      const start = new Date(form.application_start);
      const end = new Date(form.application_end);
      const run = new Date(form.matching_run);
      const announce = new Date(form.matching_announce);
      const fin = new Date(form.finish);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(run.getTime()) || Number.isNaN(announce.getTime()) || Number.isNaN(fin.getTime())) {
        alert('유효하지 않은 날짜/시간 형식이 있습니다.');
        return;
      }

      if (!(start.getTime() < end.getTime())) {
        alert('신청 마감 시간은 신청 시작 시간보다 늦어야 합니다.');
        return;
      }
      if (run.getTime() < end.getTime()) {
        alert('매칭 실행 시간은 신청 마감 시간 이후여야 합니다.');
        return;
      }
      if (announce.getTime() < run.getTime()) {
        alert('결과 발표 시간은 매칭 실행 시간 이후여야 합니다.');
        return;
      }
      if (fin.getTime() < announce.getTime()) {
        alert('회차 종료 시간은 결과 발표 시간 이후여야 합니다.');
        return;
      }

      if (editing) {
        await updateMatchingLog(editing, form);
        setLogs(logs.map(l => l.id === editing ? { ...form, id: editing } : l));
      } else {
        const newLog = await createMatchingLog(form);
        setLogs([...logs, newLog]);
      }
      setEditing(null);
      setModalOpen(false);
      setForm({ application_start: null, application_end: null, matching_announce: null, matching_run: null, finish: null, executed: false });
    } catch (e) {
      alert('회차 저장 중 오류가 발생했습니다.');
    }
  };
  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleTestData = () => {
    const now = new Date();
    // 초와 밀리초를 0으로 설정하여 정시로 맞춤
    now.setSeconds(0, 0);
    
    const testData = {
      application_start: new Date(now.getTime() + 2 * 60 * 1000).toISOString(), // 2분 후
      application_end: new Date(now.getTime() + 3 * 60 * 1000).toISOString(), // 3분 후
      matching_run: new Date(now.getTime() + 4 * 60 * 1000).toISOString(), // 4분 후
      matching_announce: new Date(now.getTime() + 6 * 60 * 1000).toISOString(), // 6분 후
      finish: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 후
      executed: false
    };
    setForm(testData);
  };

  // 신청 시작일을 기준으로 자동 일정 생성
  const handleAutoScheduleFromStart = () => {
    if (!form.application_start) {
      alert('먼저 "신청 시작" 날짜/시간을 입력해주세요.');
      return;
    }

    const base = new Date(form.application_start);
    if (isNaN(base.getTime())) {
      alert('유효한 신청 시작일이 아닙니다.');
      return;
    }

    // 초와 밀리초 0으로 정리
    base.setSeconds(0, 0);

    // 신청 마감: 신청 시작일 기준 6일 후 19:00
    const applicationEnd = new Date(base);
    applicationEnd.setDate(applicationEnd.getDate() + 6);
    applicationEnd.setHours(19, 0, 0, 0);

    // 매칭 실행: 신청 시작일 기준 6일 후 19:30
    const matchingRun = new Date(base);
    matchingRun.setDate(matchingRun.getDate() + 6);
    matchingRun.setHours(19, 30, 0, 0);

    // 매칭 공지: 신청 시작일 기준 7일 후 10:00
    const matchingAnnounce = new Date(base);
    matchingAnnounce.setDate(matchingAnnounce.getDate() + 7);
    matchingAnnounce.setHours(10, 0, 0, 0);

    // 회차 종료: 매칭 공지 3일 후 22:00
    const finish = new Date(matchingAnnounce);
    finish.setDate(finish.getDate() + 3);
    finish.setHours(22, 0, 0, 0);

    setForm((prev: any) => ({
      ...prev,
      application_end: applicationEnd.toISOString(),
      matching_run: matchingRun.toISOString(),
      matching_announce: matchingAnnounce.toISOString(),
      finish: finish.toISOString(),
    }));
  };

  return (
    <Container $sidebarOpen={isSidebarOpen}>
      <Title>매칭 회차 관리</Title>
      {loading ? (
        <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
          <InlineSpinner text="매칭 회차 데이터를 불러오는 중입니다..." />
        </div>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>신청 시작</th>
                  <th>신청 마감</th>
                  <th>매칭 실행</th>
                  <th>결과 발표</th>
                  <th>회차 종료</th>
                  <th>실행됨</th>
                  <th>수정/삭제</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id}>
                    <td>{idx + 1}</td>
                    <td>{formatKST(log.application_start)}</td>
                    <td>{formatKST(log.application_end)}</td>
                    <td>{formatKST(log.matching_run)}</td>
                    <td>{formatKST(log.matching_announce)}</td>
                    <td>{formatKST(log.finish)}</td>
                    <td>{log.executed ? '✅' : ''}</td>
                    <td>
                      <Button onClick={() => handleEdit(log)}>수정</Button>
                      <Button style={{ background: '#e74c3c' }} onClick={() => handleDelete(log.id)}>삭제</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
          <Button onClick={() => { setModalOpen(true); setEditing(null); setForm({ application_start: null, application_end: null, matching_announce: null, matching_run: null, finish: null, executed: false }); }}>새 회차 추가</Button>
        </>
      )}
      <Modal
        isOpen={modalOpen || !!editing}
        onRequestClose={() => { setModalOpen(false); setEditing(null); }}
        style={{ content: { maxWidth: 480, margin: 'auto', borderRadius: 12, padding: 32 } }}
        contentLabel="매칭 회차 추가/수정"
      >
        <h3 style={{ marginBottom: 18 }}>{editing ? '회차 수정' : '새 회차 추가'}</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>신청 시작</div>
            <DatePicker
              selected={form.application_start ? new Date(form.application_start) : null}
              onChange={date => handleChange('application_start', date ? date.toISOString() : null)}
              showTimeSelect
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="날짜/시간 선택"
              popperPlacement="bottom-start"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>신청 마감</div>
            <DatePicker
              selected={form.application_end ? new Date(form.application_end) : null}
              onChange={date => handleChange('application_end', date ? date.toISOString() : null)}
              showTimeSelect
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="날짜/시간 선택"
              popperPlacement="bottom-start"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>매칭 실행</div>
            <DatePicker
              selected={form.matching_run ? new Date(form.matching_run) : null}
              onChange={date => handleChange('matching_run', date ? date.toISOString() : null)}
              showTimeSelect
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="날짜/시간 선택"
              popperPlacement="bottom-start"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>결과 발표</div>
            <DatePicker
              selected={form.matching_announce ? new Date(form.matching_announce) : null}
              onChange={date => handleChange('matching_announce', date ? date.toISOString() : null)}
              showTimeSelect
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="날짜/시간 선택"
              popperPlacement="bottom-start"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>회차 종료</div>
            <DatePicker
              selected={form.finish ? new Date(form.finish) : null}
              onChange={date => handleChange('finish', date ? date.toISOString() : null)}
              showTimeSelect
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="날짜/시간 선택"
              popperPlacement="bottom-start"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>실행됨</div>
            <input type="checkbox" checked={form.executed} onChange={e => handleChange('executed', e.target.checked)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <Button onClick={handleSave} disabled={!isFormValid}>{editing ? '수정 완료' : '추가'}</Button>
          <Button style={{ background: '#888' }} onClick={() => { setModalOpen(false); setEditing(null); setForm({ application_start: null, application_end: null, matching_announce: null, matching_run: null, finish: null, executed: false }); }}>취소</Button>
          <Button style={{ background: '#27ae60' }} onClick={handleTestData}>테스트</Button>
          <Button
            style={{
              background: form.application_start ? '#10b981' : '#9ca3af',
              cursor: form.application_start ? 'pointer' : 'not-allowed',
            }}
            onClick={handleAutoScheduleFromStart}
            disabled={!form.application_start}
          >
            자동 일정
          </Button>
        </div>
      </Modal>
    </Container>
  );
};

export default MatchingLogAdminPage; 