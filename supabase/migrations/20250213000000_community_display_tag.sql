-- =============================================================================
-- 커뮤니티 게시글/댓글 관리자 익명 작성 시 표시 태그 선택
-- 관리자가 익명으로 글/댓글 작성 시 선택한 태그(매칭신청X, 매칭신청완료, 매칭성공 등)를 저장
-- =============================================================================

-- community_posts: 표시용 태그 (NULL = 기존처럼 작성자 매칭 상태로 계산)
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS display_tag TEXT;

COMMENT ON COLUMN community_posts.display_tag IS '관리자 익명 작성 시 선택한 태그. NULL이면 매칭 상태 기반으로 계산';

-- community_comments: 표시용 태그
ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS display_tag TEXT;

COMMENT ON COLUMN community_comments.display_tag IS '관리자 익명 작성 시 선택한 태그. NULL이면 매칭 상태 기반으로 계산';
