import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaExclamationTriangle, FaTrash, FaChevronDown, FaChevronUp, FaBan, FaSyncAlt } from 'react-icons/fa';
import { communityApi, matchingApi, adminApi } from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import InlineSpinner from '../components/InlineSpinner.tsx';

interface CommunityPageProps {
  sidebarOpen: boolean;
}

interface ModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
}

const Container = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => props.$sidebarOpen ? '280px' : '0'};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1.5rem;
    padding-top: calc(var(--mobile-top-padding, 80px) + var(--safe-area-inset-top));
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    padding-top: calc(var(--mobile-top-padding, 70px) + var(--safe-area-inset-top));
  }
`;

const HeaderSection = styled.div`
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
`;

const HeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  width: 100%;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const HeaderTitle = styled.h1`
  color: #ffffff;
  margin: 0;
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1.3;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);

  @media (max-width: 1024px) {
    font-size: 2.1rem;
  }

  @media (max-width: 768px) {
    font-size: 1.9rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.7rem;
  }
`;

const RefreshButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(180deg);
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
  }
`;

const WarningButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
  }
`;

const HeaderSubtitle = styled.p`
  color: #e5e7ff;
  font-size: 1.05rem;
  margin-bottom: 1rem;
  line-height: 1.5;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);

  @media (max-width: 768px) {
    font-size: 0.98rem;
  }

  @media (max-width: 480px) {
    font-size: 0.92rem;
  }
`;

const InfoBox = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 1.25rem;
  margin-top: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 12px;
  }
`;

const InfoTitle = styled.h3`
  color: #7C3AED;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const InfoText = styled.p`
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0 0 0.5rem 0;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const WarningBox = styled.div`
  background: rgba(252, 165, 165, 0.15);
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    padding: 0.85rem;
  }
`;

const WarningTitle = styled.h3`
  color: #dc2626;
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const WarningText = styled.p`
  color: #991b1b;
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0 0 0.4rem 0;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const PeriodStatusWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
  padding: 0 1rem;

  @media (max-width: 768px) {
    gap: 0.75rem;
    margin-top: 1rem;
    padding: 0;
  }
`;

const PeriodStatusBadge = styled.div<{ $status: string }>`
  background: ${props => {
    if (props.$status === '진행중') return 'linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)';
    if (props.$status === '발표완료') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    if (props.$status === '종료') return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  }};
  color: white;
  padding: 1rem 2rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 1.15rem;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  letter-spacing: -0.01em;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    &:hover {
      transform: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }
`;

const ResetInfo = styled.div`
  color: #e5e7ff;
  font-size: 1rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  letter-spacing: -0.01em;
  line-height: 1.5;
  max-width: 400px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0.4rem 0.85rem;
    border-radius: 10px;
    max-width: 100%;
  }
`;

const UserIdentityBox = styled.div`
  background: rgba(124, 58, 237, 0.1);
  border: 2px solid rgba(124, 58, 237, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    padding: 0.85rem;
    gap: 0.5rem;
  }
`;

const AdminIdentitySection = styled.div`
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
  padding: 1rem 1.25rem;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  border: 2px solid rgba(124, 58, 237, 0.3);

  @media (max-width: 768px) {
    padding: 0.85rem 1rem;
    margin-bottom: 0.75rem;
  }
`;

/** 주의사항 버튼 바로 아래 플로팅: 관리자용 익명 ON/OFF 작은 토글 */
const AdminToggleFloating = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const AdminToggleLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
`;

const AdminToggleSwitch = styled.button<{ $on: boolean }>`
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: 1px solid ${props => props.$on ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'};
  background: ${props => props.$on ? 'rgba(124, 58, 237, 0.9)' : 'rgba(255,255,255,0.25)'};
  cursor: pointer;
  padding: 0;
  position: relative;
  transition: background 0.2s, border-color 0.2s;

  &::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    top: 1px;
    left: ${props => props.$on ? '17px' : '1px'};
    transition: left 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
`;

/** 익명 ID 박스 한 줄 (드롭다운·버튼·화살표 우측) */
const AnonymousIdBoxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
`;

const CollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 0.4rem;
  background: none;
  border: none;
  color: #7C3AED;
  cursor: pointer;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: #5b21b6;
    background: rgba(124, 58, 237, 0.1);
  }

  svg {
    font-size: 1.1rem;
  }
`;

const WriteSection = styled.div`
  background: white;
  padding: 1.25rem;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
`;

const WriteTextarea = styled.textarea`
  width: 100%;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  resize: none;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #7C3AED;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const WriteFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const CharCount = styled.div<{ $over: boolean }>`
  font-size: 0.85rem;
  color: ${props => props.$over ? '#ef4444' : '#6b7280'};
`;

const WriteButton = styled.button`
  padding: 0.5rem 1.25rem;
  background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SortSection = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;

  @media (max-width: 768px) {
    margin-bottom: 0.75rem;
    gap: 0.5rem;
  }
`;

const SortLabel = styled.span`
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
`;

const SortSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;

  &:hover {
    border-color: #7C3AED;
  }

  &:focus {
    border-color: #7C3AED;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.65rem;
    font-size: 0.85rem;
  }
`;

const PostsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PostCard = styled.div`
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 10px;
  }
`;

const PostHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const PostAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AnonymousName = styled.span<{ $color: string }>`
  font-weight: 700;
  font-size: 1.05rem;
  color: ${props => props.$color};
`;

const StatusTag = styled.span<{ $type: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    if (props.$type === '매칭성공') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    if (props.$type === '매칭신청완료') return 'linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)';
    if (props.$type === '매칭대기중') return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  }};
  color: white;
`;

/** 공식 관리자 글로 표시될 때 사용하는 배지 (누가 봐도 관리자 글임이 드러남) */
const AdminBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);
  letter-spacing: 0.02em;
`;

const TimeStamp = styled.span`
  font-size: 0.8rem;
  color: #9ca3af;
  font-weight: 400;
`;

const PostActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;

  &:hover {
    color: #7C3AED;
  }
`;

const PostContent = styled.div<{ $collapsed?: boolean }>`
  font-size: 0.95rem;
  line-height: 1.5;
  color: #1f2937;
  margin-bottom: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
  ${props => props.$collapsed ? `
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  ` : ''}

  @media (max-width: 768px) {
    font-size: 0.9rem;
    line-height: 1.4;
  }
`;

const ShowMoreButton = styled.button`
  background: none;
  border: none;
  color: #7C3AED;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  transition: color 0.2s;

  &:hover {
    color: #5b21b6;
  }

  svg {
    font-size: 0.7rem;
  }
`;

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const LikeButton = styled.button<{ $liked: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${props => props.$liked ? '#ef4444' : '#6b7280'};
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$liked ? '#fee2e2' : '#f3f4f6'};
  }

  svg {
    font-size: 1.2rem;
  }
`;

const CommentButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  svg {
    font-size: 1.2rem;
  }
`;

const CommentsSection = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
`;

const CommentItem = styled.div`
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    padding: 0.65rem;
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
`;

const CommentContent = styled.div<{ $collapsed?: boolean }>`
  font-size: 0.88rem;
  color: #374151;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  ${props => props.$collapsed ? `
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  ` : ''}

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const CommentInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #7C3AED;
  }
`;

const CommentSubmitButton = styled.button`
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #7C3AED;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #5b21b6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeletedPostCard = styled.div`
  background: #e5e7eb;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  text-align: center;
  color: rgb(98, 109, 126);
  font-style: italic;
  font-weight: 600;

  @media (max-width: 768px) {
    padding: 0.65rem 1rem;
    border-radius: 10px;
  }
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  color: #7C3AED;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #7C3AED;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.85rem;
    font-size: 0.9rem;
  }
`;

const ModalOverlay = styled.div<{ $show: boolean }>`
  display: ${props => props.$show ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    max-width: 90vw;
  }
`;

const ModalTitle = styled.h2`
  margin: 0;
  padding: 2rem 2rem 1rem 2rem;
  font-size: 1.5rem;
  color: #333;
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 1.3rem;
    padding: 1.5rem 1.5rem 1rem 1.5rem;
  }
`;

const ModalBody = styled.div`
  padding: 0 2rem;
  color: #666;
  line-height: 1.6;
  font-size: 0.95rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0 1.5rem;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem 2rem 2rem 2rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    flex-direction: column-reverse;
    padding: 1.5rem 1.5rem 1.5rem 1.5rem;
  }
`;

const ModalButton = styled.button<{ $primary?: boolean }>`
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
    }
  ` : `
    background: #f3f4f6;
    color: #374151;
    
    &:hover {
      background: #e5e7eb;
    }
  `}

  @media (max-width: 768px) {
    padding: 0.65rem 1.25rem;
    font-size: 0.9rem;
  }
`;

// PeriodStatusBadge와 InfoButton은 위쪽에 새로  정의됨 (제거됨)

const ReportCategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const CategoryButton = styled.button<{ $selected: boolean }>`
  padding: 0.75rem;
  border-radius: 10px;
  border: 2px solid ${props => props.$selected ? '#7C3AED' : '#e5e7eb'};
  background: ${props => props.$selected ? 'rgba(124, 58, 237, 0.1)' : 'white'};
  color: ${props => props.$selected ? '#7C3AED' : '#6b7280'};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #7C3AED;
    background: rgba(124, 58, 237, 0.05);
  }

  @media (max-width: 768px) {
    padding: 0.65rem;
    font-size: 0.85rem;
  }
`;

const ReportTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #7C3AED;
  }

  &::placeholder {
    color: #9ca3af;
  }

  @media (max-width: 768px) {
    font-size: 0.85rem;
    min-height: 70px;
  }
`;

const ReportLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.9rem;

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

// Modal 컴포넌트
const Modal: React.FC<ModalProps> = ({ show, onClose, onConfirm, title, children, confirmText = '확인', cancelText = '취소' }) => {
  if (!show) return null;

  return (
    <ModalOverlay $show={show} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{title}</ModalTitle>
        <ModalBody>{children}</ModalBody>
        <ModalActions>
          <ModalButton onClick={onClose}>{cancelText}</ModalButton>
          {onConfirm && <ModalButton $primary onClick={onConfirm}>{confirmText}</ModalButton>}
        </ModalActions>
      </ModalContent>
    </ModalOverlay>
  );
};

const CommunityPage: React.FC<CommunityPageProps> = ({ sidebarOpen }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const postRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [currentPeriodId, setCurrentPeriodId] = useState<number | null>(null);
  const [myIdentity, setMyIdentity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<number[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [comments, setComments] = useState<Record<number, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [expandedPostContent, setExpandedPostContent] = useState<Set<number>>(new Set());
  const [expandedCommentContent, setExpandedCommentContent] = useState<Set<number>>(new Set());
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'post' | 'comment', id: number, postId?: number} | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{type: 'post' | 'comment', id: number} | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('욕설');
  const [reportDetail, setReportDetail] = useState<string>('');
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set()); // 'post:123' 또는 'comment:456' 형식
  
  // [관리자 전용] 익명 ID 관리
  const [adminIdentities, setAdminIdentities] = useState<Array<{ anonymousNumber: number; colorCode: string; tag: string }>>([]);
  const [selectedAnonymousNumber, setSelectedAnonymousNumber] = useState<number | null>(null);
  const [creatingIdentity, setCreatingIdentity] = useState(false);
  const [bulkCreateCount, setBulkCreateCount] = useState<string>('1');
  const [creatingBulkIdentity, setCreatingBulkIdentity] = useState(false);
  // [관리자 전용] false = 익명으로 작성(익명 ID 박스 표시), true = 관리자로 작성
  const [postAsAdmin, setPostAsAdmin] = useState(false);
  // [관리자 전용] 익명 ID 박스 접기/펼치기 (익명 모드일 때만 박스 표시)
  const [anonymousIdBoxCollapsed, setAnonymousIdBoxCollapsed] = useState(false);

  // 정렬 옵션
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  
  // 필터 옵션
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  // 도배 방지 쿨다운
  const [postCooldown, setPostCooldown] = useState(0);
  const [commentCooldowns, setCommentCooldowns] = useState<Record<number, number>>({});

  // 커뮤니티 기능 활성화 여부 확인
  useEffect(() => {
    let cancelled = false;
    
    const checkCommunityEnabled = async () => {
      // 관리자가 아닌 경우 기본값(true) 사용, API 호출 안 함
      if (!user?.isAdmin) {
        return; // 접근 허용
      }
      
      try {
        const res = await adminApi.getSystemSettings();
        if (cancelled) return;
        
        if (res?.community?.enabled === false) {
          toast.error('커뮤니티 기능이 현재 비활성화되어 있습니다.');
          navigate('/main');
        }
      } catch (err) {
        console.error('[CommunityPage] 커뮤니티 설정 조회 오류:', err);
        // 오류 시 접근 허용 (기본값 true)
      }
    };
    
    checkCommunityEnabled();
    
    return () => {
      cancelled = true;
    };
  }, [navigate, user?.isAdmin]);

  // 상대 시간 포맷 함수
  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    
    // 7일 이상이면 날짜 표시
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 서버에서 이미 정렬된 데이터를 받으므로 클라이언트 정렬 불필요

  // 쿨다운 타이머 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setPostCooldown(prev => prev > 0 ? prev - 1 : 0);
      setCommentCooldowns(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          const postId = parseInt(key);
          if (updated[postId] > 0) {
            updated[postId] -= 1;
          } else {
            delete updated[postId];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer as unknown as number);
  }, []);

  // 현재 회차 정보 조회 (커뮤니티 전용: 준비중 상태 제외)
  useEffect(() => {
    const fetchPeriod = async () => {
      try {
        const data = await matchingApi.getMatchingPeriodForCommunity();
        const period = data?.current || null;
        if (period?.id) {
          setCurrentPeriodId(period.id);
          setCurrentPeriod(period);
        } else {
          // 회차가 없거나 준비중 상태만 있는 경우
          setCurrentPeriodId(null);
          setCurrentPeriod(null);
        }
      } catch (error) {
        console.error('[CommunityPage] 회차 정보 조회 오류:', error);
        toast.error('회차 정보를 불러올 수 없습니다.');
        setCurrentPeriodId(null);
        setCurrentPeriod(null);
      }
    };

    fetchPeriod();
  }, []);

  // 내 익명 ID 및 게시글 목록 조회 (첫 페이지)
  const loadData = useCallback(async () => {
    if (!currentPeriodId || !user) return;

    setLoading(true);
    try {
      // 병렬로 API 호출하여 성능 개선
      const anonymousNum = user?.isAdmin && selectedAnonymousNumber ? selectedAnonymousNumber : undefined;
      
      const [identity, postsResult, likesResult] = await Promise.all([
        communityApi.getMyIdentity(currentPeriodId),
        communityApi.getPosts(currentPeriodId, 20, 0, sortOrder, filter),
        communityApi.getMyLikes(currentPeriodId, anonymousNum)
      ]);

      setMyIdentity(identity);
      setPosts(postsResult.posts);
      setOffset(20); // 다음 로드는 20부터
      setHasMore(postsResult.hasMore);
      setLikedPostIds(likesResult.likedPostIds);
    } catch (error) {
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentPeriodId, user, selectedAnonymousNumber, sortOrder, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 매칭 신청 상태 변경 시 게시글 목록 갱신 (태그 업데이트)
  useEffect(() => {
    const handleMatchingStatusChanged = () => {
      if (currentPeriodId && user) {
        // 게시글 목록만 다시 로드 (태그 갱신)
        const refreshPosts = async () => {
          try {
            const { posts: fetchedPosts, hasMore: more } = await communityApi.getPosts(
              currentPeriodId!,
              20,
              0,
              sortOrder,
              filter
            );
            setPosts(fetchedPosts);
            setOffset(20);
            setHasMore(more);
          } catch (error) {
            // 조용히 실패 (사용자에게 알림 없음)
          }
        };
        refreshPosts();
      }
    };

    window.addEventListener('matching-status-changed', handleMatchingStatusChanged);

    return () => {
      window.removeEventListener('matching-status-changed', handleMatchingStatusChanged);
    };
  }, [currentPeriodId, user, sortOrder, filter]);

  // URL 파라미터로 특정 게시글로 이동 및 댓글창 열기
  useEffect(() => {
    const postIdParam = searchParams.get('postId');
    const openComments = searchParams.get('openComments') === 'true';
    
    if (!postIdParam || !posts.length) return;
    
    const targetPostId = parseInt(postIdParam, 10);
    if (isNaN(targetPostId)) return;
    
    // 게시글이 현재 로드된 목록에 있는지 확인
    const targetPost = posts.find(p => p.id === targetPostId);
    
    if (targetPost) {
      // 게시글이 있으면 댓글창 열기 및 스크롤
      if (openComments && !expandedPosts.has(targetPostId)) {
        // 댓글 로드 및 댓글창 열기
        const loadAndOpenComments = async () => {
          try {
            const { comments: fetchedComments } = await communityApi.getComments(targetPostId);
            setComments(prev => ({ ...prev, [targetPostId]: fetchedComments }));
            setExpandedPosts(prev => new Set(prev).add(targetPostId));
            
            // 스크롤 (약간의 딜레이를 두어 DOM 업데이트 후 실행)
            setTimeout(() => {
              const postElement = postRefs.current[targetPostId];
              if (postElement) {
                postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          } catch (error) {
            toast.error('댓글을 불러오는데 실패했습니다.');
          }
        };
        
        loadAndOpenComments();
      } else if (!openComments) {
        // 댓글창은 열지 않고 스크롤만
        setTimeout(() => {
          const postElement = postRefs.current[targetPostId];
          if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      
      // URL 파라미터 제거 (한 번만 실행되도록)
      setSearchParams({}, { replace: true });
    } else {
      // 게시글이 현재 목록에 없으면 더 로드 시도 (최대 5페이지까지)
      const tryLoadMore = async () => {
        let currentOffset = offset;
        let attempts = 0;
        const maxAttempts = 5; // 최대 5페이지 (100개 게시글)
        
        while (attempts < maxAttempts) {
          try {
            const { posts: morePosts, hasMore: more } = await communityApi.getPosts(
              currentPeriodId!,
              20,
              currentOffset,
              sortOrder,
              filter
            );
            
            if (morePosts.length === 0) break;
            
            setPosts(prev => [...prev, ...morePosts]);
            currentOffset += 20;
            setOffset(currentOffset);
            setHasMore(more);
            
            // 찾는 게시글이 있는지 확인
            const found = morePosts.find(p => p.id === targetPostId);
            if (found) {
              // 찾았으면 댓글창 열기
              if (openComments) {
                try {
                  const { comments: fetchedComments } = await communityApi.getComments(targetPostId);
                  setComments(prev => ({ ...prev, [targetPostId]: fetchedComments }));
                  setExpandedPosts(prev => new Set(prev).add(targetPostId));
                } catch (error) {
                  // 댓글 로드 실패는 무시
                }
              }
              
              // 스크롤
              setTimeout(() => {
                const postElement = postRefs.current[targetPostId];
                if (postElement) {
                  postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 300);
              
              // URL 파라미터 제거
              setSearchParams({}, { replace: true });
              break;
            }
            
            if (!more) break; // 더 이상 로드할 게시글이 없으면 중단
            attempts++;
          } catch (error) {
            break;
          }
        }
      };
      
      if (currentPeriodId && hasMore) {
        tryLoadMore();
      }
    }
  }, [posts, searchParams, expandedPosts, currentPeriodId, offset, sortOrder, filter, hasMore, setSearchParams]);

  // [관리자 전용] 익명 ID 목록 조회
  const loadAdminIdentities = useCallback(async () => {
    if (!currentPeriodId || !user?.isAdmin) return;

    try {
      const { identities } = await communityApi.getAdminIdentities(currentPeriodId);
      setAdminIdentities(identities);
      
      // 첫 번째 익명 ID를 기본 선택
      if (identities.length > 0 && !selectedAnonymousNumber) {
        setSelectedAnonymousNumber(identities[0].anonymousNumber);
      }
    } catch (error) {
      // 익명 ID 조회 실패 (무시)
    }
  }, [currentPeriodId, user, selectedAnonymousNumber]);

  useEffect(() => {
    if (user?.isAdmin) {
      loadAdminIdentities();
    }
  }, [user, loadAdminIdentities]);

  // 더 많은 게시글 로드 (페이지네이션)
  const loadMore = async () => {
    if (!currentPeriodId || !hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const { posts: morePosts, hasMore: more } = await communityApi.getPosts(currentPeriodId, 20, offset, sortOrder, filter);
      setPosts(prev => [...prev, ...morePosts]);
      setOffset(prev => prev + 20);
      setHasMore(more);
    } catch (error) {
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoadingMore(false);
    }
  };

  // [관리자 전용] 새 익명 ID 생성 (자동 번호)
  const handleCreateIdentity = async () => {
    if (!currentPeriodId) return;
    
    setCreatingIdentity(true);
    try {
      const result = await communityApi.createAdminIdentity(currentPeriodId);
      toast.success(result.message);
      await loadAdminIdentities(); // 목록 새로고침
      setSelectedAnonymousNumber(result.anonymousNumber); // 새로 만든 ID를 선택
    } catch (error: any) {
      toast.error(error?.response?.data?.error || '익명 ID 생성에 실패했습니다.');
    } finally {
      setCreatingIdentity(false);
    }
  };

  // [관리자 전용] 익명 ID 일괄 생성 (N개)
  const handleCreateBulkIdentities = async () => {
    if (!currentPeriodId) return;
    
    const count = parseInt(bulkCreateCount, 10);
    if (!count || count < 1 || count > 100) {
      toast.error('생성 개수는 1개 이상 100개 이하여야 합니다.');
      return;
    }
    
    setCreatingBulkIdentity(true);
    try {
      const result = await communityApi.createAdminIdentitiesBulk(currentPeriodId, count);
      toast.success(result.message);
      await loadAdminIdentities(); // 목록 새로고침
      setBulkCreateCount('1'); // 입력 필드 초기화
      // 마지막 생성된 ID를 선택
      if (result.identities && result.identities.length > 0) {
        const lastIdentity = result.identities[result.identities.length - 1];
        setSelectedAnonymousNumber(lastIdentity.anonymousNumber);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || '익명 ID 일괄 생성에 실패했습니다.');
    } finally {
      setCreatingBulkIdentity(false);
    }
  };

  // 게시글 작성
  const handleSubmitPost = async () => {
    if (!currentPeriodId) return;
    if (!newPostContent.trim()) {
      toast.warn('내용을 입력해주세요.');
      return;
    }
    if (newPostContent.length > 500) {
      toast.warn('게시글은 500자 이내로 작성해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      // 관리자가 익명 ID를 선택한 경우 해당 ID로 작성; postAsAdmin이면 공식 관리자 ID로 표시
      const preferredNumber = user?.isAdmin ? selectedAnonymousNumber : undefined;
      await communityApi.createPost(currentPeriodId, newPostContent, preferredNumber ?? undefined, postAsAdmin || undefined);
      toast.success('게시글이 작성되었습니다.');
      setNewPostContent('');
      setPostCooldown(30); // 30초 쿨다운 시작
      loadData();
      if (user?.isAdmin) {
        loadAdminIdentities(); // 관리자 익명 ID 목록 갱신
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      
      // 429 에러 (쿨다운 또는 횟수 제한)
      if (error?.response?.status === 429) {
        if (errorData?.cooldown) {
          setPostCooldown(errorData.cooldown);
        }
        toast.error(errorData?.error || '게시글 작성에 실패했습니다.');
      } else {
        toast.error(errorData?.error || '게시글 작성에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 좋아요 토글
  const handleToggleLike = async (postId: number) => {
    try {
      // 관리자는 현재 선택된 익명 번호로 좋아요
      const anonymousNum = user?.isAdmin ? selectedAnonymousNumber : undefined;
      const { liked } = await communityApi.toggleLike(postId, anonymousNum || undefined);
      if (liked) {
        setLikedPostIds(prev => [...prev, postId]);
      } else {
        setLikedPostIds(prev => prev.filter(id => id !== postId));
      }

      // 게시글 목록 갱신 (like_count 반영)
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return { ...post, like_count: post.like_count + (liked ? 1 : -1) };
        }
        return post;
      }));
    } catch (error: any) {
      // 410 에러 (삭제된 게시글)인 경우
      if (error?.response?.status === 410 && error?.response?.data?.code === 'POST_DELETED') {
        toast.error('삭제된 게시글입니다. 페이지를 새로고침합니다.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error('좋아요 처리에 실패했습니다.');
      }
    }
  };

  // 댓글 토글
  const handleToggleComments = async (postId: number) => {
    if (expandedPosts.has(postId)) {
      setExpandedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      // 댓글 로드
      try {
        const { comments: fetchedComments } = await communityApi.getComments(postId);
        setComments(prev => ({ ...prev, [postId]: fetchedComments }));
        setExpandedPosts(prev => new Set(prev).add(postId));
      } catch (error) {
        toast.error('댓글을 불러오는데 실패했습니다.');
      }
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (postId: number) => {
    const content = commentInputs[postId];
    if (!content?.trim()) {
      toast.warn('댓글 내용을 입력해주세요.');
      return;
    }
    if (content.length > 100) {
      toast.warn('댓글은 100자 이내로 작성해주세요.');
      return;
    }

    try {
      // 관리자가 익명 ID를 선택한 경우 해당 ID로 작성; postAsAdmin이면 공식 관리자 ID로 표시
      const preferredNumber = user?.isAdmin ? selectedAnonymousNumber : undefined;
      await communityApi.createComment(postId, content, preferredNumber ?? undefined, postAsAdmin || undefined);
      toast.success('댓글이 작성되었습니다.');
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setCommentCooldowns(prev => ({ ...prev, [postId]: 10 })); // 10초 쿨다운 시작

      // 댓글 목록 갱신
      const { comments: fetchedComments } = await communityApi.getComments(postId);
      setComments(prev => ({ ...prev, [postId]: fetchedComments }));

      // 게시글 comment_count 증가
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return { ...post, comment_count: post.comment_count + 1 };
        }
        return post;
      }));
      
      if (user?.isAdmin) {
        loadAdminIdentities(); // 관리자 익명 ID 목록 갱신
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      
      // 410 에러 (삭제된 게시글)인 경우
      if (error?.response?.status === 410 && errorData?.code === 'POST_DELETED') {
        toast.error('삭제된 게시글입니다. 페이지를 새로고침합니다.');
        setTimeout(() => window.location.reload(), 1500);
      } 
      // 429 에러 (쿨다운)
      else if (error?.response?.status === 429) {
        if (errorData?.cooldown) {
          setCommentCooldowns(prev => ({ ...prev, [postId]: errorData.cooldown }));
        }
        toast.error(errorData?.error || '댓글 작성에 실패했습니다.');
      } 
      else {
        toast.error(errorData?.error || '댓글 작성에 실패했습니다.');
      }
    }
  };

  // 게시글 삭제 요청
  const requestDeletePost = (postId: number) => {
    setDeleteTarget({ type: 'post', id: postId });
    setShowDeleteModal(true);
  };

  // 댓글 삭제 요청
  const requestDeleteComment = (postId: number, commentId: number) => {
    setDeleteTarget({ type: 'comment', id: commentId, postId });
    setShowDeleteModal(true);
  };

  // 삭제 확인
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'post') {
        await communityApi.deletePost(deleteTarget.id);
        toast.success('게시글이 삭제되었습니다.');
        loadData();
      } else if (deleteTarget.type === 'comment' && deleteTarget.postId) {
        await communityApi.deleteComment(deleteTarget.id);
        toast.success('댓글이 삭제되었습니다.');

        // 댓글 목록 갱신
        const { comments: fetchedComments } = await communityApi.getComments(deleteTarget.postId);
        setComments(prev => ({ ...prev, [deleteTarget.postId!]: fetchedComments }));

        // 게시글 comment_count 감소
        setPosts(prev => prev.map(post => {
          if (post.id === deleteTarget.postId) {
            return { ...post, comment_count: Math.max(post.comment_count - 1, 0) };
          }
          return post;
        }));
      }
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // 신고 요청
  const requestReport = (targetType: 'post' | 'comment', targetId: number) => {
    const reportKey = `${targetType}:${targetId}`;
    
    // 이미 신고한 항목인지 확인
    if (reportedItems.has(reportKey)) {
      toast.info('이미 신고한 ' + (targetType === 'post' ? '게시글' : '댓글') + '입니다.');
      return;
    }
    
    setReportTarget({ type: targetType, id: targetId });
    setReportCategory('욕설');
    setReportDetail('');
    setShowReportModal(true);
  };

  // 신고 확인
  const confirmReport = async () => {
    if (!reportTarget) return;

    const reason = `[${reportCategory}] ${reportDetail.trim() || '상세 내용 없음'}`;
    const reportKey = `${reportTarget.type}:${reportTarget.id}`;

    try {
      // 관리자는 현재 선택된 익명 번호로 신고
      const anonymousNum = user?.isAdmin ? selectedAnonymousNumber : undefined;
      await communityApi.reportContent(reportTarget.type, reportTarget.id, reason, anonymousNum || undefined);
      
      // 신고 성공 시 reportedItems에 추가
      setReportedItems(prev => new Set(prev).add(reportKey));
      
      toast.success('신고가 접수되었습니다.');
      setShowReportModal(false);
      setReportTarget(null);
      setReportCategory('욕설');
      setReportDetail('');
      
      // 페이지 갱신 (신고 누적으로 삭제된 게시글/댓글 반영)
      loadData();
    } catch (error: any) {
      // 410 에러 (삭제된 게시글/댓글)인 경우
      if (error?.response?.status === 410) {
        const code = error?.response?.data?.code;
        if (code === 'POST_DELETED') {
          toast.error('삭제된 게시글입니다. 페이지를 새로고침합니다.');
        } else if (code === 'COMMENT_DELETED') {
          toast.error('삭제된 댓글입니다. 페이지를 새로고침합니다.');
        } else {
          toast.error('삭제된 항목입니다. 페이지를 새로고침합니다.');
        }
        setShowReportModal(false);
        setReportTarget(null);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      
      const errorMsg = error?.response?.data?.error || '신고에 실패했습니다.';
      
      // 이미 신고한 경우 reportedItems에 추가
      if (errorMsg.includes('이미 신고')) {
        setReportedItems(prev => new Set(prev).add(reportKey));
      }
      
      toast.error(errorMsg);
      setShowReportModal(false);
      setReportTarget(null);
    }
  };

  // [관리자 전용] 강제 삭제
  const handleAdminDelete = async (targetType: 'post' | 'comment', targetId: number, postId?: number) => {
    if (!window.confirm(`정말로 이 ${targetType === 'post' ? '게시글' : '댓글'}을(를) 삭제하시겠습니까?\n\n삭제된 글은 "관리자에 의해 차단된 글입니다"로 표시됩니다.`)) {
      return;
    }

    try {
      if (targetType === 'post') {
        await communityApi.adminDeletePost(targetId);
        toast.success('게시글이 삭제되었습니다.');
      } else {
        await communityApi.adminDeleteComment(targetId);
        toast.success('댓글이 삭제되었습니다.');
      }
      
      // 페이지 갱신
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const getPeriodStatusText = (status: string, periodNum: number) => {
    if (status === '진행중') return `${periodNum}회차 매칭 신청중`;
    if (status === '발표완료') return `${periodNum}회차 매칭 진행중`;
    if (status === '종료') return `${periodNum}회차 매칭 종료`;
    return `${periodNum}회차`;
  };

  const getResetInfo = (status: string, periodNum: number) => {
    if (status === '종료') return `${periodNum + 1}회차 신청 시작 시 초기화`;
    if (status === '진행중') return `${periodNum}회차 매칭 발표 시 초기화`;
    if (status === '발표완료') return `${periodNum}회차 매칭 종료 시 초기화`;
    return '';
  };

  if (loading) {
    return (
      <Container $sidebarOpen={sidebarOpen}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <InlineSpinner text="커뮤니티를 불러오는 중..." />
        </div>
      </Container>
    );
  }

  if (!currentPeriodId) {
    return (
      <Container $sidebarOpen={sidebarOpen}>
        <HeaderSection>
          <HeaderTitleRow>
            <LeftGroup>
              <HeaderTitle>💬 커뮤니티</HeaderTitle>
              <RefreshButton onClick={handleRefresh} title="새로고침">
                <FaSyncAlt size={18} />
              </RefreshButton>
            </LeftGroup>
            <WarningButton onClick={() => setShowWarningModal(true)}>
              ⚠️ 주의사항
            </WarningButton>
          </HeaderTitleRow>
          
          <HeaderSubtitle>
            아직 커뮤니티를 사용할 수 있는 회차가 없습니다.<br/>
            매칭 신청이 시작되면 커뮤니티를 이용하실 수 있습니다.
          </HeaderSubtitle>
        </HeaderSection>
      </Container>
    );
  }

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <HeaderSection>
        <HeaderTitleRow>
          <LeftGroup>
            <HeaderTitle>💬 커뮤니티</HeaderTitle>
            <RefreshButton onClick={handleRefresh} title="새로고침">
              <FaSyncAlt size={18} />
            </RefreshButton>
          </LeftGroup>
          <WarningButton onClick={() => setShowWarningModal(true)}>
            ⚠️ 주의사항
          </WarningButton>
        </HeaderTitleRow>
        {user?.isAdmin && (
          <AdminToggleFloating>
            <AdminToggleLabel>익명</AdminToggleLabel>
            <AdminToggleSwitch
              type="button"
              $on={!postAsAdmin}
              onClick={() => setPostAsAdmin(prev => !prev)}
              title={postAsAdmin ? '익명으로 전환' : '관리자로 전환'}
            />
          </AdminToggleFloating>
        )}
        
        <HeaderSubtitle>
          익명으로 자유롭게 소통하세요<br/>
          해당 페이지는 매칭 시작, 발표, 종료 시 자동 초기화됩니다.<br/>
          커뮤니티를 통해 매칭 후기를 이야기하고, 다음 매칭을 위한 셀프 자기소개를 공유해보세요.
        </HeaderSubtitle>
        
        {currentPeriod && (
          <PeriodStatusWrapper>
            <PeriodStatusBadge $status={currentPeriod.status}>
              {getPeriodStatusText(currentPeriod.status, currentPeriod.periodNumber || currentPeriod.id)}
            </PeriodStatusBadge>
            <ResetInfo>
              {getResetInfo(currentPeriod.status, currentPeriod.periodNumber || currentPeriod.id)}
            </ResetInfo>
          </PeriodStatusWrapper>
        )}
      </HeaderSection>

      {/* 주의사항 모달 */}
      <Modal
        show={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="⚠️ 커뮤니티 이용 주의사항"
      >
        <div style={{ color: '#374151', lineHeight: '1.4' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#7C3AED' }}>📝 작성 규칙</p>
          <p style={{ marginBottom: '0.3rem', marginLeft: '0.5rem' }}>• 게시글: <strong>500자 이내</strong>, 댓글: <strong>100자 이내</strong></p>
          <p style={{ marginBottom: '0.5rem', marginLeft: '0.5rem' }}>• 게시글: <strong>1시간에 최대 5개</strong>까지 작성 가능</p>
          
          <p style={{ marginBottom: '0.5rem', marginTop: '0.75rem', fontWeight: 600, color: '#10b981' }}>⏱️ 도배 방지</p>
          <p style={{ marginBottom: '0.3rem', marginLeft: '0.5rem' }}>• 게시글: <strong>30초에 한 번</strong>만 작성 가능</p>
          <p style={{ marginBottom: '0.3rem', marginLeft: '0.5rem' }}>• 댓글: <strong>10초에 한 번</strong>만 작성 가능</p>
          <p style={{ marginBottom: '0.5rem', marginLeft: '0.5rem' }}>• 동일한 내용을 연속으로 작성할 수 없습니다</p>
          
          <p style={{ marginBottom: '0.5rem', marginTop: '0.75rem', fontWeight: 600, color: '#ef4444' }}>🚫 금지 행위</p>
          <p style={{ marginBottom: '0.3rem', marginLeft: '0.5rem' }}>• <strong>욕설 및 비속어</strong> 사용</p>
          <p style={{ marginBottom: '0.3rem', marginLeft: '0.5rem' }}>• <strong>성적인 발언</strong> 및 성희롱</p>
          <p style={{ marginBottom: '0.3rem', marginLeft: '0.5rem' }}>• <strong>특정인에 대한 비난</strong> 및 명예훼손</p>
          <p style={{ marginBottom: '0.3rem', marginLeft: '0.5rem' }}>• 개인정보 노출 및 유포</p>
          <p style={{ marginBottom: '0.5rem', marginLeft: '0.5rem' }}>• 스팸 및 도배 행위</p>
          
          <p style={{ marginBottom: '0.5rem', marginTop: '0.75rem', fontWeight: 600, color: '#f59e0b' }}>⚖️ 제재 안내</p>
          <p style={{ marginBottom: 0, marginLeft: '0.5rem' }}>• <strong>일정 수 이상의 신고</strong>가 누적되면 자동삭제됩니다.</p>
          <p style={{ marginBottom: 0, marginLeft: '0.5rem' }}>• 기타 타인에게 불편을 줄 수 있는 글은 관리자에 의해 <strong>경고 없이 삭제</strong>될 수 있습니다.</p>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="삭제 확인"
        confirmText="삭제"
        cancelText="취소"
      >
        <p>{deleteTarget?.type === 'post' ? '게시글을 삭제하시겠습니까?' : '댓글을 삭제하시겠습니까?'}</p>
        <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.9rem' }}>삭제된 내용은 복구할 수 없습니다.</p>
      </Modal>

      {/* 신고 모달 */}
      <Modal
        show={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportTarget(null);
          setReportCategory('욕설');
          setReportDetail('');
        }}
        onConfirm={confirmReport}
        title="🚨 신고하기"
        confirmText="신고 접수"
        cancelText="취소"
      >
        <div>
          <ReportLabel>신고 사유 선택 *</ReportLabel>
          <ReportCategoryGrid>
            {['욕설', '성적 발언', '특정인 비난', '스팸/광고', '기타'].map(category => (
              <CategoryButton
                key={category}
                $selected={reportCategory === category}
                onClick={() => setReportCategory(category)}
                type="button"
              >
                {category}
              </CategoryButton>
            ))}
          </ReportCategoryGrid>

          <ReportLabel>상세 내용 (선택)</ReportLabel>
          <ReportTextarea
            placeholder="신고 사유를 자세히 작성해주세요..."
            value={reportDetail}
            onChange={(e) => setReportDetail(e.target.value)}
            maxLength={200}
          />
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {reportDetail.length} / 200
          </div>
        </div>
      </Modal>

      {/* [관리자 전용] 익명 ON이면 익명 ID 박스 표시 */}
      {user?.isAdmin && !postAsAdmin && (
            <AdminIdentitySection>
              <AnonymousIdBoxRow>
                {!anonymousIdBoxCollapsed && (
                  <>
                    {adminIdentities.length > 0 && selectedAnonymousNumber && (
                      <span
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px',
                          background: adminIdentities.find(i => i.anonymousNumber === selectedAnonymousNumber)?.colorCode || '#888888',
                          color: 'white',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        익명{selectedAnonymousNumber}
                      </span>
                    )}
                    <select
                      value={selectedAnonymousNumber || ''}
                      onChange={(e) => setSelectedAnonymousNumber(Number(e.target.value))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '2px solid #7C3AED',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    >
                      {adminIdentities.length === 0 && <option value="">익명 ID 없음</option>}
                      {adminIdentities.map(identity => (
                        <option key={identity.anonymousNumber} value={identity.anonymousNumber}>
                          익명{identity.anonymousNumber}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateIdentity}
                      disabled={creatingIdentity || creatingBulkIdentity}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '2px solid #10B981',
                        background: (creatingIdentity || creatingBulkIdentity) ? '#9CA3AF' : '#10B981',
                        color: 'white',
                        cursor: (creatingIdentity || creatingBulkIdentity) ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!creatingIdentity && !creatingBulkIdentity) e.currentTarget.style.background = '#059669';
                      }}
                      onMouseLeave={(e) => {
                        if (!creatingIdentity && !creatingBulkIdentity) e.currentTarget.style.background = '#10B981';
                      }}
                    >
                      {creatingIdentity ? '생성 중...' : '+ 새 익명 ID 생성'}
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={bulkCreateCount}
                        onChange={(e) => setBulkCreateCount(e.target.value)}
                        disabled={creatingIdentity || creatingBulkIdentity}
                        placeholder="개수"
                        style={{
                          width: '60px',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '2px solid #7C3AED',
                          background: 'white',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      />
                      <button
                        onClick={handleCreateBulkIdentities}
                        disabled={creatingIdentity || creatingBulkIdentity}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '2px solid #7C3AED',
                          background: (creatingIdentity || creatingBulkIdentity) ? '#9CA3AF' : '#7C3AED',
                          color: 'white',
                          cursor: (creatingIdentity || creatingBulkIdentity) ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!creatingIdentity && !creatingBulkIdentity) e.currentTarget.style.background = '#6D28D9';
                        }}
                        onMouseLeave={(e) => {
                          if (!creatingIdentity && !creatingBulkIdentity) e.currentTarget.style.background = '#7C3AED';
                        }}
                      >
                        {creatingBulkIdentity ? '생성 중...' : '다중 생성'}
                      </button>
                    </div>
                  </>
                )}
                <CollapseButton
                  type="button"
                  onClick={() => setAnonymousIdBoxCollapsed(prev => !prev)}
                  title={anonymousIdBoxCollapsed ? '펼치기' : '접기'}
                >
                  {anonymousIdBoxCollapsed ? <FaChevronDown /> : <FaChevronUp />}
                </CollapseButton>
              </AnonymousIdBoxRow>
            </AdminIdentitySection>
      )}

      <WriteSection>
        <WriteTextarea
          placeholder="게시글을 입력하세요... (최대 500자)"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          rows={3}
          maxLength={500}
        />
        <WriteFooter>
          <CharCount $over={newPostContent.length > 500}>
            {newPostContent.length} / 500
          </CharCount>
          <WriteButton
            onClick={handleSubmitPost}
            disabled={submitting || !newPostContent.trim() || newPostContent.length > 500 || (postCooldown > 0 && !user?.isAdmin)}
          >
            {submitting ? '작성 중...' : postCooldown > 0 && !user?.isAdmin ? `${postCooldown}초 후 작성 가능` : '게시'}
          </WriteButton>
        </WriteFooter>
      </WriteSection>

      {/* 필터 및 정렬 옵션 */}
      <SortSection>
        <SortSelect 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as 'all' | 'mine')}
        >
          <option value="all">전체</option>
          <option value="mine">내가 쓴 글</option>
        </SortSelect>
        <SortSelect 
          value={sortOrder} 
          onChange={(e) => setSortOrder(e.target.value as 'latest' | 'popular')}
        >
          <option value="latest">최신순</option>
          <option value="popular">추천순</option>
        </SortSelect>
      </SortSection>

      <PostsContainer>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            아직 게시글이 없습니다. 첫 번째 게시글을 작성해보세요!
          </div>
        ) : (
          <>
          {posts.map(post => {
            if (post.is_deleted) {
              return (
                <DeletedPostCard 
                  key={post.id}
                  ref={(el) => {
                    postRefs.current[post.id] = el;
                  }}
                >
                  {post.is_author_deleted 
                    ? '작성자에 의해 삭제된 글입니다.'
                    : post.is_admin_deleted 
                    ? '관리자에 의해 차단된 글입니다.' 
                    : '신고 누적으로 삭제된 글입니다.'}
                </DeletedPostCard>
              );
            }

            const isMyPost = user?.id === post.user_id;
            const isLiked = likedPostIds.includes(post.id);
            const isExpanded = expandedPosts.has(post.id);
            const isContentExpanded = expandedPostContent.has(post.id);
            // 3줄 초과 판단: 개행 문자가 3개 이상(4줄 이상)이거나, 글자 수가 90자 이상
            const lineBreaks = (post.content.match(/\n/g) || []).length;
            const needsExpand = lineBreaks > 2 || post.content.length > 90;

            return (
              <PostCard 
                key={post.id}
                ref={(el) => {
                  postRefs.current[post.id] = el;
                }}
              >
                <PostHeader>
                  <PostAuthor>
                    {post.is_admin_post ? (
                      <AdminBadge>👑 관리자</AdminBadge>
                    ) : (
                      <AnonymousName $color={post.color_code}>
                        익명{post.anonymous_number}
                      </AnonymousName>
                    )}
                    {post.tag && <StatusTag $type={post.tag}>{post.tag}</StatusTag>}
                    <TimeStamp>{getRelativeTime(post.created_at)}</TimeStamp>
                  </PostAuthor>
                  <PostActions>
                    {user?.isAdmin && (
                      <IconButton 
                        onClick={() => handleAdminDelete('post', post.id)} 
                        title="관리자 차단"
                        style={{ color: '#dc2626' }}
                      >
                        <FaBan />
                      </IconButton>
                    )}
                    {!isMyPost && (
                      <IconButton onClick={() => requestReport('post', post.id)} title="신고">
                        <FaExclamationTriangle />
                        {user?.isAdmin && post.report_count > 0 && (
                          <span style={{ 
                            marginLeft: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            color: '#ef4444' 
                          }}>
                            {post.report_count}
                          </span>
                        )}
                      </IconButton>
                    )}
                    {isMyPost && (
                      <IconButton onClick={() => requestDeletePost(post.id)} title="삭제">
                        <FaTrash />
                      </IconButton>
                    )}
                  </PostActions>
                </PostHeader>

                <PostContent $collapsed={needsExpand && !isContentExpanded}>
                  {post.content}
                </PostContent>
                {needsExpand && (
                  <ShowMoreButton
                    onClick={() => {
                      setExpandedPostContent(prev => {
                        const newSet = new Set(prev);
                        if (isContentExpanded) {
                          newSet.delete(post.id);
                        } else {
                          newSet.add(post.id);
                        }
                        return newSet;
                      });
                    }}
                  >
                    {isContentExpanded ? (
                      <>접기 <FaChevronUp /></>
                    ) : (
                      <>더보기 <FaChevronDown /></>
                    )}
                  </ShowMoreButton>
                )}

                <PostFooter>
                  <LikeButton $liked={isLiked} onClick={() => handleToggleLike(post.id)}>
                    {isLiked ? <FaHeart /> : <FaRegHeart />}
                    <span>{post.like_count}</span>
                  </LikeButton>
                  <CommentButton onClick={() => handleToggleComments(post.id)}>
                    <FaComment />
                    <span>{post.comment_count}</span>
                  </CommentButton>
                </PostFooter>

                {isExpanded && (
                  <CommentsSection>
                    {comments[post.id]?.map(comment => {
                      if (comment.is_deleted) {
                        return (
                          <CommentItem 
                            key={comment.id} 
                            style={{ 
                              background: '#e5e7eb', 
                              textAlign: 'center', 
                              color: 'rgb(98, 109, 126)', 
                              fontStyle: 'italic', 
                              fontSize: '0.8rem'
                            }}
                          >
                            {comment.is_author_deleted 
                              ? '작성자에 의해 삭제된 댓글입니다.'
                              : comment.is_admin_deleted 
                              ? '관리자에 의해 차단된 댓글입니다.' 
                              : '신고 누적으로 삭제된 댓글입니다.'}
                          </CommentItem>
                        );
                      }

                      const isMyComment = user?.id === comment.user_id;
                      const isCommentExpanded = expandedCommentContent.has(comment.id);
                      // 3줄 초과 판단: 개행 문자가 3개 이상(4줄 이상)이거나, 글자 수가 70자 이상
                      const commentLineBreaks = (comment.content.match(/\n/g) || []).length;
                      const commentNeedsExpand = commentLineBreaks > 2 || comment.content.length > 70;

                      return (
                        <CommentItem key={comment.id}>
                          <CommentHeader>
                            <PostAuthor>
                              {comment.is_admin_post ? (
                                <AdminBadge style={{ fontSize: '0.75rem' }}>👑 관리자</AdminBadge>
                              ) : (
                                <AnonymousName $color={comment.color_code} style={{ fontSize: '0.9rem' }}>
                                  익명{comment.anonymous_number}
                                </AnonymousName>
                              )}
                              {comment.tag && <StatusTag $type={comment.tag}>{comment.tag}</StatusTag>}
                              <TimeStamp style={{ fontSize: '0.75rem' }}>{getRelativeTime(comment.created_at)}</TimeStamp>
                            </PostAuthor>
                            <PostActions>
                              {user?.isAdmin && (
                                <IconButton 
                                  onClick={() => handleAdminDelete('comment', comment.id, post.id)} 
                                  title="관리자 차단"
                                  style={{ color: '#dc2626' }}
                                >
                                  <FaBan size={12} />
                                </IconButton>
                              )}
                              {!isMyComment && (
                                <IconButton onClick={() => requestReport('comment', comment.id)} title="신고">
                                  <FaExclamationTriangle size={12} />
                                  {user?.isAdmin && comment.report_count > 0 && (
                                    <span style={{ 
                                      marginLeft: '3px', 
                                      fontSize: '0.7rem', 
                                      fontWeight: 'bold', 
                                      color: '#ef4444' 
                                    }}>
                                      {comment.report_count}
                                    </span>
                                  )}
                                </IconButton>
                              )}
                              {isMyComment && (
                                <IconButton onClick={() => requestDeleteComment(post.id, comment.id)} title="삭제">
                                  <FaTrash size={12} />
                                </IconButton>
                              )}
                            </PostActions>
                          </CommentHeader>
                          <CommentContent $collapsed={commentNeedsExpand && !isCommentExpanded}>
                            {comment.content}
                          </CommentContent>
                          {commentNeedsExpand && (
                            <ShowMoreButton
                              style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}
                              onClick={() => {
                                setExpandedCommentContent(prev => {
                                  const newSet = new Set(prev);
                                  if (isCommentExpanded) {
                                    newSet.delete(comment.id);
                                  } else {
                                    newSet.add(comment.id);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              {isCommentExpanded ? (
                                <>접기 <FaChevronUp /></>
                              ) : (
                                <>더보기 <FaChevronDown /></>
                              )}
                            </ShowMoreButton>
                          )}
                        </CommentItem>
                      );
                    })}

                    <div style={{ marginTop: '1rem' }}>
                      {user?.isAdmin && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          flexWrap: 'wrap',
                          gap: '0.5rem', 
                          marginBottom: '0.5rem',
                          fontSize: '0.85rem',
                          color: '#6b7280'
                        }}>
                          <span>댓글 작성자:</span>
                          <span 
                            style={{ 
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              background: postAsAdmin ? '#dc2626' : (adminIdentities.find(i => i.anonymousNumber === selectedAnonymousNumber)?.colorCode || '#888888'),
                              color: 'white',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                          >
                            {postAsAdmin ? '👑 관리자' : (adminIdentities.length > 0 && selectedAnonymousNumber ? `익명${selectedAnonymousNumber}` : '—')}
                          </span>
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>(상단 토글에서 변경)</span>
                        </div>
                      )}
                      <CommentInput
                        placeholder="댓글을 입력하세요... (최대 100자)"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (commentInputs[post.id]?.trim()) {
                              handleSubmitComment(post.id);
                            }
                          }
                        }}
                        maxLength={100}
                      />
                      <CommentSubmitButton
                        onClick={() => handleSubmitComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim() || (commentCooldowns[post.id] > 0 && !user?.isAdmin)}
                      >
                        {commentCooldowns[post.id] > 0 && !user?.isAdmin 
                          ? `${commentCooldowns[post.id]}초 후 작성 가능` 
                          : '댓글 작성'}
                      </CommentSubmitButton>
                    </div>
                  </CommentsSection>
                )}
              </PostCard>
            );
          })}
          {hasMore && (
            <LoadMoreButton onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? '로딩 중...' : '더 보기'}
            </LoadMoreButton>
          )}
          </>
        )}
      </PostsContainer>
    </Container>
  );
};

export default CommunityPage;

