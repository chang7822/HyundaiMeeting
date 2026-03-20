import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { FaSyncAlt, FaServer, FaClock, FaFilter } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { logsApi } from '../../services/api';
import InlineSpinner from '../../components/InlineSpinner';

interface LogsPageProps {
  sidebarOpen: boolean;
}

const Container = styled.div<{ $sidebarOpen: boolean }>`
  min-height: 100vh;
  padding: 2rem;
  background: #f8f9fa;
  margin-left: ${props => props.$sidebarOpen ? '250px' : '0'};
  transition: margin-left 0.3s ease;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    margin-left: 0 !important;
    padding: 1rem;
    padding-top: 5rem;
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #7C3AED;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #5b21b6;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    transition: transform 0.3s;
  }
  
  &:hover svg {
    transform: rotate(180deg);
  }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.85rem;
  }
`;

const TabSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    gap: 12px;
    margin-bottom: 16px;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: ${props => props.$active ? '#7C3AED' : 'white'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background: ${props => props.$active ? '#5b21b6' : '#f3f4f6'};
  }
  
  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 0.9rem;
  }
`;

const ControlSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
`;

const LogInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: #6b7280;
  font-size: 0.9rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  
  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    
    button, select {
      width: 100%;
    }
  }
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: ${props => props.$danger ? '#ef4444' : '#10b981'};
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$danger ? '#dc2626' : '#059669'};
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const TimeFilterSelect = styled.select`
  padding: 8px 36px 8px 12px;
  border-radius: 6px;
  border: 1.5px solid #7C3AED;
  background: white url('data:image/svg+xml;utf8,<svg fill="%237C3AED" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7.293 8.293a1 1 0 011.414 0L10 9.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z"/></svg>') no-repeat right 8px center/16px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #7C3AED;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  min-width: 140px;
  
  &:hover {
    border-color: #5b21b6;
    background-color: #f5f3ff;
  }
  
  &:focus {
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  
  @media (max-width: 768px) {
    width: 100%;
    padding: 10px 36px 10px 12px;
  }
`;

const LogsContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: calc(100vh - 400px);
  overflow-y: auto;
  user-select: text;
  
  @media (max-width: 768px) {
    padding: 12px;
    max-height: calc(100vh - 450px);
  }
`;

const LogEntry = styled.div<{ $level: string }>`
  padding: 12px;
  margin-bottom: 8px;
  border-left: 4px solid ${props => 
    props.$level === 'error' ? '#ef4444' : 
    props.$level === 'warn' ? '#f59e0b' : 
    '#10b981'};
  background: ${props => 
    props.$level === 'error' ? '#fef2f2' : 
    props.$level === 'warn' ? '#fffbeb' : 
    '#f0fdf4'};
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  word-break: break-all;
  user-select: text;
  
  @media (max-width: 768px) {
    padding: 10px;
    font-size: 0.75rem;
  }
`;

const LogTimestamp = styled.span`
  color: #6b7280;
  font-weight: 600;
  margin-right: 12px;
`;

const LogLevel = styled.span<{ $level: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-right: 12px;
  background: ${props => 
    props.$level === 'error' ? '#ef4444' : 
    props.$level === 'warn' ? '#f59e0b' : 
    '#10b981'};
  color: white;
`;

const LogMessage = styled.div`
  margin-top: 4px;
  color: #1f2937;
  line-height: 1.5;
  user-select: text;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  
  svg {
    font-size: 3rem;
    margin-bottom: 16px;
  }
`;

const LogsPage: React.FC<LogsPageProps> = ({ sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState<'server' | 'scheduler'>('server');
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [schedulerLogs, setSchedulerLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'realtime' | '1h' | '4h' | '24h' | '3d' | '7d'>('realtime');
  const [isPageVisible, setIsPageVisible] = useState(true);
  const lastErrorTimeRef = useRef<number>(0);

  // Page Visibility API: 페이지가 보이는지 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsPageVisible(visible);
      
      // 페이지가 다시 보이게 되면 즉시 로그 새로고침
      if (visible && timeFilter === 'realtime') {
        loadLogs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timeFilter]);

  const loadLogs = useCallback(async () => {
    // 페이지가 보이지 않으면 API 호출 건너뛰기
    if (!isPageVisible) {
      return true;
    }

    setLoading(true);
    try {
      if (activeTab === 'server') {
        const response = await logsApi.getServerLogs(500);
        setServerLogs(response.logs);
      } else {
        const response = await logsApi.getSchedulerLogs(500);
        setSchedulerLogs(response.logs);
      }
      // 성공 시 에러 시간 초기화
      lastErrorTimeRef.current = 0;
    } catch (error: any) {
      console.error('로그 조회 오류:', error);
      
      // 401 Unauthorized 에러면 더 이상 요청하지 않음
      if (error?.response?.status === 401) {
        return false; // interval 중지 신호
      }
      
      // 페이지가 보일 때만 토스트 표시 + 5초 이내 중복 방지
      const now = Date.now();
      if (isPageVisible && (now - lastErrorTimeRef.current > 5000)) {
        toast.error('로그를 불러오는데 실패했습니다.');
        lastErrorTimeRef.current = now;
      }
    } finally {
      setLoading(false);
    }
    return true; // 계속 진행
  }, [activeTab, isPageVisible]);

  useEffect(() => {
    (async () => {
      await loadLogs();
    })();
  }, [activeTab]);

  // 실시간 모드일 때만 자동 새로고침
  useEffect(() => {
    if (timeFilter !== 'realtime') return;

    const interval = window.setInterval(async () => {
      // 페이지가 보일 때만 실행
      if (isPageVisible) {
        const shouldContinue = await loadLogs();
        if (!shouldContinue) {
          window.clearInterval(interval);
        }
      }
    }, 5000); // 5초마다

    return () => window.clearInterval(interval);
  }, [timeFilter, activeTab, isPageVisible]);

  // 시간 필터에 따라 로그 필터링
  const filteredLogs = useMemo(() => {
    const rawLogs = activeTab === 'server' ? serverLogs : schedulerLogs;
    
    if (timeFilter === 'realtime') {
      return rawLogs;
    }

    const now = Date.now();
    const timeRanges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const range = timeRanges[timeFilter];
    if (!range) return rawLogs;

    return rawLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return now - logTime <= range;
    });
  }, [serverLogs, schedulerLogs, activeTab, timeFilter]);

  const currentLogs = filteredLogs;

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <TitleRow>
        <Title>서버 로그 관리</Title>
        <RefreshButton onClick={() => window.location.reload()}>
          <FaSyncAlt />
          새로고침
        </RefreshButton>
      </TitleRow>

      <TabSection>
        <Tab $active={activeTab === 'server'} onClick={() => setActiveTab('server')}>
          <FaServer />
          서버 로그
        </Tab>
        <Tab $active={activeTab === 'scheduler'} onClick={() => setActiveTab('scheduler')}>
          <FaClock />
          스케줄러 로그
        </Tab>
      </TabSection>

      <ControlSection>
        <LogInfo>
          <div>
            <strong>{currentLogs.length}</strong>개의 로그
            {timeFilter !== 'realtime' && (
              <span style={{ marginLeft: '8px', color: '#7C3AED', fontSize: '0.85rem' }}>
                (필터링됨)
              </span>
            )}
          </div>
          {currentLogs.length > 0 && (
            <div>
              최신: {new Date(currentLogs[0]?.timestamp).toLocaleString('ko-KR')}
            </div>
          )}
          {timeFilter === 'realtime' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
              <FaClock />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>실시간 모드 (5초마다 갱신)</span>
            </div>
          )}
        </LogInfo>
        <ButtonGroup>
          <TimeFilterSelect 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value as any)}
          >
            <option value="realtime">🔴 실시간</option>
            <option value="1h">⏱️ 최근 1시간</option>
            <option value="4h">⏱️ 최근 4시간</option>
            <option value="24h">📅 최근 24시간</option>
            <option value="3d">📅 최근 3일</option>
            <option value="7d">📅 최근 7일</option>
          </TimeFilterSelect>
          <ActionButton onClick={loadLogs} disabled={loading}>
            <FaSyncAlt />
            {loading ? '로드 중...' : '새로고침'}
          </ActionButton>
        </ButtonGroup>
      </ControlSection>

      {loading && currentLogs.length === 0 ? (
        <LogsContainer>
          <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="로그를 불러오는 중입니다..." />
          </div>
        </LogsContainer>
      ) : currentLogs.length === 0 ? (
        <LogsContainer>
          <EmptyState>
            <FaServer />
            <div>로그가 없습니다</div>
          </EmptyState>
        </LogsContainer>
      ) : (
        <LogsContainer>
          {currentLogs.map((log, index) => (
            <LogEntry key={index} $level={log.level}>
              <div>
                <LogTimestamp>{new Date(log.timestamp).toLocaleString('ko-KR')}</LogTimestamp>
                <LogLevel $level={log.level}>{log.level}</LogLevel>
              </div>
              <LogMessage>{log.message}</LogMessage>
            </LogEntry>
          ))}
        </LogsContainer>
      )}
    </Container>
  );
};

export default LogsPage;

