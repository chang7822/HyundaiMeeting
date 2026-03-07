/**
 * 푸시 알림 ON/OFF 토글 행 (메인페이지 환영문구 아래용)
 * MatchingApplyPage와 동일한 로직 사용
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { pushApi } from '../services/api.ts';
import IosWebAppGuideModal from './IosWebAppGuideModal.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getFirebaseMessaging, FIREBASE_VAPID_KEY, isNativeApp, getNativePushToken, setupNativePushListeners, getNativePushPermissionStatus, requestNativePushPermission } from '../firebase.ts';
import { Capacitor, registerPlugin } from '@capacitor/core';

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
  gap: 8px;
`;

const IosGuideButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #c7d2fe;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  &:hover { color: #e5e7ff; }
`;

const PushToggleBlock = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

const SwitchLabel = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 18px;
  flex-shrink: 0;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  &:checked + span { background-color: #4F46E5; }
  &:focus + span { box-shadow: 0 0 1px #4F46E5; }
  &:checked + span:before { transform: translateX(16px); }
  &:disabled + span { opacity: 0.5; cursor: not-allowed; }
`;

const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 18px;
  &:before {
    position: absolute;
    content: "";
    height: 15px; width: 15px;
    left: 1.5px; bottom: 1.5px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: 16px;
  box-sizing: border-box;
`;

const ModalContent = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.25);
`;

const PushToggleRow: React.FC = () => {
  const { user, isLoading } = useAuth() as any;
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushBusy, setIsPushBusy] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [showPushConfirmModal, setShowPushConfirmModal] = useState(false);
  const [showIosGuideModal, setShowIosGuideModal] = useState(false);
  const [showPushSettingsModal, setShowPushSettingsModal] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setIsPushEnabled(false);
      setPushPermissionStatus(null);
      return;
    }
    const checkPermissionAndTokenStatus = async () => {
      const isNative = isNativeApp();
      if (isNative) {
        try {
          const permStatus = await getNativePushPermissionStatus();
          const permission: 'granted' | 'denied' | 'prompt' = permStatus || 'prompt';
          setPushPermissionStatus(permission);
          if (permission === 'granted') {
            try {
              const tokenResult = await pushApi.getTokens();
              setIsPushEnabled(tokenResult.hasToken || false);
            } catch {
              setIsPushEnabled(!!localStorage.getItem('pushFcmToken'));
            }
          } else {
            setIsPushEnabled(false);
          }
        } catch {
          setIsPushEnabled(false);
          setPushPermissionStatus(null);
        }
      } else {
        try {
          setIsPushEnabled(localStorage.getItem(`pushEnabled_${user.id}`) === 'true');
          setPushPermissionStatus(null);
        } catch {
          setIsPushEnabled(false);
          setPushPermissionStatus(null);
        }
      }
    };
    checkPermissionAndTokenStatus();
    const onPushStatusChanged = () => checkPermissionAndTokenStatus();
    window.addEventListener('push-status-changed', onPushStatusChanged as any);
    return () => window.removeEventListener('push-status-changed', onPushStatusChanged as any);
  }, [user?.id]);

  const openNativeAppSettings = useCallback(async () => {
    try {
      if (!isNativeApp()) return;
      const platform = Capacitor.getPlatform();
      if (platform === 'ios') {
        try {
          const { NativeSettings, IOSSettings } = await import('capacitor-native-settings');
          await NativeSettings.openIOS({ option: IOSSettings.App });
        } catch {
          toast.info('아이폰 설정 > 직쏠공 > 알림에서 알림 권한을 허용해주세요.');
        }
      } else {
        const AppSettings = registerPlugin<{ open: () => Promise<void> }>('AppSettings');
        await AppSettings.open();
      }
    } catch {
      const msg = Capacitor.getPlatform() === 'ios'
        ? '아이폰 설정 > 직쏠공 > 알림에서 알림 권한을 허용해주세요.'
        : '설정 > 애플리케이션 > 직쏠공 > 알림에서 알림 권한을 허용해주세요.';
      toast.info(msg);
    }
  }, []);

  const handleTogglePush = useCallback(async () => {
    if (isPushBusy) {
      toast.info('푸시 알림 설정을 처리 중입니다. 잠시만 기다려주세요.');
      return;
    }
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const isNative = isNativeApp();
    const next = !isPushEnabled;

    if (next) {
      try {
        setIsPushBusy(true);
        let token: string | null = null;

        if (isNative) {
          const DENIED_BY_TOGGLE_KEY = `pushDeniedByToggle_v1_${user.id}`;
          let perm: 'granted' | 'denied' | 'prompt' = (await getNativePushPermissionStatus()) ?? 'prompt';
          const prePerm = perm;

          if (perm !== 'granted') {
            try {
              perm = await requestNativePushPermission();
            } catch { /* ignore */ }
          }
          setPushPermissionStatus(perm);

          if (perm !== 'granted') {
            toast.error('푸시 알림 권한을 허용해야 알림을 받을 수 있습니다.');
            const deniedByToggle = localStorage.getItem(DENIED_BY_TOGGLE_KEY) === 'true';
            if (prePerm === 'denied' || deniedByToggle) {
              setShowPushSettingsModal(true);
            } else {
              localStorage.setItem(DENIED_BY_TOGGLE_KEY, 'true');
            }
            setIsPushEnabled(false);
            setIsPushBusy(false);
            return;
          }
          localStorage.removeItem(DENIED_BY_TOGGLE_KEY); // 권한 허용 시 플래그 해제

          token = localStorage.getItem('pushFcmToken');
          if (!token) {
            token = await getNativePushToken(true);
            if (!token) {
              toast.error('푸시 알림 토큰을 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
              setIsPushBusy(false);
              return;
            }
          }
          await setupNativePushListeners();

          const prevToken = localStorage.getItem('pushFcmToken');
          if (prevToken && prevToken !== token) {
            try { await pushApi.unregisterToken(prevToken); } catch { /* ignore */ }
          }
          try {
            const res = await pushApi.registerToken(token);
            if (!res?.success) {
              toast.error('푸시 토큰 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
              setIsPushBusy(false);
              return;
            }
          } catch {
            toast.error('푸시 토큰 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            setIsPushBusy(false);
            return;
          }
          localStorage.setItem(`pushEnabled_${user.id}`, 'true');
          localStorage.setItem('pushFcmToken', token);
          setIsPushEnabled(true);
          toast.success('푸시 알림이 활성화되었습니다.');
          window.dispatchEvent(new CustomEvent('push-status-changed'));
        } else {
          if (typeof window === 'undefined' || typeof Notification === 'undefined') {
            toast.error('이 브라우저에서는 푸시 알림을 사용할 수 없습니다.');
            setIsPushBusy(false);
            return;
          }
          let permission = Notification.permission;
          if (permission === 'default') permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast.error(permission === 'denied' ? '브라우저 설정에서 알림 권한을 직접 허용해주세요.' : '브라우저 알림 권한을 허용해야 푸시 알림을 받을 수 있습니다.');
            setIsPushBusy(false);
            return;
          }
          const messaging = await getFirebaseMessaging();
          if (!messaging) {
            toast.error('푸시 알림 초기화에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            setIsPushBusy(false);
            return;
          }
          const { getToken } = await import('firebase/messaging');
          let reg: ServiceWorkerRegistration;
          try {
            await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            reg = await navigator.serviceWorker.ready;
          } catch {
            toast.error('푸시 알림용 서비스워커 등록에 실패했습니다.');
            setIsPushBusy(false);
            return;
          }
          token = await getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY || undefined, serviceWorkerRegistration: reg });
          if (!token) {
            toast.error('푸시 토큰을 발급받지 못했습니다. 잠시 후 다시 시도해 주세요.');
            setIsPushBusy(false);
            return;
          }
          const prevToken = localStorage.getItem('pushFcmToken');
          if (prevToken && prevToken !== token) {
            try { await pushApi.unregisterToken(prevToken); } catch { /* ignore */ }
          }
          try {
            const res = await pushApi.registerToken(token);
            if (!res?.success) {
              toast.error('푸시 토큰 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
              setIsPushBusy(false);
              return;
            }
          } catch {
            toast.error('푸시 토큰 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            setIsPushBusy(false);
            return;
          }
          localStorage.setItem(`pushEnabled_${user.id}`, 'true');
          localStorage.setItem('pushFcmToken', token);
          setIsPushEnabled(true);
          toast.success('웹 푸시 알림이 활성화되었습니다.');
          window.dispatchEvent(new CustomEvent('push-status-changed'));
        }
      } catch (e) {
        console.error('[push] 푸시 활성화 중 오류:', e);
        toast.error('푸시 알림 설정 중 오류가 발생했습니다.');
      } finally {
        setIsPushBusy(false);
      }
      return;
    }

    try {
      setIsPushBusy(true);
      await pushApi.unregisterToken();
      localStorage.setItem(`pushEnabled_${user.id}`, 'false');
      setIsPushEnabled(false);
      toast.success(isNative ? '푸시 알림이 비활성화되었습니다.' : '웹 푸시 알림이 비활성화되었습니다.');
      window.dispatchEvent(new CustomEvent('push-status-changed'));
    } catch (e) {
      console.error('[push] 푸시 비활성화 중 오류:', e);
      toast.error('푸시 알림 해제 중 오류가 발생했습니다.');
    } finally {
      setIsPushBusy(false);
    }
  }, [isPushEnabled, isPushBusy, user?.id, pushPermissionStatus]);

  if (!user?.id) return null;

  return (
    <>
      <Row>
        <IosGuideButton type="button" onClick={() => setShowIosGuideModal(true)}>
          <span>{isNativeApp() ? '푸시알림이 필요한 이유' : '아이폰 푸시알림 안내'}</span>
          <FaInfoCircle size={10} />
        </IosGuideButton>
        <PushToggleBlock>
          <span style={{ fontSize: '0.9rem', color: '#e5e7ff', fontWeight: 500 }}>푸시 알림</span>
          <SwitchLabel>
            <SwitchInput
              type="checkbox"
              checked={isPushEnabled}
              onChange={() => {
                if (isPushBusy) return;
                if (!isPushEnabled) {
                  if (!isNativeApp()) setShowPushConfirmModal(true);
                  else handleTogglePush();
                } else handleTogglePush();
              }}
              disabled={isLoading || isPushBusy}
              title={isLoading ? '로딩 중입니다...' : isPushBusy ? '푸시 알림 설정 중...' : ''}
            />
            <SwitchSlider />
          </SwitchLabel>
          {isNativeApp() && pushPermissionStatus === 'denied' && !isPushBusy && (
            <span style={{ fontSize: '0.75rem', color: '#ffcccc', marginLeft: '8px' }}>(알림 권한 필요)</span>
          )}
        </PushToggleBlock>
      </Row>

      {showPushConfirmModal && (
        <ModalOverlay onClick={() => setShowPushConfirmModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#333', marginBottom: '1rem', textAlign: 'center', fontSize: '1.3rem' }}>웹 푸시 알림을 켜시겠어요?</h2>
            <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: '1.25rem' }}>
              {'푸시 알림을 켜시면 매칭 신청 시작, 매칭 결과 발표, 새로운 채팅 메시지 등을\n브라우저 알림으로 받아보실 수 있습니다.\n\n이 기능을 사용하시려면, 곧 뜨는 브라우저 알림 팝업에서 반드시 "허용"을 선택해주세요.\n"차단"을 선택하신 경우에는, 브라우저의 사이트 설정에서 직접 알림을 허용으로 변경해야 합니다.'}
            </p>
            <p style={{ color: '#777', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              푸시 알림을 켜지 않으셔도 서비스 이용은 가능하지만,{'\n'}새로운 매칭/메시지 알림을 실시간으로 받으실 수 없습니다.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowPushConfirmModal(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', color: '#4b5563', fontSize: '0.9rem', cursor: 'pointer', minWidth: 90 }}>아니요</button>
              <button type="button" onClick={async () => { setShowPushConfirmModal(false); await handleTogglePush(); }} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', minWidth: 110 }}>네, 켤게요</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {showPushSettingsModal && (
        <ModalOverlay onClick={() => setShowPushSettingsModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#333', marginBottom: '1rem', textAlign: 'center', fontSize: '1.3rem' }}>알림 권한이 꺼져 있어요</h2>
            <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: '1.25rem' }}>
              {Capacitor.getPlatform() === 'ios'
                ? '매칭 상대방과의 원활한 채팅을 위해 알림 권한이 필요합니다.\n\n아래 버튼을 눌러 설정으로 이동한 뒤,\n아이폰 설정 > 직쏠공 > 알림에서 "알림 허용"을 켜주세요.'
                : '기기에서 알림 권한이 거부되어, 더 이상 권한 팝업이 뜨지 않습니다.\n\n아래 버튼을 눌러 설정으로 이동한 뒤,\n설정 > 애플리케이션 > 직쏠공 > 알림에서 "허용"으로 변경해주세요.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowPushSettingsModal(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', color: '#4b5563', fontSize: '0.9rem', cursor: 'pointer', minWidth: 90 }}>닫기</button>
              <button type="button" onClick={async () => { setShowPushSettingsModal(false); await openNativeAppSettings(); }} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', minWidth: 130 }}>설정으로 이동</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {showIosGuideModal && isNativeApp() && (
        <ModalOverlay onClick={() => setShowIosGuideModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#333', marginBottom: '1rem', textAlign: 'center', fontSize: '1.3rem' }}>푸시알림이 필요한 이유</h2>
            <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: '1.25rem' }}>
              {'푸시 알림을 켜시면 중요한 순간을 놓치지 않고 실시간으로 소통할 수 있습니다.\n\n📌 매칭 결과 발표\n매칭 결과가 나온 시점을 놓치면 상대방이 오랫동안 기다릴 수 있습니다. 푸시 알림을 통해 즉시 확인하고 상대방과 연락을 시작할 수 있습니다.\n\n💬 채팅 메시지 알림\n채팅을 통해 메시지를 주고받을 때 알림을 받지 못하면 서로 연락이 어려워 오해를 살 수 있습니다. 푸시 알림을 통해 상대방의 메시지를 빠르게 확인하고 답변할 수 있어 더 원활한 소통이 가능합니다.\n\n🔔 기타 중요한 알림\n매칭 신청 시작, 시스템 공지 등 중요한 정보도 실시간으로 받아보실 수 있습니다.'}
            </p>
            <p style={{ color: '#777', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>푸시 알림을 켜시면 더욱 편리하고 빠른 소통이 가능합니다.</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="button" onClick={() => setShowIosGuideModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>확인</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
      {showIosGuideModal && !isNativeApp() && (
        <IosWebAppGuideModal
          isOpen={true}
          onClose={() => setShowIosGuideModal(false)}
          title="아이폰(iOS) 푸시 알림 안내"
        />
      )}
    </>
  );
};

export default PushToggleRow;
