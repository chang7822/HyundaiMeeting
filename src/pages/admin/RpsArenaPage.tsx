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

/* 광고/앱다운 배너는 하단에 오버레이로 덮음. 패딩 고정으로 배너 등장 시 화면 눌림 방지 */
const Container = styled.div<{ $sidebarOpen: boolean; $isNativeApp?: boolean }>`
  flex: 1;
  margin-left: ${(p) => (p.$sidebarOpen ? '280px' : '0')};
  padding: clamp(0.5rem, 1.5vw, 1rem);
  padding-bottom: clamp(0.5rem, 1.5vw, 1rem);
  transition: margin-left 0.3s;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100dvh;

  @media (max-width: 768px) {
    margin-left: 0;
    padding: 0.5rem 0.75rem;
    padding-top: var(--mobile-top-padding, 72px);
    padding-bottom: 0.75rem;
  }

  ${(p) =>
    p.$isNativeApp
      ? `
    overflow: hidden;
    padding-top: var(--mobile-top-padding, 72px);
    @media (max-width: 768px) {
      padding-top: var(--mobile-top-padding, 72px);
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
  padding-bottom: 12px;
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
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
  @media (min-width: 768px) {
    max-width: min(90vw, 720px);
  }
  @media (min-width: 1024px) {
    max-width: min(85vw, 800px);
  }
`;

const Header = styled.div<{ $rightAlign?: boolean }>`
  flex-shrink: 0;
  padding: clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: clamp(0.9rem, 3vw, 1.1rem);
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

const StatsFloatingBtn = styled.button<{ $hidden?: boolean }>`
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
  visibility: ${(p) => (p.$hidden ? 'hidden' : 'visible')};
  pointer-events: ${(p) => (p.$hidden ? 'none' : 'auto')};
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
`;

const StatsModalCloseBtn = styled.button`
  flex-shrink: 0;
  padding: 0.35rem 0.6rem;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.25);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.4); }
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
  td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6) { text-align: center; }
  td:nth-child(6) { font-weight: 600; }
  /* 일반 회원: 닉네임 없음 → 2=도전,3=보상,4=환급,5=계 가운데, 5번 굵게 */
  &.member-view td:nth-child(2),
  &.member-view td:nth-child(3),
  &.member-view td:nth-child(4),
  &.member-view td:nth-child(5) { text-align: center; }
  &.member-view td:nth-child(5) { font-weight: 600; }
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
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(0.5rem, 2vw, 1rem);
  box-sizing: border-box;
  overflow: hidden;
`;

/** 캔버스 최대폭. 7할 확장, 폭부족시 최대폭까지만 */
const CANVAS_MAX = ARENA;
const CANVAS_MAX_TABLET = 560;
const CANVAS_MAX_DESKTOP = 640;
const CANVAS_WIDTH = `min(100cqw, 100cqh, ${CANVAS_MAX}px)`;
const CANVAS_WIDTH_TABLET = `min(100cqw, 100cqh, ${CANVAS_MAX_TABLET}px)`;
const CANVAS_WIDTH_DESKTOP = `min(100cqw, 100cqh, ${CANVAS_MAX_DESKTOP}px)`;

/** 게임 영역. 예측 문구 밑으로 2:1:7 비율 (선택창:버튼:캔버스) */
const GameArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  container-type: size;
  container-name: game;
`;
/** 상단: 내별·배팅 행 */
const TopFixed = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
`;
/** TopFixed 내용. 캔버스와 동일 폭, 내별·예측문구 왼쪽/가운데 정렬 */
const TOP_FIXED_WIDTH = `min(100cqw, 70cqh, ${CANVAS_MAX}px)`;
const TOP_FIXED_WIDTH_T = `min(100cqw, 70cqh, ${CANVAS_MAX_TABLET}px)`;
const TOP_FIXED_WIDTH_D = `min(100cqw, 70cqh, ${CANVAS_MAX_DESKTOP}px)`;
const TopFixedInner = styled.div`
  width: ${TOP_FIXED_WIDTH};
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  @media (min-width: 768px) {
    width: ${TOP_FIXED_WIDTH_T};
  }
  @media (min-width: 1024px) {
    width: ${TOP_FIXED_WIDTH_D};
  }
`;
/** 예측/남은판수 문구. 상단행·선택창 사이 수직 가운데 */
const GuessTitleSection = styled.div`
  flex-shrink: 0;
  height: 2.25rem;
  padding-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;
/** 규칙: ①캔버스 7할 ②선택(정사각형만큼 높이) ③버튼(나머지) */
const RatioSection = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  container-type: size;
  container-name: ratio;
`;
/** 선택·버튼·캔버스를 캔버스 폭으로 맞춤 (폭 정렬) */
const GAP = '0.5rem';
const SQUARE_SIZE = `calc((min(100cqw, 70cqh, ${CANVAS_MAX}px) - 2 * ${GAP}) / 3)`;
const SQUARE_SIZE_T = `calc((min(100cqw, 70cqh, ${CANVAS_MAX_TABLET}px) - 2 * ${GAP}) / 3)`;
const SQUARE_SIZE_D = `calc((min(100cqw, 70cqh, ${CANVAS_MAX_DESKTOP}px) - 2 * ${GAP}) / 3)`;
const ARENA_HEIGHT = `min(70cqh, 100cqw, ${CANVAS_MAX}px)`;
const ARENA_HEIGHT_T = `min(70cqh, 100cqw, ${CANVAS_MAX_TABLET}px)`;
const ARENA_HEIGHT_D = `min(70cqh, 100cqw, ${CANVAS_MAX_DESKTOP}px)`;
const GameColumn = styled.div`
  width: min(100cqw, 70cqh, ${CANVAS_MAX}px);
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${GAP};
  @media (min-width: 768px) {
    width: min(100cqw, 70cqh, ${CANVAS_MAX_TABLET}px);
  }
  @media (min-width: 1024px) {
    width: min(100cqw, 70cqh, ${CANVAS_MAX_DESKTOP}px);
  }
`;
/** 선택창. 가로 넓을 땐 2할, 세로 길 땐 정사각형 높이만. 짧은 화면에선 축소 허용 */
const SelectionArea = styled.div`
  flex: 2 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  @container ratio (max-aspect-ratio: 1) {
    flex: 0 0 auto;
    min-height: ${SQUARE_SIZE};
  }
  @media (min-width: 768px) {
    @container ratio (max-aspect-ratio: 1) {
      min-height: ${SQUARE_SIZE_T};
    }
  }
  @media (min-width: 1024px) {
    @container ratio (max-aspect-ratio: 1) {
      min-height: ${SQUARE_SIZE_D};
    }
  }
  @media (max-height: 780px) {
    @container ratio (max-aspect-ratio: 1) {
      flex: 2 1 0;
      min-height: 0;
    }
  }
`;
/** 시작버튼. 최대높이=선택창 높이(SQUARE_SIZE) */
const ButtonArea = styled.div`
  flex: 1 1 0;
  min-height: 0;
  max-height: ${SQUARE_SIZE};
  display: flex;
  align-items: center;
  justify-content: center;
  @media (min-width: 768px) {
    max-height: ${SQUARE_SIZE_T};
  }
  @media (min-width: 1024px) {
    max-height: ${SQUARE_SIZE_D};
  }
`;
/** 캔버스. 가로 넓을 땐 7할, 세로 길 땐 고정 높이. 짧은 화면(≤780px)에선 축소 허용 */
const ArenaParent = styled.div`
  flex: 7 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  container-type: size;
  @container ratio (max-aspect-ratio: 1) {
    flex: 0 0 auto;
    height: ${ARENA_HEIGHT};
  }
  @media (min-width: 768px) {
    @container ratio (max-aspect-ratio: 1) {
      height: ${ARENA_HEIGHT_T};
    }
  }
  @media (min-width: 1024px) {
    @container ratio (max-aspect-ratio: 1) {
      height: ${ARENA_HEIGHT_D};
    }
  }
  /* 짧은 화면: 고정 높이 대신 flex로 축소 가능 → 버튼·캔버스 겹침 방지 */
  @media (max-height: 780px) {
    @container ratio (max-aspect-ratio: 1) {
      flex: 7 1 0;
      height: auto;
      max-height: ${ARENA_HEIGHT};
    }
  }
`;
const ArenaWrap = styled.div`
  flex: 0 0 auto;
  position: relative;
  width: ${CANVAS_WIDTH};
  aspect-ratio: 1;
  border: 3px solid #334155;
  border-radius: 12px;
  background: #ede9fe;
  overflow: hidden;
  box-sizing: border-box;
  @media (min-width: 768px) {
    width: ${CANVAS_WIDTH_TABLET};
  }
  @media (min-width: 1024px) {
    width: ${CANVAS_WIDTH_DESKTOP};
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    vertical-align: top;
    object-fit: contain;
  }
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

/** 게임 종료 시 다시하기 */
const ReplayBtnBig = styled.button`
  min-height: 3rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: clamp(1rem, 2.5vh, 1.75rem) 1.5rem;
  border-radius: 16px;
  border: none;
  font-weight: 700;
  font-size: 1.25rem;
  cursor: pointer;
  background: linear-gradient(180deg, #7c7ef7 0%, #6366f1 30%, #5b4fd6 100%);
  color: white;
  border-bottom: 4px solid rgba(0, 0, 0, 0.2);
  box-shadow:
    0 3px 0 rgba(0, 0, 0, 0.15),
    0 6px 12px rgba(0, 0, 0, 0.15),
    0 8px 24px rgba(99, 102, 241, 0.25);
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s, border-width 0.2s;
  &:hover {
    filter: brightness(1.05);
    box-shadow:
      0 3px 0 rgba(0, 0, 0, 0.12),
      0 8px 16px rgba(0, 0, 0, 0.18),
      0 12px 28px rgba(99, 102, 241, 0.35);
    transform: translateY(-3px);
  }
  &:active {
    transform: translateY(2px);
    box-shadow:
      0 0 0 rgba(0, 0, 0, 0.15),
      0 2px 6px rgba(0, 0, 0, 0.2);
    border-bottom-width: 1px;
  }
`;

/** 게임 결과 멘트. 선택창 위치에 가운데 표시 */
const ResultMessage = styled.div<{ $correct?: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.25rem;
  font-weight: 700;
  color: ${(p) => (p.$correct ? '#16a34a' : '#dc2626')};
  font-size: clamp(0.95rem, 2.5vw, 1.15rem);
  padding: 0.5rem;
  border-radius: clamp(8px, 1.5vw, 14px);
  border: 2px solid ${(p) => (p.$correct ? '#22c55e' : '#ef4444')};
  background: ${(p) => (p.$correct ? '#dcfce7' : '#fee2e2')};
  box-sizing: border-box;
`;

/** 선택창. GameColumn 100% 폭 */
const PaletteControls = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
`;

/** 시작버튼. GameColumn 100% 폭 = 캔버스와 동일 (가로 패딩 제거로 폭 일치) */
const StartBtnRow = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  box-sizing: border-box;
  > button, > span {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.75rem 1.25rem;
    font-size: clamp(0.95rem, 2vw, 1.1rem);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const GameInProgressNotice = styled.div`
  width: 100%;
  height: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const GuessTitle = styled.span`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  text-align: center;
`;
/** 선택창 세개 한 행, 정사각형 */
const GuessOptions = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  gap: ${GAP};
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
`;
const GuessOption = styled.label<{ $selected: boolean }>`
  flex: 0 1 auto;
  min-width: 0;
  height: 100%;
  aspect-ratio: 1;
  max-width: calc((100% - 2 * ${GAP}) / 3);
  overflow: hidden;
  container-type: size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 0.35em;
  border-radius: clamp(8px, 1.5vw, 14px);
  box-sizing: border-box;
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
const GuessEmoji = styled.span`
  font-size: clamp(1.5rem, 48cqi, 12rem);
  line-height: 1;
`;
const GuessLabel = styled.span`
  font-size: clamp(0.75rem, 14cqi, 1.75rem);
  font-weight: 600;
  color: #334155;
`;

const Btn = styled.button`
  padding: 0.5rem 1.25rem;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(180deg, #7c7ef7 0%, #6366f1 30%, #5b4fd6 100%);
  color: white;
  border-bottom: 3px solid rgba(0, 0, 0, 0.2);
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.15),
    0 4px 8px rgba(0, 0, 0, 0.15),
    0 6px 16px rgba(99, 102, 241, 0.25);
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s, border-color 0.2s;
  &:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; border-bottom-color: transparent; }
  &:hover:not(:disabled) {
    filter: brightness(1.05);
    box-shadow:
      0 2px 0 rgba(0, 0, 0, 0.12),
      0 6px 12px rgba(0, 0, 0, 0.18),
      0 8px 22px rgba(99, 102, 241, 0.35);
    transform: translateY(-2px);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow:
      0 0 0 rgba(0, 0, 0, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.2);
    border-bottom-width: 1px;
  }
`;

const StarBetRow = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  min-height: 44px;
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
/** 배팅 영역. 게임 종료 시 visibility로 숨김 → 레이아웃 유지, 내별 위치 그대로 */
const BetSection = styled.span<{ $hide?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem 1rem;
  visibility: ${(p) => (p.$hide ? 'hidden' : 'visible')};
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

  // 사이드바에서 출석체크/광고 보상 등으로 별이 바뀌면 게임 화면에도 반영
  useEffect(() => {
    const handler = (e: CustomEvent<{ balance: number }>) => {
      if (typeof e?.detail?.balance === 'number') setStarBalance(e.detail.balance);
    };
    window.addEventListener('stars-updated', handler as EventListener);
    return () => window.removeEventListener('stars-updated', handler as EventListener);
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

  // 앱 배너: 게임 중이거나 사이드바 열림 시 숨김, 그 외에는 표시
  useEffect(() => {
    if (!preloadedBanner || !Capacitor.isNativePlatform()) return;
    if (running || sidebarOpen) {
      preloadedBanner.hide?.().catch(() => {});
    } else {
      preloadedBanner.show?.().catch(() => {});
    }
    return () => {
      preloadedBanner.hide?.().catch(() => {});
    };
  }, [preloadedBanner, running, sidebarOpen]);

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
        const res = await starApi.rpsAddExtra(3, 3);
        if (res && typeof res.used === 'number' && typeof res.extra === 'number') {
          setRpsDaily({ used: res.used, extra: res.extra });
        }
        if (typeof res?.newBalance === 'number') {
          setStarBalance(res.newBalance);
          window.dispatchEvent(new CustomEvent('stars-updated', { detail: { balance: res.newBalance } }));
        }
        toast.success('3판 더 할 수 있어요! ⭐ 3개도 환급되었어요.');
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

  const hideBanner = isNativeApp && (running || sidebarOpen);
  return (
    <Container $sidebarOpen={sidebarOpen} $isNativeApp={isNativeApp} data-rps-page>
      <Card>
        <Header $rightAlign={isNativeApp}>
          <HeaderRow $rightAlign={isNativeApp}>
            <span>✂️ 🗿 📄 가위바위보 아레나</span>
            <StatsFloatingBtn
              type="button"
              onClick={openStatsModal}
              title="RPS 통계"
              $hidden={!showStatsButton}
            >
              📊
            </StatsFloatingBtn>
          </HeaderRow>
        </Header>
        <Body>
          <GameArea>
          <TopFixed>
            <TopFixedInner>
              <StarBetRow>
                <span>⭐ 내 별 {starBalance === null ? '…' : `${starBalance}개`}</span>
                <BetSection $hide={winner !== null}>
                  <span style={{ color: '#cbd5e1', fontWeight: 400 }}>·</span>
                  <span style={{ fontWeight: 600, color: '#475569' }}>배팅</span>
                  <BetRow>
                    {[1, 2, 3].map((n) => (
                      <BetOption key={n} $selected={betAmount === n} $disabled={maxBet < n}>
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
                </BetSection>
              </StarBetRow>
            </TopFixedInner>
          </TopFixed>
          <GuessTitleSection>
            <GuessTitle>
              {winner !== null
                ? `오늘 남은 판수: ${playsRemaining}회`
                : '예측에 성공하면 ⭐을 두배로 드립니다'}
            </GuessTitle>
          </GuessTitleSection>
          <RatioSection>
          {winner !== null ? (
            <GameColumn>
              <SelectionArea>
                <PaletteControls>
                  <ResultMessage $correct={guess === winner}>
                    <span style={{ fontSize: '2rem', lineHeight: 1 }}>{EMOJI[winner]}</span>
                    <span>최종 승자: {LABELS[winner]}</span>
                    <span>
                      {guess !== null
                        ? guess === winner
                          ? `🎉 맞춤! ⭐ ${(currentBetRef.current || 0) * 2}개 지급`
                          : '틀렸어요'
                        : ''}
                    </span>
                  </ResultMessage>
                </PaletteControls>
              </SelectionArea>
              <ButtonArea>
                <StartBtnRow>
                  <ReplayBtnBig onClick={replay}>다시하기</ReplayBtnBig>
                </StartBtnRow>
              </ButtonArea>
              <ArenaParent>
                <ArenaWrap>
                  <canvas ref={canvasRef} width={ARENA} height={ARENA} />
                </ArenaWrap>
              </ArenaParent>
            </GameColumn>
          ) : (
            <GameColumn>
              <SelectionArea>
                <PaletteControls>
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
                </PaletteControls>
              </SelectionArea>
              <ButtonArea>
                <StartBtnRow>
                  {!running ? (
                    isNativeApp ? (
                      playsRemaining <= 0 ? (
                        <ExtraPlayBtn onClick={handleExtraPlayAd} disabled={adLoading}>
                          {adLoading ? '광고 로딩…' : '광고 보고 3판 더 + ⭐3개 환급'}
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
              </ButtonArea>
              <ArenaParent>
                <ArenaWrap>
                  <canvas ref={canvasRef} width={ARENA} height={ARENA} />
                </ArenaWrap>
              </ArenaParent>
            </GameColumn>
          )}
          </RatioSection>
          </GameArea>
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
              <span>{isAdmin ? '📊 가위바위보 통계 (관리자)' : '📊 가위바위보 순위'}</span>
              <StatsModalCloseBtn type="button" onClick={() => setStatsModalOpen(false)}>닫기</StatsModalCloseBtn>
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
                      <th>도전</th>
                      <th>보상</th>
                      <th>환급</th>
                      <th>계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((statsPeriod === 'cumulative' && isAdmin ? statsData.cumulative : statsPeriod === 'weekly' ? (statsData.weekly ?? []) : statsData.today)).length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
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
                            <td>{row.playCount ?? 0}</td>
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
          </StatsModalBox>
        </StatsModalOverlay>
      )}
      {isNativeApp && !running && !sidebarOpen ? (
        <BannerSlot id="rps-banner-slot" data-safe-area-bottom />
      ) : !isNativeApp && !running ? (
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
