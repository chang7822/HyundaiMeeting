import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { adminApi, pushApi } from '../../services/api.ts';
import { getFirebaseMessaging, FIREBASE_VAPID_KEY } from '../../firebase.ts';

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
    padding-top: 80px;
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
  display: inline-block;
  width: 52px;
  height: 28px;
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
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('pushEnabled_admin');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [isPushBusy, setIsPushBusy] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getSystemSettings();
        setMaintenance(!!res?.maintenance?.enabled);
        setMaintenanceMessage(res?.maintenance?.message || '');
        setDevMode(!!res?.devMode?.enabled);
      } catch (e) {
        console.error('[SettingsPage] 시스템 설정 조회 오류:', e);
        toast.error('시스템 설정을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

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

  const handleTogglePush = useCallback(async () => {
    if (isPushBusy) return;

    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      toast.error('이 브라우저에서는 푸시 알림을 사용할 수 없습니다.');
      return;
    }

    const next = !isPushEnabled;

    // OFF → ON
    if (next) {
      try {
        setIsPushBusy(true);

        const currentPermission = Notification.permission;
        let permission = currentPermission;

        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          toast.error('브라우저 알림 권한을 허용해야 푸시 알림을 받을 수 있습니다.');
          setIsPushBusy(false);
          return;
        }

        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          console.error('[push][admin] getFirebaseMessaging() 이 null을 반환했습니다.');
          console.error('[push][admin] Notification.permission:', Notification.permission);
          console.error('[push][admin] VAPID 키 존재 여부:', !!FIREBASE_VAPID_KEY);
          toast.error('푸시 알림 초기화에 실패했습니다. 잠시 후 다시 시도해 주세요.');
          setIsPushBusy(false);
          return;
        }

        if (!FIREBASE_VAPID_KEY) {
          console.warn('[push][admin] VAPID 키가 설정되지 않았습니다. .env에 REACT_APP_FIREBASE_VAPID_KEY를 추가해주세요.');
        }

        const { getToken } = await import('firebase/messaging');

        // 서비스워커를 명시적으로 등록
        let registration: ServiceWorkerRegistration | undefined;
        try {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.info('[push][admin] service worker 등록 성공:', registration.scope);
        } catch (swErr) {
          console.error('[push][admin] service worker 등록 실패:', swErr);
          toast.error('푸시 알림용 서비스워커 등록에 실패했습니다.');
          setIsPushBusy(false);
          return;
        }

        // 일부 환경에서는 register 직후 아직 active 상태가 아니라 PushManager.subscribe 가 실패할 수 있으므로
        // navigator.serviceWorker.ready 로 활성화까지 기다린 뒤 사용
        let readyRegistration: ServiceWorkerRegistration;
        try {
          readyRegistration = await navigator.serviceWorker.ready;
          console.info('[push][admin] service worker ready:', readyRegistration.scope);
        } catch (readyErr) {
          console.error('[push][admin] service worker ready 대기 중 오류:', readyErr);
          toast.error('푸시 알림용 서비스워커 활성화에 실패했습니다.');
          setIsPushBusy(false);
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: FIREBASE_VAPID_KEY || undefined,
          serviceWorkerRegistration: readyRegistration,
        });

        if (!token) {
          toast.error('푸시 토큰을 발급받지 못했습니다. 잠시 후 다시 시도해 주세요.');
          setIsPushBusy(false);
          return;
        }

        // 서버에 토큰 등록
        await pushApi.registerToken(token);

        // 테스트 푸시 알림 전송
        try {
          await pushApi.sendTestNotification();
        } catch (e) {
          console.error('[push][admin] 테스트 푸시 전송 중 오류:', e);
        }

        try {
          localStorage.setItem('pushEnabled_admin', 'true');
          localStorage.setItem('pushFcmToken_admin', token);
        } catch {
          // localStorage 실패는 무시
        }

        setIsPushEnabled(true);
        toast.success('관리자 계정에 푸시 알림이 활성화되었습니다.');
      } catch (e) {
        console.error('[push][admin] 푸시 활성화 중 오류:', e);
        toast.error('푸시 알림 설정 중 오류가 발생했습니다.');
      } finally {
        setIsPushBusy(false);
      }
      return;
    }

    // ON → OFF
    try {
      setIsPushBusy(true);
      let token: string | undefined;
      try {
        const storedToken = localStorage.getItem('pushFcmToken_admin');
        if (storedToken) token = storedToken;
      } catch {
        // ignore
      }

      await pushApi.unregisterToken(token);

      try {
        localStorage.setItem('pushEnabled_admin', 'false');
      } catch {
        // ignore
      }

      setIsPushEnabled(false);
      toast.success('관리자 계정 푸시 알림이 비활성화되었습니다.');
    } catch (e) {
      console.error('[push][admin] 푸시 비활성화 중 오류:', e);
      toast.error('푸시 알림 해제 중 오류가 발생했습니다.');
    } finally {
      setIsPushBusy(false);
    }
  }, [isPushEnabled, isPushBusy]);

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
            <SectionTitle>웹 푸시 알림 (관리자 테스트 전용)</SectionTitle>
            <SectionDescription>
              관리자 계정으로만 Web Push(Firebase FCM)를 테스트하기 위한 설정입니다.
              {'\n'}일반 사용자는 이 토글을 볼 수 없으며, 실제 운영 적용 전 테스트용으로만 사용하세요.
            </SectionDescription>
            <ToggleRow>
              <ToggleLabel>
                <span>관리자 푸시 알림 토글</span>
                <ToggleDescription>
                  {isPushEnabled
                    ? '현재 이 관리자 계정에 대한 Web Push 테스트가 활성화되어 있습니다.'
                    : '현재 이 관리자 계정에 대한 Web Push 테스트가 비활성화되어 있습니다.'}
                </ToggleDescription>
              </ToggleLabel>
              <SwitchLabel>
                <SwitchInput
                  type="checkbox"
                  checked={isPushEnabled}
                  onChange={handleTogglePush}
                  disabled={loading || isPushBusy}
                />
                <SwitchSlider />
              </SwitchLabel>
            </ToggleRow>
          </Section>

        </Body>
      </ContentWrapper>
    </MainContainer>
  );
};

export default SettingsPage;


