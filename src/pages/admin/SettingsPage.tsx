import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { adminApi, pushApi } from '../../services/api.ts';

const MainContainer = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1.25rem;
    padding-top: var(--mobile-top-padding, 80px);
  }
`;

const ContentWrapper = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  min-height: calc(100vh - 4rem);
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 1.75rem 2rem;
  border-bottom: 1px solid #edf2f7;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
`;

const Body = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Section = styled.div`
  padding-bottom: 1.5rem;
  border-bottom: 1px dashed #e2e8f0;
  &:last-child {
    border-bottom: none;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #2d3748;
`;

const SectionDescription = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: #718096;
  white-space: pre-line;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: #f7fafc;
`;

const ToggleLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.95rem;
  color: #2d3748;
`;

const ToggleDescription = styled.span`
  font-size: 0.85rem;
  color: #718096;
`;

const SwitchLabel = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: #4F46E5;
  }

  &:focus + span {
    box-shadow: 0 0 1px #4F46E5;
  }

  &:checked + span:before {
    transform: translateX(24px);
  }
`;

const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 28px;

  &:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
`;

const PlaceholderArea = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px dashed #e2e8f0;
  background: #f9fafb;
  color: #a0aec0;
  font-size: 0.9rem;
  text-align: center;
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: ${(p: { disabled?: boolean }) =>
    p.disabled ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: ${(p: { disabled?: boolean }) => (p.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s;
`;

interface SettingsPageProps {
  sidebarOpen: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ sidebarOpen }) => {
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [devMode, setDevMode] = useState(false);
  const [devSaving, setDevSaving] = useState(false);
  const [extraMatching, setExtraMatching] = useState(true);
  const [extraMatchingSaving, setExtraMatchingSaving] = useState(false);
  const [community, setCommunity] = useState(true);
  const [communitySaving, setCommunitySaving] = useState(false);

  // 푸시 알림 전송 관련 상태
  const [users, setUsers] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushSending, setPushSending] = useState(false);

  // 회차 초기화 복구 관련 상태
  const [restorePeriodId, setRestorePeriodId] = useState<number>(0);
  const [restoring, setRestoring] = useState(false);

  // 관리자 매칭/채팅 데이터 삭제
  const [clearingAdminData, setClearingAdminData] = useState(false);

  // 버전 정책 관련 상태
  const [versionPolicy, setVersionPolicy] = useState({
    ios: { minimumVersion: '0.1.0', latestVersion: '0.1.0', storeUrl: '' },
    android: { minimumVersion: '0.1.0', latestVersion: '0.1.0', storeUrl: '' },
    messages: { forceUpdate: '', optionalUpdate: '' }
  });
  const [versionSaving, setVersionSaving] = useState(false);

  const [rpsStatsExcludedNicknames, setRpsStatsExcludedNicknames] = useState<string[]>([]);
  const [rpsExcludedInput, setRpsExcludedInput] = useState('');
  const [rpsExcludedSaving, setRpsExcludedSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getSystemSettings();
        setMaintenance(!!res?.maintenance?.enabled);
        setMaintenanceMessage(res?.maintenance?.message || '');
        setDevMode(!!res?.devMode?.enabled);
        setExtraMatching(res?.extraMatching?.enabled !== false);
        setCommunity(res?.community?.enabled !== false);
        
        // 버전 정책 로드
        if (res?.versionPolicy) {
          setVersionPolicy(res.versionPolicy as typeof versionPolicy);
        }
        // 가위바위보 통계 제외 닉네임
        if (Array.isArray(res?.rpsStatsExcluded?.nicknames)) {
          setRpsStatsExcludedNicknames(res.rpsStatsExcluded.nicknames);
        }
      } catch (e) {
        console.error('[SettingsPage] 시스템 설정 조회 오류:', e);
        toast.error('시스템 설정을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await adminApi.getAllUsers();
        setUsers(allUsers);
      } catch (e) {
        console.error('[SettingsPage] 사용자 목록 조회 오류:', e);
      }
    };
    fetchUsers();
  }, []);

  // 관리자 매칭 이력 및 채팅 메시지 삭제
  const handleClearAdminMatchingData = async () => {
    setClearingAdminData(true);
    try {
      const preview = await adminApi.clearAdminMatchingDataPreview();
      const { historyCount = 0, messagesCount = 0 } = preview;

      const msg = `다음 데이터가 삭제됩니다.\n\n• 매칭 이력: ${historyCount}건\n• 채팅 메시지: ${messagesCount}건\n\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`;
      if (!window.confirm(msg)) {
        return;
      }

      const res = await adminApi.clearAdminMatchingData();
      toast.success(res.message || `매칭 이력 ${res.historyDeleted}건, 채팅 메시지 ${res.messagesDeleted}건 삭제됨`);
    } catch (e: any) {
      console.error('[SettingsPage] 관리자 데이터 삭제 오류:', e);
      toast.error(e.response?.data?.message || '조회 또는 삭제 중 오류가 발생했습니다.');
    } finally {
      setClearingAdminData(false);
    }
  };

  // 회차 초기화 복구 핸들러
  const handleRestorePeriod = async () => {
    if (!restorePeriodId || restorePeriodId <= 0) {
      toast.error('유효한 회차 ID를 입력해주세요.');
      return;
    }

    if (!window.confirm(`회차 ${restorePeriodId}의 users 테이블을 복구하시겠습니까?\n\nis_applied와 is_matched가 해당 회차 데이터 기준으로 복구됩니다.`)) {
      return;
    }

    setRestoring(true);
    try {
      const res = await adminApi.restorePeriodUsers(restorePeriodId);
      toast.success(res.message || '회차 초기화가 복구되었습니다.');
    } catch (e: any) {
      console.error('[SettingsPage] 회차 복구 오류:', e);
      toast.error(e.response?.data?.message || '회차 복구 중 오류가 발생했습니다.');
    } finally {
      setRestoring(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const next = !maintenance;
    setMaintenance(next);
    setSaving(true);
    try {
      await adminApi.updateMaintenance(next, maintenanceMessage);
      toast.success(next ? '서버 점검 모드가 활성화되었습니다.' : '서버 점검 모드가 해제되었습니다.');
    } catch (e) {
      console.error('[SettingsPage] 유지보수 모드 업데이트 오류:', e);
      setMaintenance(!next); // 롤백
      toast.error('유지보수 모드를 변경하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleMessageBlur = async () => {
    setSaving(true);
    try {
      await adminApi.updateMaintenance(maintenance, maintenanceMessage);
      toast.success('서버 점검 안내 문구가 저장되었습니다.');
    } catch (e) {
      console.error('[SettingsPage] 유지보수 안내 문구 업데이트 오류:', e);
      toast.error('서버 점검 안내 문구를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDevMode = async () => {
    const next = !devMode;
    setDevMode(next);
    setDevSaving(true);
    try {
      await adminApi.updateDevMode(next);
      toast.success(next ? '관리자 모드(Dev Mode)가 활성화되었습니다.' : '관리자 모드(Dev Mode)가 비활성화되었습니다.');
    } catch (e) {
      console.error('[SettingsPage] Dev Mode 업데이트 오류:', e);
      setDevMode(!next); // 롤백
      toast.error('관리자 모드를 변경하지 못했습니다.');
    } finally {
      setDevSaving(false);
    }
  };

  const handleToggleExtraMatching = async () => {
    const next = !extraMatching;
    setExtraMatching(next);
    setExtraMatchingSaving(true);
    try {
      await adminApi.updateExtraMatching(next);
      toast.success(next ? '추가 매칭 도전 기능이 활성화되었습니다.' : '추가 매칭 도전 기능이 비활성화되었습니다.');
    } catch (e) {
      console.error('[SettingsPage] 추가 매칭 도전 업데이트 오류:', e);
      setExtraMatching(!next); // 롤백
      toast.error('추가 매칭 도전 설정을 변경하지 못했습니다.');
    } finally {
      setExtraMatchingSaving(false);
    }
  };

  const handleToggleCommunity = async () => {
    const next = !community;
    setCommunity(next);
    setCommunitySaving(true);
    try {
      await adminApi.updateCommunity(next);
      toast.success(next ? '커뮤니티 기능이 활성화되었습니다.' : '커뮤니티 기능이 비활성화되었습니다.');
    } catch (e) {
      console.error('[SettingsPage] 커뮤니티 업데이트 오류:', e);
      setCommunity(!next); // 롤백
      toast.error('커뮤니티 설정을 변경하지 못했습니다.');
    } finally {
      setCommunitySaving(false);
    }
  };

  const handleSendPush = async () => {
    if (!selectedEmail) {
      toast.error('이메일을 선택해주세요.');
      return;
    }
    if (!pushTitle.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!pushMessage.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    setPushSending(true);
    try {
      const result = await pushApi.sendAdminPush(selectedEmail, pushTitle, pushMessage);
      if (result.success) {
        toast.success(`푸시 알림이 성공적으로 전송되었습니다. (${result.sent || 0}건)`);
        setPushTitle('');
        setPushMessage('');
        setSelectedEmail('');
      } else {
        toast.error(result.message || '푸시 알림 전송에 실패했습니다.');
      }
    } catch (e: any) {
      console.error('[SettingsPage] 푸시 전송 오류:', e);
      toast.error(e?.response?.data?.message || '푸시 알림 전송 중 오류가 발생했습니다.');
    } finally {
      setPushSending(false);
    }
  };

  // 버전 정책 저장
  const handleSaveVersionPolicy = async () => {
    setVersionSaving(true);
    try {
      const result = await adminApi.updateVersionPolicy(versionPolicy);
      toast.success('버전 정책이 업데이트되었습니다.');
    } catch (e: any) {
      console.error('[SettingsPage] 버전 정책 업데이트 오류:', e);
      toast.error(e?.response?.data?.message || '버전 정책 업데이트에 실패했습니다.');
    } finally {
      setVersionSaving(false);
    }
  };

  const handleAddRpsExcluded = () => {
    const n = rpsExcludedInput.trim();
    if (!n) return;
    if (rpsStatsExcludedNicknames.includes(n)) {
      toast.warn('이미 목록에 있습니다.');
      return;
    }
    setRpsStatsExcludedNicknames((prev) => [...prev, n]);
    setRpsExcludedInput('');
  };

  const handleRemoveRpsExcluded = (index: number) => {
    setRpsStatsExcludedNicknames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRpsStatsExcluded = async () => {
    setRpsExcludedSaving(true);
    try {
      await adminApi.updateRpsStatsExcluded(rpsStatsExcludedNicknames);
      toast.success('가위바위보 통계 제외 목록이 저장되었습니다.');
    } catch (e: any) {
      console.error('[SettingsPage] RPS 통계 제외 저장 오류:', e);
      toast.error(e?.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setRpsExcludedSaving(false);
    }
  };


  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <ContentWrapper>
        <Header>
          <Title>설정</Title>
          <Subtitle>
            서비스 전역에 영향을 주는 설정들을 관리합니다.
          </Subtitle>
        </Header>
        <Body>
          <Section>
            <SectionTitle>서버 점검 모드</SectionTitle>
            <SectionDescription>
              서버 점검 중에는 관리자 계정을 제외한 모든 사용자가
              {'\n'}\"서버 점검중입니다\" 화면만 보게 되고, 다른 기능을 사용할 수 없습니다.
            </SectionDescription>
            <ToggleRow>
              <ToggleLabel>
                <span>서버 점검 활성화</span>
                <ToggleDescription>
                  {maintenance
                    ? '현재 서버 점검 모드가 켜져 있습니다. (일반 사용자는 진입 불가)'
                    : '현재 서버 점검 모드가 꺼져 있습니다. (모든 사용자가 정상 이용 가능)'}
                </ToggleDescription>
              </ToggleLabel>
              <SwitchLabel>
                <SwitchInput
                  type="checkbox"
                  checked={maintenance}
                  onChange={handleToggleMaintenance}
                  disabled={loading || saving}
                />
                <SwitchSlider />
              </SwitchLabel>
            </ToggleRow>

            <div style={{ marginTop: '1rem' }}>
              <SectionTitle style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>서버 점검 안내 문구</SectionTitle>
              <SectionDescription>
                서버 점검 화면 하단에 노출될 안내 문구입니다.
                {'\n'}점검 사유, 예상 종료 시각 등을 자유롭게 작성해주세요.
              </SectionDescription>
              <textarea
                value={maintenanceMessage}
                onChange={e => setMaintenanceMessage(e.target.value)}
                onBlur={handleMessageBlur}
                rows={4}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder={'예) 서버 성능 개선을 위한 점검이 진행 중입니다.\n예상 종료 시각: 21:30\n불편을 드려 죄송합니다.'}
                disabled={saving}
              />
            </div>
          </Section>

          <Section>
            <SectionTitle>관리자 모드</SectionTitle>
            <ToggleRow>
              <ToggleLabel>
                <span>관리자 모드 (Dev Mode)</span>
                <ToggleDescription>
                  {devMode
                    ? '관리자/운영용 기능이 활성화된 상태입니다. (실험적인 UI/기능 노출 가능)'
                    : '관리자 모드가 비활성화된 상태입니다. 일반 운영 모드로 동작합니다.'}
                </ToggleDescription>
              </ToggleLabel>
              <SwitchLabel>
                <SwitchInput
                  type="checkbox"
                  checked={devMode}
                  onChange={handleToggleDevMode}
                  disabled={loading || devSaving}
                />
                <SwitchSlider />
              </SwitchLabel>
            </ToggleRow>
          </Section>

          <Section>
            <SectionTitle>추가 매칭 도전 기능</SectionTitle>
            <SectionDescription>
              추가 매칭 도전 기능을 활성화/비활성화할 수 있습니다.
              {'\n'}비활성화 시 사이드바 메뉴, 메인 페이지 배너, 알림 등 모든 관련 기능이 숨겨집니다.
            </SectionDescription>
            <ToggleRow>
              <ToggleLabel>
                <span>추가 매칭 도전 기능</span>
                <ToggleDescription>
                  {extraMatching
                    ? '추가 매칭 도전 기능이 활성화되어 있습니다. (회원들이 기능을 사용할 수 있음)'
                    : '추가 매칭 도전 기능이 비활성화되어 있습니다. (회원들에게 노출되지 않음)'}
                </ToggleDescription>
              </ToggleLabel>
              <SwitchLabel>
                <SwitchInput
                  type="checkbox"
                  checked={extraMatching}
                  onChange={handleToggleExtraMatching}
                  disabled={loading || extraMatchingSaving}
                />
                <SwitchSlider />
              </SwitchLabel>
            </ToggleRow>
          </Section>

          <Section>
            <SectionTitle>커뮤니티 기능</SectionTitle>
            <SectionDescription>
              커뮤니티 기능을 활성화/비활성화할 수 있습니다.
              {'\n'}비활성화 시 사이드바 메뉴가 비활성화되며 접근이 차단됩니다. (문제 발생 시 디버깅용)
            </SectionDescription>
            <ToggleRow>
              <ToggleLabel>
                <span>커뮤니티 기능</span>
                <ToggleDescription>
                  {community
                    ? '커뮤니티 기능이 활성화되어 있습니다. (회원들이 기능을 사용할 수 있음)'
                    : '커뮤니티 기능이 비활성화되어 있습니다. (회원들에게 접근이 차단됨)'}
                </ToggleDescription>
              </ToggleLabel>
              <SwitchLabel>
                <SwitchInput
                  type="checkbox"
                  checked={community}
                  onChange={handleToggleCommunity}
                  disabled={loading || communitySaving}
                />
                <SwitchSlider />
              </SwitchLabel>
            </ToggleRow>
          </Section>

          <Section>
            <SectionTitle>가위바위보 통계 제외</SectionTitle>
            <SectionDescription>
              아래 목록에 넣은 닉네임(관리자 포함)은 가위바위보 통계(누적/오늘/주간)에 노출되지 않습니다.
              {'\n'}닉네임을 입력 후 추가하고, 저장 버튼을 눌러 적용하세요.
            </SectionDescription>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={rpsExcludedInput}
                  onChange={(e) => setRpsExcludedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRpsExcluded())}
                  placeholder="닉네임 입력"
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    width: '160px',
                    outline: 'none',
                  }}
                  disabled={rpsExcludedSaving}
                />
                <button
                  type="button"
                  onClick={handleAddRpsExcluded}
                  disabled={rpsExcludedSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  추가
                </button>
              </div>
              {rpsStatsExcludedNicknames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  {rpsStatsExcludedNicknames.map((nick, i) => (
                    <span
                      key={`${nick}-${i}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.6rem',
                        borderRadius: 8,
                        background: '#eef2ff',
                        color: '#4338ca',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      {nick}
                      <button
                        type="button"
                        onClick={() => handleRemoveRpsExcluded(i)}
                        disabled={rpsExcludedSaving}
                        style={{
                          padding: 0,
                          margin: 0,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#6366f1',
                          fontSize: '1rem',
                          lineHeight: 1,
                        }}
                        aria-label="제거"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleSaveRpsStatsExcluded}
                disabled={rpsExcludedSaving || loading}
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.5rem 1rem',
                  borderRadius: 8,
                  border: 'none',
                  background: rpsExcludedSaving ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: rpsExcludedSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {rpsExcludedSaving ? '저장 중…' : '저장'}
              </button>
            </div>
          </Section>

          <Section>
            <SectionTitle>앱 버전 관리</SectionTitle>
            <SectionDescription>
              iOS/Android 앱 버전을 관리하고 강제 업데이트를 설정할 수 있습니다.
              {'\n'}최소 버전보다 낮은 버전은 자동으로 강제 업데이트됩니다.
            </SectionDescription>

            {/* iOS 버전 설정 */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d3748', margin: '0 0 1rem 0' }}>iOS 앱</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '0.3rem' }}>
                    최소 버전 (강제 업데이트)
                  </label>
                  <input
                    type="text"
                    value={versionPolicy.ios.minimumVersion}
                    onChange={(e) => setVersionPolicy(prev => ({
                      ...prev,
                      ios: { ...prev.ios, minimumVersion: e.target.value }
                    }))}
                    placeholder="0.1.0"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    disabled={versionSaving}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '0.3rem' }}>
                    최신 버전 (권장 업데이트)
                  </label>
                  <input
                    type="text"
                    value={versionPolicy.ios.latestVersion}
                    onChange={(e) => setVersionPolicy(prev => ({
                      ...prev,
                      ios: { ...prev.ios, latestVersion: e.target.value }
                    }))}
                    placeholder="0.1.0"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    disabled={versionSaving}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '0.3rem' }}>
                    App Store URL
                  </label>
                  <input
                    type="text"
                    value={versionPolicy.ios.storeUrl}
                    onChange={(e) => setVersionPolicy(prev => ({
                      ...prev,
                      ios: { ...prev.ios, storeUrl: e.target.value }
                    }))}
                    placeholder="https://apps.apple.com/app/id123456789"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    disabled={versionSaving}
                  />
                </div>
              </div>
            </div>

            {/* Android 버전 설정 */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d3748', margin: '0 0 1rem 0' }}>Android 앱</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '0.3rem' }}>
                    최소 버전 (강제 업데이트)
                  </label>
                  <input
                    type="text"
                    value={versionPolicy.android.minimumVersion}
                    onChange={(e) => setVersionPolicy(prev => ({
                      ...prev,
                      android: { ...prev.android, minimumVersion: e.target.value }
                    }))}
                    placeholder="0.1.0"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    disabled={versionSaving}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '0.3rem' }}>
                    최신 버전 (권장 업데이트)
                  </label>
                  <input
                    type="text"
                    value={versionPolicy.android.latestVersion}
                    onChange={(e) => setVersionPolicy(prev => ({
                      ...prev,
                      android: { ...prev.android, latestVersion: e.target.value }
                    }))}
                    placeholder="0.1.0"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    disabled={versionSaving}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '0.3rem' }}>
                    Google Play Store URL
                  </label>
                  <input
                    type="text"
                    value={versionPolicy.android.storeUrl}
                    onChange={(e) => setVersionPolicy(prev => ({
                      ...prev,
                      android: { ...prev.android, storeUrl: e.target.value }
                    }))}
                    placeholder="https://play.google.com/store/apps/details?id=com.solo.meeting"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    disabled={versionSaving}
                  />
                </div>
              </div>
            </div>

            {/* 메시지 설정 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#2d3748', marginBottom: '0.4rem' }}>
                  강제 업데이트 메시지
                </label>
                <textarea
                  value={versionPolicy.messages.forceUpdate}
                  onChange={(e) => setVersionPolicy(prev => ({
                    ...prev,
                    messages: { ...prev.messages, forceUpdate: e.target.value }
                  }))}
                  rows={2}
                  placeholder="필수 업데이트가 필요합니다.\n최신 버전으로 업데이트해주세요."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  disabled={versionSaving}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#2d3748', marginBottom: '0.4rem' }}>
                  선택적 업데이트 메시지
                </label>
                <textarea
                  value={versionPolicy.messages.optionalUpdate}
                  onChange={(e) => setVersionPolicy(prev => ({
                    ...prev,
                    messages: { ...prev.messages, optionalUpdate: e.target.value }
                  }))}
                  rows={2}
                  placeholder="새로운 버전을 사용하시겠어요?\n최신 기능과 개선 사항을 경험해보세요."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  disabled={versionSaving}
                />
              </div>
            </div>

            <SaveButton
              onClick={handleSaveVersionPolicy}
              disabled={versionSaving}
              style={{ marginTop: '1rem' }}
            >
              {versionSaving ? '저장 중...' : '버전 정책 저장'}
            </SaveButton>
          </Section>

          <Section>
            <SectionTitle>푸시알림 보내기</SectionTitle>
            <SectionDescription>
              특정 회원에게 관리자가 직접 푸시 알림을 전송할 수 있습니다.
              {'\n'}푸시 토큰이 등록된 사용자에게만 알림이 전송됩니다.
            </SectionDescription>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#2d3748', marginBottom: '0.4rem' }}>
                  회원 이메일 선택
                </label>
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  disabled={pushSending}
                >
                  <option value="">이메일을 선택하세요</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.email} {user.nickname ? `(${user.nickname})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#2d3748', marginBottom: '0.4rem' }}>
                  제목
                </label>
                <input
                  type="text"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  placeholder="알림 제목을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  disabled={pushSending}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#2d3748', marginBottom: '0.4rem' }}>
                  내용
                </label>
                <textarea
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  placeholder="알림 내용을 입력하세요"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  disabled={pushSending}
                />
              </div>

              <button
                onClick={handleSendPush}
                disabled={pushSending || !selectedEmail || !pushTitle.trim() || !pushMessage.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 8,
                  border: 'none',
                  background: pushSending || !selectedEmail || !pushTitle.trim() || !pushMessage.trim() 
                    ? '#cbd5e0' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: pushSending || !selectedEmail || !pushTitle.trim() || !pushMessage.trim() 
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {pushSending ? '전송 중...' : '푸시 알림 전송'}
              </button>
            </div>
          </Section>

          <Section>
            <SectionTitle>관리자 매칭/채팅 데이터 삭제</SectionTitle>
            <SectionDescription>
              로그인한 관리자 본인의 matching_history와 관련 chat_messages를 모두 삭제합니다.
              {'\n'}테스트용 매칭 이력·채팅 정리가 필요할 때 사용하세요. 되돌릴 수 없습니다.
            </SectionDescription>

            <button
              onClick={handleClearAdminMatchingData}
              disabled={clearingAdminData}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 8,
                border: 'none',
                background: clearingAdminData ? '#cbd5e0' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: clearingAdminData ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {clearingAdminData ? '삭제 중...' : '관리자 매칭·채팅 데이터 삭제'}
            </button>
          </Section>

          <Section>
            <SectionTitle>회차 초기화 복구</SectionTitle>
            <SectionDescription>
              잘못된 초기화로 인해 users 테이블의 is_applied, is_matched가 손상된 경우 복구합니다.
              {'\n'}해당 회차의 matching_applications와 matching_history 데이터를 기준으로 복구됩니다.
            </SectionDescription>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#2d3748', marginBottom: '0.4rem' }}>
                  회차 ID
                </label>
                <input
                  type="number"
                  value={restorePeriodId || ''}
                  onChange={(e) => setRestorePeriodId(Number(e.target.value))}
                  placeholder="복구할 회차 ID를 입력하세요 (예: 116)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  disabled={restoring}
                />
              </div>

              <button
                onClick={handleRestorePeriod}
                disabled={restoring || !restorePeriodId || restorePeriodId <= 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 8,
                  border: 'none',
                  background: restoring || !restorePeriodId || restorePeriodId <= 0
                    ? '#cbd5e0' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: restoring || !restorePeriodId || restorePeriodId <= 0
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {restoring ? '복구 중...' : '회차 초기화 복구 적용'}
              </button>

              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: '#fff3cd',
                border: '1px solid #ffc107',
                fontSize: '0.85rem',
                color: '#856404',
              }}>
                ⚠️ 주의: 이 기능은 잘못된 초기화를 복구하는 긴급 기능입니다. 신중하게 사용하세요.
              </div>
            </div>
          </Section>

        </Body>
      </ContentWrapper>
    </MainContainer>
  );
};

export default SettingsPage;


