import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api.ts';

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

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getSystemSettings();
        setMaintenance(!!res?.maintenance?.enabled);
        setMaintenanceMessage(res?.maintenance?.message || '');
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

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <ContentWrapper>
        <Header>
          <Title>설정</Title>
          <Subtitle>
            서비스 전역에 영향을 주는 설정들을 관리합니다.
            {'\n'}현재는 서버 점검 모드만 제공되며, 추후 각종 전역 변수들이 이곳에 추가될 예정입니다.
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
            <SectionTitle>전역 설정 (예약 공간)</SectionTitle>
            <SectionDescription>
              향후 회차별 기본값, 전역 제한 시간, 실험 모드 플래그 등
              {'\n'}추가적인 전역 변수를 이 영역에 순차적으로 배치할 예정입니다.
            </SectionDescription>
            <PlaceholderArea>
              추후 전역 변수가 추가될 영역입니다.
              {'\n'}필요한 설정 항목을 정리해두시면 이곳에 하나씩 배치해 드릴게요.
            </PlaceholderArea>
          </Section>
        </Body>
      </ContentWrapper>
    </MainContainer>
  );
};

export default SettingsPage;


