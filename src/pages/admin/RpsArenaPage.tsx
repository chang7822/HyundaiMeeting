import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-toastify';
import { starApi, systemApi, adminApi, adminReportApi } from '../../services/api.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import ProfileDetailModal from './ProfileDetailModal.tsx';

const RPS_DAILY_LIMIT = 3;

const ARENA = 400;
const EMOJI_SIZE = 20;
const RADIUS = EMOJI_SIZE / 2; // 충돌/경계 = 이모지 크기에 맞춤
/** 초당 픽셀 이동량 기준으로 사용. 델타타임(dt)과 곱해 기기별 프레임률에 무관하게 속도 동일 유지 */
const SPEED = 60;
const COUNT_PER_TYPE = 20; // 종류당 개수 고정
const TYPES = ['rock', 'scissors', 'paper'] as const;
type Type = (typeof TYPES)[number];

const LABELS: Record<Type, string> = { rock: '바위', scissors: '가위', paper: '보' };
// 물건 이모지: 가위 ✂️, 바위(모아이) 🗿, 보(종이) 📄
const EMOJI: Record<Type, string> = { rock: '🗿', scissors: '✂️', paper: '📄' };

interface Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: Type;
}

function rpsWinner(a: Type, b: Type): Type | null {
  if (a === b) return null;
  if (a === 'rock' && b === 'scissors') return 'rock';
  if (a === 'rock' && b === 'paper') return 'paper';
  if (a === 'scissors' && b === 'paper') return 'scissors';
  if (a === 'scissors' && b === 'rock') return 'rock';
  if (a === 'paper' && b === 'rock') return 'paper';
  if (a === 'paper' && b === 'scissors') return 'scissors';
  return null;
}

function createEntities(eachPerType: number): Entity[] {
  const list: Entity[] = [];
  let id = 0;
  const pad = 30;
  const each = eachPerType;
  const cx = ARENA / 2;
  const cy = ARENA / 2;
  const spacing = 2 * RADIUS + 2; // 겹치지 않게 균일 간격
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const cols = Math.ceil(Math.sqrt(each));
  const rows = Math.ceil(each / cols);
  const totalW = (cols - 1) * spacing;
  const totalH = (rows - 1) * spacing;
  // 삼각형 꼭짓점: 부대가 배치될 반경을 그리드 크기에 맞춤
  const R = Math.min(ARENA / 2 - pad - RADIUS - Math.max(totalW, totalH) / 2, 120);

  // 세 부대: 바위(위), 가위(오른쪽 아래), 보(왼쪽 아래) — 120° 간격
  const angles = [-90, 30, 150].map((d) => (d * Math.PI) / 180);
  TYPES.forEach((type, ti) => {
    const vx = cx + R * Math.cos(angles[ti]);
    const vy = cy + R * Math.sin(angles[ti]);
    for (let i = 0; i < each; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      let x = vx + (col - (cols - 1) / 2) * spacing;
      let y = vy + (row - (rows - 1) / 2) * spacing;
      x = clamp(x, pad + RADIUS, ARENA - pad - RADIUS);
      y = clamp(y, pad + RADIUS, ARENA - pad - RADIUS);
      const angle = Math.random() * 2 * Math.PI;
      const vx_ = SPEED * Math.cos(angle);
      const vy_ = SPEED * Math.sin(angle);
      list.push({ id: id++, x, y, vx: vx_, vy: vy_, type });
    }
  });
  return list;
}

const Container = styled.div<{ $sidebarOpen: boolean; $isNativeApp?: boolean; $hideBanner?: boolean }>`
  flex: 1;
  margin-left: ${(p) => (p.$sidebarOpen ? '280px' : '0')};
  padding: clamp(0.75rem, 2vw, 2rem);
  padding-bottom: 7rem;
  height: 100vh;
  min-height: 100vh;
  max-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;

  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: calc(var(--mobile-top-padding, 80px) + var(--safe-area-inset-top));
    padding-bottom: 7rem;
  }

  ${(p) =>
    p.$isNativeApp
      ? `
    overflow: hidden;
    height: 100vh;
    padding-top: calc(8px + var(--safe-area-inset-top, 0px));
    padding-bottom: ${p.$hideBanner ? '1rem' : 'calc(50px + 12px + env(safe-area-inset-bottom, 0px))'};
    @media (max-width: 768px) {
      padding-top: calc(8px + var(--safe-area-inset-top, 0px));
      padding-bottom: ${p.$hideBanner ? '1rem' : 'calc(50px + 12px + env(safe-area-inset-bottom, 0px))'};
    }
  `
      : ''}
`;

/** 앱에서 실제 배너 광고가 노출되는 슬롯. 텍스트/배경 없이 비워 둠 */
const BannerSlot = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  z-index: 10;
`;

const AppDownloadBannerWrap = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: linear-gradient(180deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.15);
  box-sizing: border-box;
`;
const AppDownloadTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
`;
const StoreBadgesRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
`;
const StoreBadgeLink = styled.a`
  display: block;
  height: 40px;
  img { height: 100%; width: auto; display: block; object-fit: contain; }
  &:hover { opacity: 0.9; }
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
`;

const Header = styled.div<{ $rightAlign?: boolean }>`
  padding: clamp(0.75rem, 2vw, 1.25rem) clamp(1rem, 3vw, 1.5rem);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: clamp(1rem, 4vw, 1.25rem);
  font-weight: 700;
  box-sizing: border-box;
  text-align: ${(p) => (p.$rightAlign ? 'right' : 'left')};
`;

const HeaderRow = styled.div<{ $rightAlign?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  & > span:first-child {
    flex: 1;
    text-align: ${(p) => (p.$rightAlign ? 'right' : 'left')};
  }
`;

const StatsFloatingBtn = styled.button`
  flex-shrink: 0;
  padding: 0.4rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: rgba(255,255,255,0.35); }
`;

const StatsModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`;

const StatsModalBox = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
`;

const StatsModalTitle = styled.div`
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
`;

const StatsTabRow = styled.div`
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  & > button {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    background: #f8fafc;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
  }
  & > button.active {
    background: white;
    color: #4f46e5;
    border-bottom: 2px solid #4f46e5;
    margin-bottom: -1px;
  }
`;

/** 순위 15명이 보이는 높이로 고정 (헤더 1줄 + 본문 15줄), 미만이면 아래 여백, 초과 시 스크롤 */
const StatsTableWrap = styled.div`
  overflow: auto;
  height: 512px;
  min-height: 512px;
  flex-shrink: 0;
`;

const StatsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  th, td { padding: 0.25rem 0.4rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
  th { background: #f8fafc; font-weight: 600; color: #475569; text-align: center; }
  td:nth-child(1) { width: 2.25rem; text-align: center; }
  td:nth-child(2) { text-align: left; }
  td:nth-child(3), td:nth-child(4), td:nth-child(5) { text-align: center; }
  td:nth-child(5) { font-weight: 600; }
  /* 일반 회원: 닉네임 칼럼 없음 → 2~4번 셀 가운데, 4번 굵게 */
  &.member-view td:nth-child(2),
  &.member-view td:nth-child(3),
  &.member-view td:nth-child(4) { text-align: center; }
  &.member-view td:nth-child(4) { font-weight: 600; }
`;

const NicknameLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  color: #4f46e5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
  &:hover { color: #4338ca; }
`;

const Body = styled.div`
  padding: clamp(0.75rem, 3vw, 1.5rem);
  box-sizing: border-box;
`;

const ArenaWrap = styled.div`
  position: relative;
  width: 100%;
  max-width: ${ARENA}px;
  aspect-ratio: 1;
  margin: 0 auto 1rem;
  border: 3px solid #334155;
  border-radius: 12px;
  background: #ede9fe;
  overflow: hidden;
  box-sizing: border-box;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    vertical-align: top;
    object-fit: contain;
  }
`;

const VictoryOverlay = styled.div<{ $correct?: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.75);
  border-radius: 9px;
  animation: fadeIn 0.3s ease;
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const VictoryCard = styled.div<{ $correct?: boolean }>`
  text-align: center;
  padding: 1.5rem 2rem;
  border-radius: 16px;
  background: white;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 2px solid ${(p) => (p.$correct ? '#22c55e' : '#ef4444')};
`;

const VictoryEmoji = styled.div`
  font-size: 4rem;
  line-height: 1;
  margin-bottom: 0.5rem;
`;

const VictoryTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

const VictoryWinner = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
`;

const VictoryResult = styled.div<{ $correct?: boolean }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${(p) => (p.$correct ? '#16a34a' : '#dc2626')};
`;

const VictoryContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const ReplayBtnInRow = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  background: #0d9488;
  color: white;
  &:hover { background: #0f766e; }
`;

/** 게임 종료 시 상단에 크게 보이는 다시하기 버튼 (시작 버튼과 동일 배경, 캔버스와 동일 폭) */
const ReplayBtnBig = styled.button`
  width: 100%;
  max-width: ${ARENA}px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.875rem 1.5rem;
  min-height: 4rem;
  border-radius: 16px;
  border: none;
  font-weight: 700;
  font-size: 1.25rem;
  cursor: pointer;
  background: #4f46e5;
  color: white;
  transition: transform 0.2s, background 0.2s;
  &:hover {
    background: #4338ca;
    transform: translateY(-2px);
  }
`;

/** 상단 영역 고정 높이 (두 상태에서 동일 → 캔버스 위치·화면 흔들림 방지) */
const TOP_SECTION_HEIGHT = 280;

/** 게임 종료 시 내 별 + 다시하기 버튼 래퍼 (고정 높이 안에서 수직 가운데) */
const ReplaySectionWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${TOP_SECTION_HEIGHT}px;
  width: 100%;
  gap: 1rem;
`;

/** 게임 종료 시 내 별·남은판수 한 묶음 (캔버스 폭, 왼쪽 정렬, 글자 키움) */
const ReplayInfoBlock = styled.div`
  width: 100%;
  max-width: ${ARENA}px;
  text-align: left;
  font-weight: 700;
  color: #1e293b;
  font-size: clamp(1rem, 3vw, 1.15rem);
  line-height: 1.5;
`;

/** 배팅/선택 또는 다시하기 영역 래퍼 (고정 높이 → 전환 시 화면 흔들림 없음) */
const TopSectionWrap = styled.div`
  min-height: ${TOP_SECTION_HEIGHT}px;
  margin-bottom: 0.25rem;
`;

const Controls = styled.div`
  margin-bottom: 1rem;
  min-height: ${TOP_SECTION_HEIGHT}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const PaletteControls = styled.div`
  width: 100%;
  max-width: ${ARENA}px;
  margin: 0 auto 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  box-sizing: border-box;
`;

const StartBtnRow = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  > button {
    width: 100%;
    padding: 1.25rem 1.5rem;
    font-size: 1.1rem;
    font-weight: 700;
  }
`;

const GameInProgressNotice = styled.div`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
  font-weight: 500;
`;

const GuessSection = styled.div`
  margin: 0.25rem 0 1rem;
  text-align: center;
`;
const GuessTitle = styled.span`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.5rem;
`;
const GuessOptions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;
const GuessOption = styled.label<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  border: 2px solid ${(p) => (p.$selected ? '#4f46e5' : '#e2e8f0')};
  background: ${(p) => (p.$selected ? '#eef2ff' : '#f8fafc')};
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  &:hover {
    border-color: #a5b4fc;
    background: #f1f5f9;
  }
  input { display: none; }
`;
const GuessEmoji = styled.span` font-size: 2rem; line-height: 1; `;
const GuessLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
`;

const Btn = styled.button`
  padding: 0.5rem 1.25rem;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: #4f46e5;
  color: white;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #4338ca; }
`;

const StarBetRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: #1e293b;
  font-size: clamp(0.875rem, 2.5vw, 1rem);
  min-width: 0;
  width: 100%;
`;

const BetRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;
const BetOption = styled.label<{ $selected: boolean; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid ${(p) => (p.$selected ? '#4f46e5' : '#e2e8f0')};
  background: ${(p) => (p.$selected ? '#eef2ff' : p.$disabled ? '#f1f5f9' : '#f8fafc')};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  font-weight: 700;
  color: #334155;
  opacity: ${(p) => (p.$disabled ? 0.6 : 1)};
  input { display: none; }
`;

const ExtraPlayBtn = styled.button`
  margin-top: 0.25rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #94a3b8;
  background: #f1f5f9;
  font-size: 0.8125rem;
  color: #475569;
  cursor: pointer;
  &:hover:not(:disabled) { background: #e2e8f0; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

type RpsStatsRow = { rank: number; userId: string; displayName: string; playCount: number; netStars: number; adRewardStars: number; totalNetStars: number };

const RpsArenaPage: React.FC<{
  sidebarOpen?: boolean;
  preloadedRewarded?: any;
  preloadedBanner?: any;
}> = ({ sidebarOpen = true, preloadedRewarded, preloadedBanner }) => {
  const { user } = useAuth() as { user?: { isAdmin?: boolean; id?: string } };
  const isAdmin = Boolean(user?.isAdmin);
  // 통계는 추후 일반 회원 공개 예정. 내 순위 강조 등은 '로그인한 사용자' 기준으로 동작하도록 구현.
  const currentUserId = user?.id ?? null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<Type | null>(null);
  const [guess, setGuess] = useState<Type | null>(null);
  const [passThrough, setPassThrough] = useState(false);
  const [starBalance, setStarBalance] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [rpsDaily, setRpsDaily] = useState<{ used: number; extra: number }>({ used: 0, extra: 0 });
  const [adLoading, setAdLoading] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [androidStoreUrl, setAndroidStoreUrl] = useState<string | null>(null);
  const [iosStoreUrl, setIosStoreUrl] = useState<string | null>(null);

  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<'cumulative' | 'today' | 'weekly'>('cumulative');
  const [statsData, setStatsData] = useState<{ cumulative: RpsStatsRow[]; today: RpsStatsRow[]; weekly: RpsStatsRow[] } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState<any>(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const entitiesRef = useRef<Entity[]>([]);
  const rafRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const passThroughRef = useRef(false);
  const currentBetRef = useRef<number>(0);
  const resultProcessedRef = useRef(false);
  passThroughRef.current = passThrough;

  const playsRemaining = RPS_DAILY_LIMIT - rpsDaily.used + rpsDaily.extra;
  const maxBet = starBalance === null ? 0 : Math.min(3, Math.max(0, starBalance));
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    let cancelled = false;
    starApi.getMyStars().then((data) => {
      if (!cancelled && typeof data?.balance === 'number') setStarBalance(data.balance);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 서버에서 RPS 일일 사용량 조회 (앱/웹 동기화)
  useEffect(() => {
    let cancelled = false;
    starApi.getRpsDaily().then((data) => {
      if (!cancelled && data)
        setRpsDaily({ used: data.used ?? 0, extra: data.extra ?? 0 });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [running, winner]);

  // 앱 배너: 게임 중이 아닐 때만 표시, 게임 중이면 숨김
  useEffect(() => {
    if (!preloadedBanner || !Capacitor.isNativePlatform()) return;
    if (running) {
      preloadedBanner.hide?.().catch(() => {});
    } else {
      preloadedBanner.show?.().catch(() => {});
    }
    return () => {
      preloadedBanner.hide?.().catch(() => {});
    };
  }, [preloadedBanner, running]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    systemApi.getVersionPolicy().then((data: any) => {
      if (data?.android?.storeUrl) setAndroidStoreUrl(data.android.storeUrl);
      if (data?.ios?.storeUrl) setIosStoreUrl(data.ios.storeUrl);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (winner === null) {
      resultProcessedRef.current = false;
      return;
    }
    if (resultProcessedRef.current) return;
    resultProcessedRef.current = true;
    const bet = currentBetRef.current;
    const won = guess === winner;

    if (won && bet >= 1 && bet <= 3) {
      starApi.rpsWin(bet).then((res) => {
        if (typeof res.newBalance === 'number') {
          setStarBalance(res.newBalance);
          window.dispatchEvent(new CustomEvent('stars-updated', { detail: { balance: res.newBalance } }));
        }
        toast.success(`🎉 승리! ⭐ ${res.reward ?? bet * 2}개 지급되었어요.`);
      }).catch((err: any) => {
        toast.error(err?.response?.data?.message || '별 지급에 실패했습니다.');
      });
    } else if (!won) {
      toast.info('아쉽게도 패배했어요. 다음에 다시 도전해보세요!');
    }
  }, [winner, guess]);

  const draw = useCallback((list: Entity[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ede9fe';
    ctx.fillRect(0, 0, ARENA, ARENA);
    ctx.font = `${EMOJI_SIZE}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f2937';
    list.forEach((e) => {
      ctx.fillText(EMOJI[e.type], e.x, e.y);
    });
  }, []);

  const runFrame = useCallback((timestamp: number = performance.now()) => {
    const list = entitiesRef.current;
    const n = list.length;
    if (n === 0) return;

    const prev = lastFrameTimeRef.current;
    const dtSec = prev > 0 ? (timestamp - prev) / 1000 : 1 / 60;
    const dt = Math.min(dtSec, 0.1);
    lastFrameTimeRef.current = timestamp;

    for (let i = 0; i < n; i++) {
      const a = list[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.x - RADIUS < 0) {
        a.x = RADIUS;
        a.vx = Math.abs(a.vx);
      }
      if (a.x + RADIUS > ARENA) {
        a.x = ARENA - RADIUS;
        a.vx = -Math.abs(a.vx);
      }
      if (a.y - RADIUS < 0) {
        a.y = RADIUS;
        a.vy = Math.abs(a.vy);
      }
      if (a.y + RADIUS > ARENA) {
        a.y = ARENA - RADIUS;
        a.vy = -Math.abs(a.vy);
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS * 2) {
          const w = rpsWinner(a.type, b.type);
          if (w !== null) {
            a.type = w;
            b.type = w;
          }
          if (passThroughRef.current) {
            // 통과 모드: 튕기지 않고 그대로 지나감 (타입만 변환)
            continue;
          }
          const nx = dist > 0.01 ? dx / dist : 1;
          const ny = dist > 0.01 ? dy / dist : 0;
          const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
          const nxf = nx / nlen;
          const nyf = ny / nlen;
          const va_n = a.vx * nxf + a.vy * nyf;
          const vb_n = b.vx * nxf + b.vy * nyf;
          a.vx -= 2 * va_n * nxf;
          a.vy -= 2 * va_n * nyf;
          b.vx -= 2 * vb_n * nxf;
          b.vy -= 2 * vb_n * nyf;
          const sep = dist > 0.01 ? RADIUS * 2 - dist : RADIUS * 2;
          const half = sep / 2;
          a.x -= half * nxf;
          a.y -= half * nyf;
          b.x += half * nxf;
          b.y += half * nyf;
        }
      }
    }

    draw(list);

    const types = new Set(list.map((e) => e.type));
    if (types.size === 1) {
      setWinner(list[0].type);
      setRunning(false);
      return;
    }
    rafRef.current = requestAnimationFrame(runFrame);
  }, [draw]);

  useEffect(() => {
    if (!running) return;
    rafRef.current = requestAnimationFrame(runFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, runFrame]);

  // 멈췄을 때 즉시 새 배치 생성 후 캔버스에 표시 (승리 화면 중에는 초기화하지 않음)
  useEffect(() => {
    if (running) return;
    if (winner !== null) return; // 승리 시 마지막 프레임 유지, 다시하기 누를 때만 초기화
    entitiesRef.current = createEntities(COUNT_PER_TYPE);
    draw(entitiesRef.current);
  }, [running, winner, draw]);

  const start = async () => {
    const bet = betAmount ?? 0;
    if (bet < 1 || bet > 3 || starBalance === null || starBalance < bet) {
      toast.error('배팅할 별이 부족해요.');
      return;
    }
    if (playsRemaining <= 0) {
      toast.warning('오늘 남은 횟수가 없어요. 광고를 보고 한 판 더 도전해보세요!');
      return;
    }
    setWinner(null);
    setStartingGame(true);
    try {
      const res = await starApi.rpsBet(bet);
      if (typeof res.newBalance === 'number') {
        setStarBalance(res.newBalance);
        window.dispatchEvent(new CustomEvent('stars-updated', { detail: { balance: res.newBalance } }));
      }
      if (typeof res.used === 'number' && typeof res.extra === 'number') {
        setRpsDaily({ used: res.used, extra: res.extra });
      }
      currentBetRef.current = bet;
      entitiesRef.current = createEntities(COUNT_PER_TYPE);
      lastFrameTimeRef.current = 0;
      setRunning(true); // 새 배치 준비된 뒤에만 게임 시작 (배너 숨김 + 루프 시작)
    } catch (err: any) {
      const msg = err?.response?.data?.message || '배팅에 실패했습니다.';
      const code = err?.response?.data?.code;
      if (code === 'INSUFFICIENT_STARS') {
        toast.error('보유 별이 부족해요.');
      } else if (code === 'RPS_NO_PLAYS') {
        toast.warning(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setStartingGame(false);
    }
  };

  const stop = () => setRunning(false);
  const replay = () => {
    setWinner(null);
    // 선택 유지: guess, betAmount 그대로 둠. 단 별이 모자라면 배팅만 해제
    setBetAmount((prev) => {
      if (prev === null) return null;
      if (starBalance === null) return prev;
      return starBalance < prev ? null : prev;
    });
  };

  const handleExtraPlayAd = async () => {
    if (!preloadedRewarded || adLoading) return;
    setAdLoading(true);
    let removeListeners: (() => Promise<void>) | undefined;
    try {
      const admobModule = await import('@capgo/capacitor-admob');
      const AdMob = admobModule.AdMob;
      let rewarded = false;
      let rewardHandle: any;
      let dismissHandle: any;
      let showFailHandle: any;

      removeListeners = async () => {
        try { await rewardHandle?.remove?.(); } catch {}
        try { await dismissHandle?.remove?.(); } catch {}
        try { await showFailHandle?.remove?.(); } catch {}
      };

      const rewardPromise = new Promise<boolean>((resolve, reject) => {
        const safeResolve = (value: boolean) => {
          removeListeners?.().then(() => resolve(value));
        };
        const safeReject = (err: Error) => {
          removeListeners?.().then(() => reject(err));
        };
        (async () => {
          try {
            rewardHandle = await AdMob.addListener('rewardedi.reward', () => {
              if (!rewarded) {
                rewarded = true;
                safeResolve(true);
              }
            });
            dismissHandle = await AdMob.addListener('rewardedi.dismiss', () => {
              safeResolve(false);
            });
            showFailHandle = await AdMob.addListener('rewardedi.showfail', (event: any) => {
              const msg = event?.error || event?.message || '광고 표시 실패';
              safeReject(new Error(msg));
            });
          } catch (e) {
            safeReject(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      });

      await preloadedRewarded.show();
      const gotReward = await Promise.race([
        rewardPromise,
        new Promise<boolean>((_, rej) => setTimeout(() => rej(new Error('광고 응답이 지연되었습니다.')), 90000)),
      ]);
      if (gotReward) {
        const res = await starApi.rpsAddExtra(3, 2);
        if (res && typeof res.used === 'number' && typeof res.extra === 'number') {
          setRpsDaily({ used: res.used, extra: res.extra });
        }
        if (typeof res?.newBalance === 'number') {
          setStarBalance(res.newBalance);
          window.dispatchEvent(new CustomEvent('stars-updated', { detail: { balance: res.newBalance } }));
        }
        toast.success('3판 더 할 수 있어요! 별 2개도 환급되었어요.');
      } else {
        toast.warning('광고를 끝까지 시청해야 보상을 받을 수 있어요.');
      }
    } catch (err: any) {
      toast.error(err?.message || '광고 처리 중 오류가 발생했습니다.');
    } finally {
      try { await removeListeners?.(); } catch {}
      setAdLoading(false);
      // 보상형 광고는 1회 시청 후 소비되므로, 다음 클릭을 위해 다시 로드
      preloadedRewarded?.load?.().catch(() => {});
    }
  };

  const openStatsModal = useCallback(async () => {
    setStatsModalOpen(true);
    setStatsLoading(true);
    setStatsData(null);
    try {
      const data = await adminApi.getRpsStats();
      setStatsData(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '통계 조회에 실패했습니다.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const showStatsButton = !running && winner === null;

  const openProfileModal = useCallback(async (userId: string) => {
    setProfileModalOpen(true);
    setProfileModalUser(null);
    setProfileModalLoading(true);
    try {
      const u = await adminReportApi.getUserProfile(userId);
      setProfileModalUser(u);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '프로필을 불러올 수 없습니다.');
      setProfileModalOpen(false);
    } finally {
      setProfileModalLoading(false);
    }
  }, []);

  const closeProfileModal = useCallback(() => {
    setProfileModalOpen(false);
    setProfileModalUser(null);
  }, []);

  return (
    <Container $sidebarOpen={sidebarOpen} $isNativeApp={isNativeApp} $hideBanner={isNativeApp && running}>
      <Card>
        <Header $rightAlign={isNativeApp}>
          <HeaderRow $rightAlign={isNativeApp}>
            <span>✂️ 🗿 📄 가위바위보 아레나</span>
            {showStatsButton && (
              <StatsFloatingBtn type="button" onClick={openStatsModal} title="RPS 통계">
                📊 통계
              </StatsFloatingBtn>
            )}
          </HeaderRow>
        </Header>
        <Body>
          <TopSectionWrap>
          {winner !== null ? (
            <ReplaySectionWrap>
              <ReplayInfoBlock>
                <div> ⭐ 내 별 {starBalance === null ? '…' : `${starBalance}개`}</div>
                <div style={{ fontWeight: 600, color: '#475569', marginTop: '0.25rem' }}>
                   오늘 남은판수 : {playsRemaining}회
                </div>
              </ReplayInfoBlock>
              <ReplayBtnBig onClick={replay}>다시하기</ReplayBtnBig>
            </ReplaySectionWrap>
          ) : (
          <Controls>
            <PaletteControls>
              <StarBetRow>
                <span>⭐ 내 별 {starBalance === null ? '…' : `${starBalance}개`}</span>
                <span style={{ color: '#cbd5e1', fontWeight: 400 }}>·</span>
                <span style={{ fontWeight: 600, color: '#475569' }}>배팅</span>
                <BetRow>
                  {[1, 2, 3].map((n) => (
                    <BetOption
                      key={n}
                      $selected={betAmount === n}
                      $disabled={maxBet < n}
                    >
                      <input
                        type="radio"
                        name="bet"
                        checked={betAmount === n}
                        onChange={() => setBetAmount(n)}
                        disabled={running || maxBet < n}
                      />
                      {n}
                    </BetOption>
                  ))}
                </BetRow>
              </StarBetRow>
              <GuessSection>
                <GuessTitle>예측에 성공하면 ⭐을 두배로 드립니다</GuessTitle>
                <GuessOptions>
                  {TYPES.map((t) => (
                    <GuessOption key={t} $selected={guess === t}>
                      <input
                        type="radio"
                        name="guess"
                        checked={guess === t}
                        onChange={() => setGuess(t)}
                        disabled={running}
                      />
                      <GuessEmoji>{EMOJI[t]}</GuessEmoji>
                      <GuessLabel>{LABELS[t]}</GuessLabel>
                    </GuessOption>
                  ))}
                </GuessOptions>
              </GuessSection>
              <StartBtnRow>
                {!running ? (
                  isNativeApp ? (
                    playsRemaining <= 0 ? (
                      <ExtraPlayBtn onClick={handleExtraPlayAd} disabled={adLoading}>
                        {adLoading ? '광고 로딩…' : '광고 보고 3판 더 + ⭐2개 환급'}
                      </ExtraPlayBtn>
                    ) : (
                      <Btn
                        onClick={start}
                        disabled={
                          startingGame ||
                          guess === null ||
                          betAmount === null ||
                          starBalance === null ||
                          starBalance < (betAmount ?? 0)
                        }
                      >
                        {startingGame ? '시작 중…' : `시작 (오늘 ${playsRemaining}판 남음)`}
                      </Btn>
                    )
                  ) : (
                    playsRemaining <= 0 ? (
                      <span style={{ fontSize: '0.8125rem', color: '#64748b', display: 'block', width: '100%', textAlign: 'center' }}>
                        오늘 횟수를 모두 사용했어요. 한 판 더 하려면 앱을 이용해주세요.
                      </span>
                    ) : (
                      <Btn
                        onClick={start}
                        disabled={
                          startingGame ||
                          guess === null ||
                          betAmount === null ||
                          starBalance === null ||
                          starBalance < (betAmount ?? 0) ||
                          playsRemaining <= 0
                        }
                      >
                        {startingGame ? '시작 중…' : `시작 (오늘 ${playsRemaining}판 남음)`}
                      </Btn>
                    )
                  )
                ) : (
                  <GameInProgressNotice>게임 중 이탈 시 배팅한 별이 사라집니다</GameInProgressNotice>
                )}
              </StartBtnRow>
            </PaletteControls>
          </Controls>
          )}
          </TopSectionWrap>
          <ArenaWrap>
            <canvas ref={canvasRef} width={ARENA} height={ARENA} />
            {winner !== null && (
              <VictoryOverlay $correct={guess === winner}>
                <VictoryContent>
                  <VictoryCard $correct={guess === winner}>
                    <VictoryEmoji>{EMOJI[winner]}</VictoryEmoji>
                    <VictoryTitle>최종 승자</VictoryTitle>
                    <VictoryWinner>{LABELS[winner]}</VictoryWinner>
                    <VictoryResult $correct={guess === winner}>
                      {guess !== null
                        ? guess === winner
                          ? `🎉 맞춤! ⭐ ${(currentBetRef.current || 0) * 2}개 지급`
                          : '틀렸어요'
                        : ''}
                    </VictoryResult>
                  </VictoryCard>
                </VictoryContent>
              </VictoryOverlay>
            )}
          </ArenaWrap>
        </Body>
      </Card>
      {profileModalOpen && profileModalLoading && (
        <StatsModalOverlay style={{ zIndex: 1100 }} onClick={() => { setProfileModalOpen(false); setProfileModalLoading(false); }}>
          <StatsModalBox onClick={(e) => e.stopPropagation()} style={{ maxWidth: 280 }}>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>프로필 불러오는 중…</div>
          </StatsModalBox>
        </StatsModalOverlay>
      )}
      {profileModalOpen && !profileModalLoading && profileModalUser && (
        <ProfileDetailModal isOpen onRequestClose={closeProfileModal} user={profileModalUser} overlayZIndex={1100} />
      )}
      {statsModalOpen && (
        <StatsModalOverlay onClick={() => setStatsModalOpen(false)}>
          <StatsModalBox onClick={(e) => e.stopPropagation()}>
            <StatsModalTitle>
              {isAdmin ? '📊 가위바위보 통계 (관리자)' : '📊 가위바위보 순위'}
            </StatsModalTitle>
            <StatsTabRow>
              {isAdmin && (
                <button
                  type="button"
                  className={statsPeriod === 'cumulative' ? 'active' : ''}
                  onClick={() => setStatsPeriod('cumulative')}
                >
                  누적
                </button>
              )}
              <button
                type="button"
                className={statsPeriod === 'today' ? 'active' : ''}
                onClick={() => setStatsPeriod('today')}
              >
                오늘
              </button>
              <button
                type="button"
                className={statsPeriod === 'weekly' ? 'active' : ''}
                onClick={() => setStatsPeriod('weekly')}
              >
                주간
              </button>
            </StatsTabRow>
            <StatsTableWrap>
              {statsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>불러오는 중…</div>
              ) : statsData ? (
                <StatsTable className={!isAdmin ? 'member-view' : ''}>
                  <thead>
                    <tr>
                      <th>순위</th>
                      {isAdmin && <th>닉네임</th>}
                      <th>보상</th>
                      <th>환급</th>
                      <th>계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((statsPeriod === 'cumulative' && isAdmin ? statsData.cumulative : statsPeriod === 'weekly' ? (statsData.weekly ?? []) : statsData.today)).length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                          참여 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      (statsPeriod === 'cumulative' && isAdmin ? statsData.cumulative : statsPeriod === 'weekly' ? (statsData.weekly ?? []) : statsData.today).map((row) => (
                          <tr key={row.userId} style={row.userId === currentUserId ? { background: 'rgba(79, 70, 229, 0.12)' } : undefined}>
                            <td>{row.rank}</td>
                            {isAdmin && (
                              <td>
                                <NicknameLink type="button" onClick={() => openProfileModal(row.userId)} title="프로필 보기">
                                  {row.displayName}
                                </NicknameLink>
                              </td>
                            )}
                            <td style={{ color: (row.netStars ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                              {(row.netStars ?? 0) >= 0 ? '+' : ''}{row.netStars ?? 0}
                            </td>
                            <td style={{ color: (row.adRewardStars ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                              {(row.adRewardStars ?? 0) >= 0 ? '+' : ''}{row.adRewardStars ?? 0}
                            </td>
                            <td style={{ color: (row.totalNetStars ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                              {(row.totalNetStars ?? 0) >= 0 ? '+' : ''}{row.totalNetStars ?? 0}
                            </td>
                          </tr>
                      ))
                    )}
                  </tbody>
                </StatsTable>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>데이터 없음</div>
              )}
            </StatsTableWrap>
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setStatsModalOpen(false)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f1f5f9',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </StatsModalBox>
        </StatsModalOverlay>
      )}
      {isNativeApp && !running ? (
        <BannerSlot id="rps-banner-slot" data-safe-area-bottom />
      ) : !isNativeApp ? (
        <AppDownloadBannerWrap data-safe-area-bottom>
          <AppDownloadTitle>
            <span style={{ fontSize: '1.1rem' }}>↓</span>
            앱다운 받으러 가기
          </AppDownloadTitle>
          <StoreBadgesRow>
            {androidStoreUrl && (
              <StoreBadgeLink href={androidStoreUrl} target="_blank" rel="noopener noreferrer" title="Google Play">
                <img
                  src="https://play.google.com/intl/ko/badges/static/images/badges/ko_badge_web_generic.png"
                  alt="Google Play에서 다운로드"
                />
              </StoreBadgeLink>
            )}
            {iosStoreUrl && (
              <StoreBadgeLink href={iosStoreUrl} target="_blank" rel="noopener noreferrer" title="App Store">
                <img
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="App Store에서 다운로드"
                />
              </StoreBadgeLink>
            )}
            {!androidStoreUrl && !iosStoreUrl && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>스토어 링크 준비 중</span>
            )}
          </StoreBadgesRow>
        </AppDownloadBannerWrap>
      ) : null}
    </Container>
  );
};

export default RpsArenaPage;
