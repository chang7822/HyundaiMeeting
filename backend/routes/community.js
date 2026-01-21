const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { supabase } = require('../database');
const { sendPushToUsers, sendPushToAdmin } = require('../pushService');
const notificationRoutes = require('./notifications');

// 색상 풀 (10가지)
const COLOR_POOL = [
  '#7C3AED', '#10B981', '#EF4444', '#F59E0B', '#3B82F6',
  '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4'
];

/**
 * [관리자 전용] 모든 익명 ID 조회
 * GET /api/community/admin/identities/:periodId
 */
router.get('/admin/identities/:periodId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
    const periodId = parseInt(req.params.periodId);

    if (!isAdmin) {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    if (!periodId || isNaN(periodId)) {
      return res.status(400).json({ error: 'period_id가 필요합니다.' });
    }

    // 해당 회차에서 이 관리자의 모든 익명 ID 조회
    const { data: identities, error } = await supabase
      .from('community_user_identities')
      .select('*')
      .eq('period_id', periodId)
      .eq('user_id', userId)
      .order('anonymous_number', { ascending: true });

    if (error) {
      console.error('[community] 관리자 익명 ID 목록 조회 오류:', error);
      return res.status(500).json({ error: '익명 ID 조회 실패' });
    }

    // 각 익명 ID의 태그 정보 추가
    const identitiesWithTags = await Promise.all(
      identities.map(async (identity) => {
        const tag = await getUserMatchingTag(userId, periodId);
        return {
          anonymousNumber: identity.anonymous_number,
          colorCode: identity.color_code,
          tag
        };
      })
    );

    res.json({ identities: identitiesWithTags });
  } catch (error) {
    console.error('[community] 관리자 익명 ID 조회 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * [관리자 전용] 익명 ID 자동 생성 (마지막 번호 + 1)
 * POST /api/community/admin/identities
 * Body: { period_id }
 */
router.post('/admin/identities', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
    const { period_id } = req.body;

    if (!isAdmin) {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    if (!period_id) {
      return res.status(400).json({ error: 'period_id가 필요합니다.' });
    }

    // 해당 회차에서 가장 큰 익명 번호 찾기 (전체 사용자 기준)
    const { data: maxNumberData, error: maxError } = await supabase
      .from('community_user_identities')
      .select('anonymous_number')
      .eq('period_id', period_id)
      .order('anonymous_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError && maxError.code !== 'PGRST116') {
      console.error('[community] 최대 번호 조회 오류:', maxError);
      return res.status(500).json({ error: '익명 번호 조회 실패' });
    }

    // 다음 번호 결정
    const nextNumber = maxNumberData ? maxNumberData.anonymous_number + 1 : 1;

    if (nextNumber > 9999) {
      return res.status(400).json({ error: '익명 번호는 9999까지만 생성 가능합니다.' });
    }

    // 색상 선택 (번호 기반)
    const colorIndex = (nextNumber - 1) % COLOR_POOL.length;
    const colorCode = COLOR_POOL[colorIndex];

    // 새 익명 ID 생성
    const { data: newIdentity, error: insertError } = await supabase
      .from('community_user_identities')
      .insert({
        period_id: period_id,
        user_id: userId,
        anonymous_number: nextNumber,
        color_code: colorCode
      })
      .select()
      .single();

    if (insertError) {
      console.error('[community] 관리자 익명 ID 생성 오류:', insertError);
      return res.status(500).json({ error: '익명 ID 생성 실패' });
    }

    const tag = await getUserMatchingTag(userId, period_id);

    res.json({
      anonymousNumber: newIdentity.anonymous_number,
      colorCode: newIdentity.color_code,
      tag,
      message: `익명${nextNumber}이(가) 생성되었습니다.`
    });
  } catch (error) {
    console.error('[community] 관리자 익명 ID 생성 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * [관리자 전용] 익명 ID 일괄 생성 (N개)
 * POST /api/community/admin/identities/bulk
 * Body: { period_id, count }
 */
router.post('/admin/identities/bulk', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
    const { period_id, count } = req.body;

    if (!isAdmin) {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    if (!period_id) {
      return res.status(400).json({ error: 'period_id가 필요합니다.' });
    }

    const createCount = parseInt(count, 10);
    if (!createCount || createCount < 1 || createCount > 100) {
      return res.status(400).json({ error: '생성 개수는 1개 이상 100개 이하여야 합니다.' });
    }

    // 해당 회차에서 가장 큰 익명 번호 찾기 (전체 사용자 기준)
    const { data: maxNumberData, error: maxError } = await supabase
      .from('community_user_identities')
      .select('anonymous_number')
      .eq('period_id', period_id)
      .order('anonymous_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError && maxError.code !== 'PGRST116') {
      console.error('[community] 최대 번호 조회 오류:', maxError);
      return res.status(500).json({ error: '익명 번호 조회 실패' });
    }

    // 시작 번호 결정
    const startNumber = maxNumberData ? maxNumberData.anonymous_number + 1 : 1;

    if (startNumber + createCount - 1 > 9999) {
      return res.status(400).json({ error: '익명 번호는 9999까지만 생성 가능합니다.' });
    }

    // 일괄 생성할 데이터 준비
    const identitiesToInsert = [];
    for (let i = 0; i < createCount; i++) {
      const anonymousNumber = startNumber + i;
      const colorIndex = (anonymousNumber - 1) % COLOR_POOL.length;
      const colorCode = COLOR_POOL[colorIndex];

      identitiesToInsert.push({
        period_id: period_id,
        user_id: userId,
        anonymous_number: anonymousNumber,
        color_code: colorCode
      });
    }

    // 일괄 insert
    const { data: newIdentities, error: insertError } = await supabase
      .from('community_user_identities')
      .insert(identitiesToInsert)
      .select();

    if (insertError) {
      console.error('[community] 관리자 익명 ID 일괄 생성 오류:', insertError);
      return res.status(500).json({ error: '익명 ID 일괄 생성 실패' });
    }

    const tag = await getUserMatchingTag(userId, period_id);

    res.json({
      identities: newIdentities.map(identity => ({
        anonymousNumber: identity.anonymous_number,
        colorCode: identity.color_code,
        tag
      })),
      message: `익명${startNumber}부터 ${startNumber + createCount - 1}까지 총 ${createCount}개의 익명 ID가 생성되었습니다.`
    });
  } catch (error) {
    console.error('[community] 관리자 익명 ID 일괄 생성 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 내 익명 ID 조회 (없으면 자동 생성)
 * GET /api/community/my-identity/:periodId
 * 여러 개가 있으면 가장 작은 번호(첫 번째) 반환
 */
router.get('/my-identity/:periodId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const periodId = parseInt(req.params.periodId);

    if (!periodId || isNaN(periodId)) {
      return res.status(400).json({ error: 'period_id가 필요합니다.' });
    }

    // 1. 이미 생성된 익명 ID가 있는지 확인 (여러 개면 가장 작은 번호)
    const { data: existingList, error: existingError } = await supabase
      .from('community_user_identities')
      .select('*')
      .eq('period_id', periodId)
      .eq('user_id', userId)
      .order('anonymous_number', { ascending: true })
      .limit(1);

    if (existingError) {
      console.error('[community] 익명 ID 조회 오류:', existingError);
      return res.status(500).json({ error: '익명 ID 조회 실패' });
    }

    let identity;

    if (existingList && existingList.length > 0) {
      identity = existingList[0];
    } else {
      // 2. 익명 ID 생성
      // 해당 회차에서 가장 큰 anonymous_number 찾기
      const { data: maxNumberData, error: maxError } = await supabase
        .from('community_user_identities')
        .select('anonymous_number')
        .eq('period_id', periodId)
        .order('anonymous_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError && maxError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('[community] 최대 번호 조회 오류:', maxError);
        return res.status(500).json({ error: '익명 번호 생성 실패' });
      }

      const nextNumber = maxNumberData ? maxNumberData.anonymous_number + 1 : 1;
      const colorIndex = (nextNumber - 1) % COLOR_POOL.length;
      const colorCode = COLOR_POOL[colorIndex];

      // 3. DB에 저장
      const { data: newIdentity, error: insertError } = await supabase
        .from('community_user_identities')
        .insert({
          period_id: periodId,
          user_id: userId,
          anonymous_number: nextNumber,
          color_code: colorCode
        })
        .select()
        .single();

      if (insertError) {
        console.error('[community] 익명 ID 생성 오류:', insertError);
        return res.status(500).json({ error: '익명 ID 생성 실패' });
      }

      identity = newIdentity;
    }

    // 4. 매칭 상태에 따른 태그 결정
    const tag = await getUserMatchingTag(userId, periodId);

    res.json({
      anonymousNumber: identity.anonymous_number,
      colorCode: identity.color_code,
      tag
    });
  } catch (error) {
    console.error('[community] 내 익명 ID 조회 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 매칭 상태에 따른 태그 결정
 * - 진행중 (신청 기간): "매칭신청X" 또는 "매칭신청완료"
 * - 발표완료 (매칭 진행 중): "매칭성공" (성공한 사람만)
 * - 종료: 태그 없음 (null)
 */
async function getUserMatchingTag(userId, periodId) {
  try {
    // 회차 정보 조회
    const { data: period, error: periodError } = await supabase
      .from('matching_log')
      .select('*')
      .eq('id', periodId)
      .single();

    if (periodError || !period) {
      return null;
    }

    const status = period.status;

    // 종료된 매칭은 태그 없음
    if (status === '종료') {
      return null;
    }

    // 매칭 신청서 조회
    const { data: application, error: appError } = await supabase
      .from('matching_applications')
      .select('applied, cancelled, matched')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .maybeSingle();

    if (appError && appError.code !== 'PGRST116') {
      console.error('[community] 매칭 신청 조회 오류:', appError);
      return null;
    }

    const isApplied = application && application.applied && !application.cancelled;

    // 진행중 (매칭 신청 기간)
    if (status === '진행중') {
      return isApplied ? '매칭신청완료' : '매칭신청X';
    }

    // 발표완료 (매칭 진행 중)
    if (status === '발표완료') {
      // 매칭 성공한 사람만 태그 표시
      if (application && application.matched === true) {
        return '매칭성공';
      }
      // 나머지는 태그 없음
      return null;
    }

    // 기타 상태 (준비중 등)
    return null;
  } catch (error) {
    console.error('[community] 태그 결정 오류:', error);
    return null;
  }
}

/**
 * 게시글 목록 조회
 * GET /api/community/posts/:periodId
 * Query params: 
 *   - limit (기본 20)
 *   - offset (기본 0)
 *   - sortBy ('latest' | 'popular', 기본 'latest')
 *   - filter ('all' | 'mine', 기본 'all')
 */
router.get('/posts/:periodId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const periodId = parseInt(req.params.periodId);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const sortBy = req.query.sortBy || 'latest';
    const filter = req.query.filter || 'all';

    if (!periodId || isNaN(periodId)) {
      return res.status(400).json({ error: 'period_id가 필요합니다.' });
    }

    let allPosts = [];

    if (filter === 'mine') {
      // 내가 쓴 글: 내가 작성한 게시글 + 내가 댓글 작성한 게시글
      
      // 1. 내가 댓글을 작성한 게시글 ID 목록 조회
      const { data: myCommentPostIds } = await supabase
        .from('community_comments')
        .select('post_id')
        .eq('user_id', userId);
      
      const commentedPostIds = myCommentPostIds 
        ? [...new Set(myCommentPostIds.map(c => c.post_id))] 
        : [];

      // 2. 내가 작성한 게시글 OR 내가 댓글 작성한 게시글 조회
      if (commentedPostIds.length > 0) {
        const { data: posts, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('period_id', periodId)
          .or(`user_id.eq.${userId},id.in.(${commentedPostIds.join(',')})`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[community] 게시글 목록 조회 오류:', error);
          return res.status(500).json({ error: '게시글 목록 조회 실패' });
        }
        allPosts = posts || [];
      } else {
        // 댓글 작성한 글이 없으면 내가 작성한 글만
        const { data: posts, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('period_id', periodId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[community] 게시글 목록 조회 오류:', error);
          return res.status(500).json({ error: '게시글 목록 조회 실패' });
        }
        allPosts = posts || [];
      }
    } else {
      // 전체 게시글 조회
      const { data: posts, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('period_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[community] 게시글 목록 조회 오류:', error);
        return res.status(500).json({ error: '게시글 목록 조회 실패' });
      }
      allPosts = posts || [];
    }

    // JavaScript로 정렬 (sortBy에 따라)
    let sortedPosts = [...allPosts];
    if (sortBy === 'popular') {
      sortedPosts.sort((a, b) => {
        // 1. 삭제 상태가 다르면 삭제되지 않은 글이 먼저
        if (a.is_deleted !== b.is_deleted) {
          return a.is_deleted ? 1 : -1;
        }
        
        // 2. 좋아요 수로 정렬
        if (b.like_count !== a.like_count) {
          return b.like_count - a.like_count;
        }
        
        // 3. 좋아요가 같으면 최신순
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    // 'latest'는 이미 created_at DESC로 정렬됨

    // 페이지네이션 적용
    const paginatedPosts = sortedPosts.slice(offset, offset + limit);
    const totalCount = sortedPosts.length;
    const hasMore = offset + limit < totalCount;

    // 배치 쿼리로 성능 최적화
    // 1. 회차 정보 한 번만 조회
    const { data: period } = await supabase
      .from('matching_log')
      .select('status')
      .eq('id', periodId)
      .single();

    const periodStatus = period?.status || null;
    const shouldShowTags = periodStatus && periodStatus !== '종료';

    // 2. 모든 게시글의 user_id와 anonymous_number 수집
    const userIds = [...new Set(paginatedPosts.map(p => p.user_id))];
    const identityKeys = paginatedPosts.map(p => ({
      user_id: p.user_id,
      anonymous_number: p.anonymous_number
    }));

    // 3. 배치로 익명 ID 정보 조회 (모든 관련 identity를 한 번에 조회 후 메모리에서 필터링)
    const identityMap = new Map();
    if (userIds.length > 0) {
      // 해당 회차의 모든 관련 identity 조회
      const { data: allIdentities } = await supabase
        .from('community_user_identities')
        .select('user_id, anonymous_number, color_code')
        .eq('period_id', periodId)
        .in('user_id', userIds);

      if (allIdentities) {
        // 메모리에서 매핑
        allIdentities.forEach(identity => {
          const key = `${identity.user_id}_${identity.anonymous_number}`;
          identityMap.set(key, identity.color_code);
        });
      }
    }

    // 4. 배치로 매칭 신청 정보 조회 (태그가 필요한 경우만)
    const applicationMap = new Map();
    if (shouldShowTags && userIds.length > 0) {
      const { data: applications } = await supabase
        .from('matching_applications')
        .select('user_id, applied, cancelled, matched')
        .eq('period_id', periodId)
        .in('user_id', userIds);

      if (applications) {
        applications.forEach(app => {
          applicationMap.set(app.user_id, app);
        });
      }
    }

    // 5. 메모리에서 매핑하여 결과 생성
    const postsWithIdentity = paginatedPosts.map(post => {
      const identityKey = `${post.user_id}_${post.anonymous_number}`;
      const colorCode = identityMap.get(identityKey) || '#888888';

      // 태그 결정 (메모리에서)
      let tag = null;
      if (shouldShowTags) {
        const application = applicationMap.get(post.user_id);
        const isApplied = application && application.applied && !application.cancelled;

        if (periodStatus === '진행중') {
          tag = isApplied ? '매칭신청완료' : '매칭신청X';
        } else if (periodStatus === '발표완료') {
          if (application && application.matched === true) {
            tag = '매칭성공';
          }
        }
      }

      return {
        ...post,
        color_code: colorCode,
        tag
      };
    });

    res.json({ 
      posts: postsWithIdentity,
      hasMore,
      totalCount
    });
  } catch (error) {
    console.error('[community] 게시글 목록 조회 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 게시글 작성
 * POST /api/community/posts
 * Body: { period_id, content, preferred_anonymous_number? (관리자 전용) }
 */
router.post('/posts', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
    const { period_id, content, preferred_anonymous_number } = req.body;

    if (!period_id || !content) {
      return res.status(400).json({ error: 'period_id와 content가 필요합니다.' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '게시글은 500자 이내로 작성해주세요.' });
    }

    // 관리자가 아닌 경우 도배 방지 체크
    if (!isAdmin) {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      // 1. 최근 게시글 조회 (쿨다운 + 중복 체크용)
      const { data: recentPost } = await supabase
        .from('community_posts')
        .select('created_at, content')
        .eq('user_id', userId)
        .eq('period_id', period_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentPost) {
        // 30초 쿨다운 체크
        const lastPostTime = new Date(recentPost.created_at);
        if (lastPostTime > thirtySecondsAgo) {
          const remainingSeconds = Math.ceil((lastPostTime.getTime() + 30000 - now.getTime()) / 1000);
          return res.status(429).json({ 
            error: `게시글은 30초에 한 번만 작성할 수 있습니다.`,
            cooldown: remainingSeconds
          });
        }

        // 직전 게시글과 100% 동일 내용 체크
        if (recentPost.content.trim() === content.trim()) {
          return res.status(400).json({ error: '직전 게시글과 동일한 내용은 작성할 수 없습니다.' });
        }
      }

      // 2. 1시간 내 작성 횟수 체크
      const { data: recentPosts, error: countError } = await supabase
        .from('community_posts')
        .select('id')
        .eq('user_id', userId)
        .eq('period_id', period_id)
        .gte('created_at', oneHourAgo.toISOString());

      if (countError) {
        console.error('[community] 작성 횟수 조회 오류:', countError);
      } else if (recentPosts && recentPosts.length >= 5) {
        return res.status(429).json({ 
          error: '1시간에 최대 5개의 게시글만 작성할 수 있습니다. 잠시 후 다시 시도해주세요.'
        });
      }
    }

    let anonymousNumber, colorCode;

    // 관리자가 특정 익명 번호를 지정한 경우
    if (isAdmin && preferred_anonymous_number) {
      // 해당 번호의 익명 ID가 이미 있는지 확인
      const { data: preferredIdentity } = await supabase
        .from('community_user_identities')
        .select('*')
        .eq('period_id', period_id)
        .eq('user_id', userId)
        .eq('anonymous_number', preferred_anonymous_number)
        .maybeSingle();

      if (preferredIdentity) {
        // 이미 존재하는 익명 ID 사용
        anonymousNumber = preferredIdentity.anonymous_number;
        colorCode = preferredIdentity.color_code;
      } else {
        // 새로 생성
        const colorIndex = (preferred_anonymous_number - 1) % COLOR_POOL.length;
        colorCode = COLOR_POOL[colorIndex];
        anonymousNumber = preferred_anonymous_number;

        await supabase
          .from('community_user_identities')
          .insert({
            period_id: period_id,
            user_id: userId,
            anonymous_number: anonymousNumber,
            color_code: colorCode
          });
      }
    } else {
      // 일반 사용자 또는 관리자가 번호 지정 안 한 경우: 기존 로직
      const { data: identity, error: identityError } = await supabase
        .from('community_user_identities')
        .select('*')
        .eq('period_id', period_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (identityError) {
        console.error('[community] 익명 ID 조회 오류:', identityError);
        return res.status(500).json({ error: '익명 ID 조회 실패' });
      }

      if (identity) {
        anonymousNumber = identity.anonymous_number;
        colorCode = identity.color_code;
      } else {
        // 익명 ID 자동 생성
        const { data: maxNumberData } = await supabase
          .from('community_user_identities')
          .select('anonymous_number')
          .eq('period_id', period_id)
          .order('anonymous_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextNumber = maxNumberData ? maxNumberData.anonymous_number + 1 : 1;
        const colorIndex = (nextNumber - 1) % COLOR_POOL.length;
        
        anonymousNumber = nextNumber;
        colorCode = COLOR_POOL[colorIndex];

        await supabase
          .from('community_user_identities')
          .insert({
            period_id: period_id,
            user_id: userId,
            anonymous_number: anonymousNumber,
            color_code: colorCode
          });
      }
    }

    // 게시글 생성
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .insert({
        period_id: period_id,
        user_id: userId,
        anonymous_number: anonymousNumber,
        content: content
      })
      .select()
      .single();

    if (postError) {
      console.error('[community] 게시글 생성 오류:', postError);
      return res.status(500).json({ error: '게시글 생성 실패' });
    }

    // 작성자 정보 조회 및 콘솔 로그
    try {
      const { data: authorProfile } = await supabase
        .from('user_profiles')
        .select('nickname')
        .eq('user_id', userId)
        .maybeSingle();
      
      const authorNickname = authorProfile?.nickname || '알 수 없음';
      console.log(`[커뮤니티 게시글] ${authorNickname}(익명${anonymousNumber}) : ${content}`);
    } catch (logError) {
      console.error('[community] 작성자 정보 조회 오류:', logError);
    }

    // 관리자가 아닌 경우에만 관리자에게 알림 전송
    if (!isAdmin) {
      try {
        // 인앱 알림 메시지 생성 (관리자 이메일 기준)
        const adminEmail = 'hhggom@hyundai.com';
        const { data: adminUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', adminEmail)
          .maybeSingle();

        if (adminUser?.id) {
          await notificationRoutes.createNotification(adminUser.id, {
            type: 'community_post',
            title: '📝 커뮤니티 신규 게시글',
            body: '커뮤니티에 새로운 게시글이 작성되었습니다.',
            linkUrl: `/community?postId=${post.id}&openComments=true`,
            meta: { post_id: post.id, period_id }
          });
        }

        // 푸시 알림 전송
        await sendPushToAdmin(
          '📝 커뮤니티 신규 게시글',
          '커뮤니티에 새로운 게시글이 작성되었습니다.',
          {
            linkUrl: `/community?postId=${post.id}&openComments=true`,
            postId: String(post.id),
            type: 'community_post'
          }
        );

        console.log(`[community] 신규 게시글 알림 전송 완료: post_id=${post.id}`);
      } catch (notifError) {
        console.error('[community] 신규 게시글 알림 전송 실패:', notifError);
        // 알림 실패해도 게시글 작성은 정상 처리
      }
    }

    const tag = await getUserMatchingTag(userId, period_id);

    res.json({
      post: {
        ...post,
        color_code: colorCode,
        tag
      }
    });
  } catch (error) {
    console.error('[community] 게시글 작성 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * [관리자 전용] 게시글 강제 삭제
 * POST /api/community/admin/delete-post/:postId
 */
router.post('/admin/delete-post/:postId', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin;
    const postId = parseInt(req.params.postId);

    if (!isAdmin) {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'post_id가 필요합니다.' });
    }

    // 게시글 정보 조회 (알림 전송용)
    const { data: postDetail } = await supabase
      .from('community_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    // 게시글 soft delete (is_deleted=true, is_admin_deleted=true)
    const { error } = await supabase
      .from('community_posts')
      .update({ 
        is_deleted: true,
        is_admin_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (error) {
      console.error('[community] 관리자 게시글 삭제 오류:', error);
      return res.status(500).json({ error: '게시글 삭제 실패' });
    }

    // 작성자에게 알림 전송
    if (postDetail?.user_id) {
      try {
        // 인앱 알림 메시지 생성
        await notificationRoutes.createNotification(postDetail.user_id, {
          type: 'community_delete',
          title: '⚠️ 게시글이 삭제되었습니다',
          body: '관리자에 의해 회원님의 게시글이 삭제되었습니다.',
          linkUrl: '/community',
          meta: { target_type: 'post', target_id: postId, reason: 'admin_deleted' }
        });

        // 푸시 알림 전송
        await sendPushToUsers([postDetail.user_id], {
          type: 'community_delete',
          title: '⚠️ 게시글 삭제',
          body: '관리자에 의해 회원님의 게시글이 삭제되었습니다.'
        });

        console.log(`[community] 관리자 삭제 알림 전송 완료: user_id=${postDetail.user_id}, post_id=${postId}`);
      } catch (notifError) {
        console.error('[community] 관리자 삭제 알림 전송 실패:', notifError);
      }
    }

    console.log(`[community] 관리자가 게시글 ${postId} 삭제`);
    res.json({ success: true, message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('[community] 관리자 게시글 삭제 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * [관리자 전용] 댓글 강제 삭제
 * POST /api/community/admin/delete-comment/:commentId
 */
router.post('/admin/delete-comment/:commentId', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin;
    const commentId = parseInt(req.params.commentId);

    if (!isAdmin) {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ error: 'comment_id가 필요합니다.' });
    }

    // 댓글 정보 조회 (게시글 comment_count 감소 및 알림 전송용)
    const { data: comment, error: commentError } = await supabase
      .from('community_comments')
      .select('post_id, user_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    // 댓글 soft delete (is_deleted=true, is_admin_deleted=true)
    const { error: deleteError } = await supabase
      .from('community_comments')
      .update({ 
        is_deleted: true,
        is_admin_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (deleteError) {
      console.error('[community] 관리자 댓글 삭제 오류:', deleteError);
      return res.status(500).json({ error: '댓글 삭제 실패' });
    }

    // 게시글의 comment_count 감소
    const { data: postData } = await supabase
      .from('community_posts')
      .select('comment_count')
      .eq('id', comment.post_id)
      .single();

    await supabase
      .from('community_posts')
      .update({
        comment_count: Math.max((postData?.comment_count || 0) - 1, 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', comment.post_id);

    // 작성자에게 알림 전송
    if (comment?.user_id) {
      try {
        // 인앱 알림 메시지 생성
        await notificationRoutes.createNotification(comment.user_id, {
          type: 'community_delete',
          title: '⚠️ 댓글이 삭제되었습니다',
          body: '관리자에 의해 회원님의 댓글이 삭제되었습니다.',
          linkUrl: '/community',
          meta: { target_type: 'comment', target_id: commentId, reason: 'admin_deleted' }
        });

        // 푸시 알림 전송
        await sendPushToUsers([comment.user_id], {
          type: 'community_delete',
          title: '⚠️ 댓글 삭제',
          body: '관리자에 의해 회원님의 댓글이 삭제되었습니다.'
        });

        console.log(`[community] 관리자 삭제 알림 전송 완료: user_id=${comment.user_id}, comment_id=${commentId}`);
      } catch (notifError) {
        console.error('[community] 관리자 삭제 알림 전송 실패:', notifError);
      }
    }

    console.log(`[community] 관리자가 댓글 ${commentId} 삭제`);
    res.json({ success: true, message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('[community] 관리자 댓글 삭제 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 게시글 삭제 (본인 게시글만)
 * DELETE /api/community/posts/:postId
 */
router.delete('/posts/:postId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = parseInt(req.params.postId);

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'post_id가 필요합니다.' });
    }

    // 게시글 조회 (본인 확인)
    const { data: post, error: fetchError } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({ error: '본인의 게시글만 삭제할 수 있습니다.' });
    }

    // 실제 삭제 (soft delete - 작성자 삭제)
    const { error: deleteError } = await supabase
      .from('community_posts')
      .update({ 
        is_deleted: true, 
        is_author_deleted: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', postId);

    if (deleteError) {
      console.error('[community] 게시글 삭제 오류:', deleteError);
      return res.status(500).json({ error: '게시글 삭제 실패' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[community] 게시글 삭제 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 특정 게시글의 댓글 목록 조회
 * GET /api/community/posts/:postId/comments
 */
router.get('/posts/:postId/comments', authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'post_id가 필요합니다.' });
    }

    // 게시글 정보 조회 (period_id 확인용)
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('period_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 모든 댓글 조회 (삭제된 것도 포함, 프론트엔드에서 "신고 누적으로 삭제된 댓글입니다" 표시)
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[community] 댓글 목록 조회 오류:', error);
      return res.status(500).json({ error: '댓글 목록 조회 실패' });
    }

    // 배치 쿼리로 성능 최적화
    // 1. 회차 정보 한 번만 조회
    const { data: period } = await supabase
      .from('matching_log')
      .select('status')
      .eq('id', post.period_id)
      .single();

    const periodStatus = period?.status || null;
    const shouldShowTags = periodStatus && periodStatus !== '종료';

    // 2. 모든 댓글의 user_id 수집
    const commentUserIds = [...new Set(comments.map(c => c.user_id))];

    // 3. 배치로 익명 ID 정보 조회
    const identityMap = new Map();
    if (commentUserIds.length > 0) {
      const { data: allIdentities } = await supabase
        .from('community_user_identities')
        .select('user_id, anonymous_number, color_code')
        .eq('period_id', post.period_id)
        .in('user_id', commentUserIds);

      if (allIdentities) {
        allIdentities.forEach(identity => {
          const key = `${identity.user_id}_${identity.anonymous_number}`;
          identityMap.set(key, identity.color_code);
        });
      }
    }

    // 4. 배치로 매칭 신청 정보 조회 (태그가 필요한 경우만)
    const applicationMap = new Map();
    if (shouldShowTags && commentUserIds.length > 0) {
      const { data: applications } = await supabase
        .from('matching_applications')
        .select('user_id, applied, cancelled, matched')
        .eq('period_id', post.period_id)
        .in('user_id', commentUserIds);

      if (applications) {
        applications.forEach(app => {
          applicationMap.set(app.user_id, app);
        });
      }
    }

    // 5. 메모리에서 매핑하여 결과 생성
    const commentsWithIdentity = comments.map(comment => {
      const identityKey = `${comment.user_id}_${comment.anonymous_number}`;
      const colorCode = identityMap.get(identityKey) || '#888888';

      // 태그 결정 (메모리에서)
      let tag = null;
      if (shouldShowTags) {
        const application = applicationMap.get(comment.user_id);
        const isApplied = application && application.applied && !application.cancelled;

        if (periodStatus === '진행중') {
          tag = isApplied ? '매칭신청완료' : '매칭신청X';
        } else if (periodStatus === '발표완료') {
          if (application && application.matched === true) {
            tag = '매칭성공';
          }
        }
      }

      return {
        ...comment,
        color_code: colorCode,
        tag
      };
    });

    res.json({ comments: commentsWithIdentity });
  } catch (error) {
    console.error('[community] 댓글 목록 조회 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 댓글 작성
 * POST /api/community/comments
 * Body: { post_id, content, preferred_anonymous_number? (관리자 전용) }
 */
router.post('/comments', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
    const { post_id, content, preferred_anonymous_number } = req.body;

    if (!post_id || !content) {
      return res.status(400).json({ error: 'post_id와 content가 필요합니다.' });
    }

    if (content.length > 100) {
      return res.status(400).json({ error: '댓글은 100자 이내로 작성해주세요.' });
    }

    // 게시글 정보 조회
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('period_id, is_deleted, user_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 게시글이 삭제된 경우
    if (post.is_deleted) {
      return res.status(410).json({ error: '삭제된 게시글입니다.', code: 'POST_DELETED' });
    }

    // 관리자가 아닌 경우 도배 방지 체크
    if (!isAdmin) {
      const now = new Date();
      const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);

      // 1. 최근 댓글 조회 (쿨다운 + 중복 체크용)
      const { data: recentComment } = await supabase
        .from('community_comments')
        .select('created_at, content')
        .eq('user_id', userId)
        .eq('post_id', post_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentComment) {
        // 10초 쿨다운 체크
        const lastCommentTime = new Date(recentComment.created_at);
        if (lastCommentTime > tenSecondsAgo) {
          const remainingSeconds = Math.ceil((lastCommentTime.getTime() + 10000 - now.getTime()) / 1000);
          return res.status(429).json({ 
            error: `댓글은 10초에 한 번만 작성할 수 있습니다.`,
            cooldown: remainingSeconds
          });
        }

        // 직전 댓글과 100% 동일 내용 체크
        if (recentComment.content.trim() === content.trim()) {
          return res.status(400).json({ error: '직전 댓글과 동일한 내용은 작성할 수 없습니다.' });
        }
      }
    }

    let anonymousNumber, colorCode;

    // 관리자가 특정 익명 번호를 지정한 경우
    if (isAdmin && preferred_anonymous_number) {
      // 해당 번호의 익명 ID가 이미 있는지 확인
      const { data: preferredIdentity } = await supabase
        .from('community_user_identities')
        .select('*')
        .eq('period_id', post.period_id)
        .eq('user_id', userId)
        .eq('anonymous_number', preferred_anonymous_number)
        .maybeSingle();

      if (preferredIdentity) {
        // 이미 존재하는 익명 ID 사용
        anonymousNumber = preferredIdentity.anonymous_number;
        colorCode = preferredIdentity.color_code;
      } else {
        // 새로 생성
        const colorIndex = (preferred_anonymous_number - 1) % COLOR_POOL.length;
        colorCode = COLOR_POOL[colorIndex];
        anonymousNumber = preferred_anonymous_number;

        await supabase
          .from('community_user_identities')
          .insert({
            period_id: post.period_id,
            user_id: userId,
            anonymous_number: anonymousNumber,
            color_code: colorCode
          });
      }
    } else {
      // 일반 사용자 또는 관리자가 번호 지정 안 한 경우: 기존 로직
      const { data: identity, error: identityError } = await supabase
        .from('community_user_identities')
        .select('*')
        .eq('period_id', post.period_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (identityError) {
        console.error('[community] 익명 ID 조회 오류:', identityError);
        return res.status(500).json({ error: '익명 ID 조회 실패' });
      }

      if (identity) {
        anonymousNumber = identity.anonymous_number;
        colorCode = identity.color_code;
      } else {
        // 익명 ID 자동 생성
        const { data: maxNumberData } = await supabase
          .from('community_user_identities')
          .select('anonymous_number')
          .eq('period_id', post.period_id)
          .order('anonymous_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextNumber = maxNumberData ? maxNumberData.anonymous_number + 1 : 1;
        const colorIndex = (nextNumber - 1) % COLOR_POOL.length;
        
        anonymousNumber = nextNumber;
        colorCode = COLOR_POOL[colorIndex];

        await supabase
          .from('community_user_identities')
          .insert({
            period_id: post.period_id,
            user_id: userId,
            anonymous_number: anonymousNumber,
            color_code: colorCode
          });
      }
    }

    // 댓글 생성
    const { data: comment, error: commentError } = await supabase
      .from('community_comments')
      .insert({
        post_id: post_id,
        user_id: userId,
        anonymous_number: anonymousNumber,
        content: content
      })
      .select()
      .single();

    if (commentError) {
      console.error('[community] 댓글 생성 오류:', commentError);
      return res.status(500).json({ error: '댓글 생성 실패' });
    }

    // 작성자 정보 조회 및 콘솔 로그
    try {
      const { data: authorProfile } = await supabase
        .from('user_profiles')
        .select('nickname')
        .eq('user_id', userId)
        .maybeSingle();
      
      const authorNickname = authorProfile?.nickname || '알 수 없음';
      console.log(`[커뮤니티 댓글] ${authorNickname}(익명${anonymousNumber}) : ${content}`);
    } catch (logError) {
      console.error('[community] 작성자 정보 조회 오류:', logError);
    }

    // 게시글의 comment_count 증가
    const { data: postData } = await supabase
      .from('community_posts')
      .select('comment_count')
      .eq('id', post_id)
      .single();
    
    await supabase
      .from('community_posts')
      .update({
        comment_count: (postData?.comment_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', post_id);

    const tag = await getUserMatchingTag(userId, post.period_id);

    // 알림을 받을 사용자 목록 수집
    const notificationUserIds = new Set();

    // 1. 게시글 작성자에게 알림 (본인이 아닌 경우)
    if (post.user_id && post.user_id !== userId) {
      notificationUserIds.add(post.user_id);
    }

    // 2. 해당 게시글에 댓글을 단 다른 사용자들에게도 알림
    try {
      const { data: previousComments } = await supabase
        .from('community_comments')
        .select('user_id')
        .eq('post_id', post_id)
        .neq('user_id', userId); // 현재 댓글 작성자 제외

      if (previousComments && previousComments.length > 0) {
        previousComments.forEach(comment => {
          // 게시글 작성자도 제외 (이미 위에서 추가됨)
          if (comment.user_id && comment.user_id !== post.user_id) {
            notificationUserIds.add(comment.user_id);
          }
        });
      }
    } catch (commentQueryError) {
      console.error('[community] 이전 댓글 조회 오류:', commentQueryError);
      // 조회 실패해도 게시글 작성자에게는 알림 전송
    }

    // 알림 전송
    if (notificationUserIds.size > 0) {
      const userIdsArray = Array.from(notificationUserIds);
      try {
        // 인앱 알림 메시지 생성 (각 사용자별)
        await Promise.all(
          userIdsArray.map(async (targetUserId) => {
            try {
              await notificationRoutes.createNotification(targetUserId, {
                type: 'community_comment',
                title: '💬 새 댓글이 달렸습니다',
                body: targetUserId === post.user_id 
                  ? `회원님의 게시글에 새 댓글이 달렸습니다.`
                  : `회원님이 댓글을 단 게시글에 새 댓글이 달렸습니다.`,
                linkUrl: `/community?postId=${post_id}&openComments=true`,
                meta: { post_id: post_id, comment_id: comment.id }
              });
            } catch (notifErr) {
              console.error(`[community] 인앱 알림 생성 실패 (user_id: ${targetUserId}):`, notifErr);
            }
          })
        );

        // 푸시 알림 전송 (일괄)
        await sendPushToUsers(userIdsArray, {
          type: 'community_comment',
          title: '💬 새 댓글',
          body: '게시글에 새 댓글이 달렸습니다.',
          linkUrl: `/community?postId=${post_id}&openComments=true`,
          postId: String(post_id)
        });

        console.log(`[community] 댓글 알림 전송 완료: post_id=${post_id}, 대상 ${userIdsArray.length}명`);
      } catch (notifError) {
        const errorMessage = notifError?.message || String(notifError);
        const errorCode = notifError?.code || notifError?.responseCode || null;
        const errorDetails = notifError?.error || notifError?.response || null;
        console.error('[community] 댓글 알림 전송 실패:', {
          message: errorMessage,
          code: errorCode,
          details: errorDetails,
          post_id: post_id,
          user_ids: userIdsArray
        });
        // 알림 실패해도 댓글 작성은 정상 처리
      }
    }

    res.json({
      comment: {
        ...comment,
        color_code: colorCode,
        tag
      }
    });
  } catch (error) {
    console.error('[community] 댓글 작성 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 댓글 삭제 (본인 댓글만)
 * DELETE /api/community/comments/:commentId
 */
router.delete('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const commentId = parseInt(req.params.commentId);

    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ error: 'comment_id가 필요합니다.' });
    }

    // 댓글 조회 (본인 확인)
    const { data: comment, error: fetchError } = await supabase
      .from('community_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ error: '본인의 댓글만 삭제할 수 있습니다.' });
    }

    // 실제 삭제 (soft delete - 작성자 삭제)
    const { error: deleteError } = await supabase
      .from('community_comments')
      .update({ 
        is_deleted: true, 
        is_author_deleted: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', commentId);

    if (deleteError) {
      console.error('[community] 댓글 삭제 오류:', deleteError);
      return res.status(500).json({ error: '댓글 삭제 실패' });
    }

    // 게시글의 comment_count 감소
    const { data: postData } = await supabase
      .from('community_posts')
      .select('comment_count')
      .eq('id', comment.post_id)
      .single();
    
    await supabase
      .from('community_posts')
      .update({
        comment_count: Math.max((postData?.comment_count || 0) - 1, 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', comment.post_id);

    res.json({ success: true });
  } catch (error) {
    console.error('[community] 댓글 삭제 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 좋아요 토글
 * POST /api/community/posts/:postId/like
 * Body: { anonymous_number? } (선택, 없으면 첫 번째 익명 ID 사용)
 */
router.post('/posts/:postId/like', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = parseInt(req.params.postId);
    let { anonymous_number } = req.body;

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'post_id가 필요합니다.' });
    }

    // 게시글 정보 조회 (period_id 확인용)
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('period_id, is_deleted')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 게시글이 삭제된 경우
    if (post.is_deleted) {
      return res.status(410).json({ error: '삭제된 게시글입니다.', code: 'POST_DELETED' });
    }

    // anonymous_number가 없으면 첫 번째 익명 ID 사용
    if (!anonymous_number) {
      const { data: identityList } = await supabase
        .from('community_user_identities')
        .select('anonymous_number')
        .eq('period_id', post.period_id)
        .eq('user_id', userId)
        .order('anonymous_number', { ascending: true })
        .limit(1);
      
      if (identityList && identityList.length > 0) {
        anonymous_number = identityList[0].anonymous_number;
      } else {
        return res.status(400).json({ error: '익명 ID가 없습니다.' });
      }
    }

    // 이미 좋아요 했는지 확인 (익명 번호 포함)
    const { data: existingLike, error: likeError } = await supabase
      .from('community_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('anonymous_number', anonymous_number)
      .maybeSingle();

    if (likeError) {
      console.error('[community] 좋아요 확인 오류:', likeError);
      return res.status(500).json({ error: '좋아요 확인 실패' });
    }

    if (existingLike) {
      // 좋아요 취소
      const { error: deleteError } = await supabase
        .from('community_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('[community] 좋아요 취소 오류:', deleteError);
        return res.status(500).json({ error: '좋아요 취소 실패' });
      }

      // 게시글의 like_count 감소
      const { data: postData } = await supabase
        .from('community_posts')
        .select('like_count')
        .eq('id', postId)
        .single();
      
      await supabase
        .from('community_posts')
        .update({
          like_count: Math.max((postData?.like_count || 0) - 1, 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      res.json({ liked: false });
    } else {
      // 좋아요 추가
      const { error: insertError } = await supabase
        .from('community_likes')
        .insert({
          post_id: postId,
          user_id: userId,
          anonymous_number: anonymous_number
        });

      if (insertError) {
        console.error('[community] 좋아요 추가 오류:', insertError);
        return res.status(500).json({ error: '좋아요 추가 실패' });
      }

      // 게시글의 like_count 증가
      const { data: postData } = await supabase
        .from('community_posts')
        .select('like_count')
        .eq('id', postId)
        .single();
      
      await supabase
        .from('community_posts')
        .update({
          like_count: (postData?.like_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      res.json({ liked: true });
    }
  } catch (error) {
    console.error('[community] 좋아요 토글 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 내가 좋아요한 게시글 ID 목록 조회
 * GET /api/community/posts/my-likes/:periodId
 * Query: anonymous_number (선택, 없으면 모든 익명 ID의 좋아요 반환)
 */
router.get('/posts/my-likes/:periodId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const periodId = parseInt(req.params.periodId);
    const anonymousNumber = req.query.anonymous_number ? parseInt(req.query.anonymous_number) : null;

    if (!periodId || isNaN(periodId)) {
      return res.status(400).json({ error: 'period_id가 필요합니다.' });
    }

    // 해당 회차의 내가 좋아요한 게시글 ID 목록
    let query = supabase
      .from('community_likes')
      .select('post_id, community_posts!inner(period_id)')
      .eq('user_id', userId)
      .eq('community_posts.period_id', periodId);

    // 특정 익명 번호로 좋아요한 것만 조회
    if (anonymousNumber) {
      query = query.eq('anonymous_number', anonymousNumber);
    }

    const { data: likes, error } = await query;

    if (error) {
      console.error('[community] 좋아요 목록 조회 오류:', error);
      return res.status(500).json({ error: '좋아요 목록 조회 실패' });
    }

    const likedPostIds = likes.map(like => like.post_id);
    res.json({ likedPostIds });
  } catch (error) {
    console.error('[community] 좋아요 목록 조회 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * 게시글/댓글 신고
 * POST /api/community/reports
 * Body: { target_type: 'post' | 'comment', target_id, reason, anonymous_number? }
 */
router.post('/reports', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    let { target_type, target_id, reason, anonymous_number } = req.body;

    console.log(`[community] 신고 접수: userId=${userId}, type=${target_type}, id=${target_id}, reason=${reason}`);

    if (!target_type || !target_id || !reason) {
      return res.status(400).json({ error: 'target_type, target_id, reason이 필요합니다.' });
    }

    if (!['post', 'comment'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type은 post 또는 comment여야 합니다.' });
    }

    // 신고 대상이 삭제되었는지 확인
    if (target_type === 'post') {
      const { data: post } = await supabase
        .from('community_posts')
        .select('is_deleted')
        .eq('id', target_id)
        .single();
      
      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }
      if (post.is_deleted) {
        return res.status(410).json({ error: '삭제된 게시글입니다.', code: 'POST_DELETED' });
      }
    } else {
      const { data: comment } = await supabase
        .from('community_comments')
        .select('is_deleted')
        .eq('id', target_id)
        .single();
      
      if (!comment) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }
      if (comment.is_deleted) {
        return res.status(410).json({ error: '삭제된 댓글입니다.', code: 'COMMENT_DELETED' });
      }
    }

    // anonymous_number가 없으면 첫 번째 익명 ID 사용
    if (!anonymous_number) {
      // 대상 게시글/댓글의 period_id 조회
      let periodId;
      if (target_type === 'post') {
        const { data: post } = await supabase
          .from('community_posts')
          .select('period_id')
          .eq('id', target_id)
          .single();
        periodId = post?.period_id;
      } else {
        const { data: comment } = await supabase
          .from('community_comments')
          .select('community_posts!inner(period_id)')
          .eq('id', target_id)
          .single();
        periodId = comment?.community_posts?.period_id;
      }

      if (periodId) {
        const { data: identityList } = await supabase
          .from('community_user_identities')
          .select('anonymous_number')
          .eq('period_id', periodId)
          .eq('user_id', userId)
          .order('anonymous_number', { ascending: true })
          .limit(1);
        
        if (identityList && identityList.length > 0) {
          anonymous_number = identityList[0].anonymous_number;
        } else {
          return res.status(400).json({ error: '익명 ID가 없습니다.' });
        }
      }
    }

    // 이미 신고했는지 확인 (익명 번호 포함)
    const { data: existingReport, error: reportError } = await supabase
      .from('community_reports')
      .select('id')
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .eq('reporter_user_id', userId)
      .eq('anonymous_number', anonymous_number)
      .maybeSingle();

    if (reportError && reportError.code !== 'PGRST116') {
      console.error('[community] 신고 확인 오류:', reportError);
      return res.status(500).json({ error: '신고 확인 실패' });
    }

    if (existingReport) {
      return res.status(400).json({ error: '이미 신고한 게시글/댓글입니다.' });
    }

    // 신고 추가
    const { error: insertError } = await supabase
      .from('community_reports')
      .insert({
        target_type: target_type,
        target_id: target_id,
        reporter_user_id: userId,
        anonymous_number: anonymous_number,
        reason: reason
      });

    if (insertError) {
      console.error('[community] 신고 추가 오류:', insertError);
      return res.status(500).json({ error: '신고 추가 실패' });
    }

    // 신고 횟수 증가
    const tableName = target_type === 'post' ? 'community_posts' : 'community_comments';
    const { data: targetData } = await supabase
      .from(tableName)
      .select('report_count')
      .eq('id', target_id)
      .single();
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        report_count: (targetData?.report_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', target_id);

    if (updateError) {
      console.error('[community] 신고 횟수 증가 오류:', updateError);
    }

    // 관리자에게 알림 전송
    try {
      const contentType = target_type === 'post' ? '게시글' : '댓글';
      const newReportCount = (targetData?.report_count || 0) + 1;
      
      // 인앱 알림 메시지 생성 (관리자 이메일 기준)
      const adminEmail = 'hhggom@hyundai.com';
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .maybeSingle();

      if (adminUser?.id) {
        await notificationRoutes.createNotification(adminUser.id, {
          type: 'community_report',
          title: '🚨 커뮤니티 신고 접수',
          body: `${contentType}에 신고가 접수되었습니다. (누적 ${newReportCount}건)`,
          linkUrl: '/community',
          meta: { target_type, target_id, report_count: newReportCount }
        });
      }

      // 푸시 알림 전송
      await sendPushToAdmin(
        '🚨 커뮤니티 신고 접수',
        `${contentType}에 신고가 접수되었습니다. (누적 ${newReportCount}건)`
      );

      console.log(`[community] 신고 알림 전송 완료: type=${target_type}, id=${target_id}, count=${newReportCount}`);
    } catch (notifError) {
      console.error('[community] 신고 알림 전송 실패:', notifError);
      // 알림 실패해도 신고 처리는 정상 진행
    }

    // 자동 삭제 기준 확인 (기본 3건)
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'community_auto_delete_threshold')
      .maybeSingle();

    const threshold = settings?.value?.report_count || 3;

    // 신고 횟수 확인
    const { data: target } = await supabase
      .from(tableName)
      .select('report_count')
      .eq('id', target_id)
      .single();

    if (target && target.report_count >= threshold) {
      console.log(`[community] 신고 누적으로 자동 삭제: type=${target_type}, id=${target_id}, report_count=${target.report_count}`);
      
      // 작성자 정보 조회 (알림 전송용)
      const { data: targetDetail } = await supabase
        .from(tableName)
        .select('user_id')
        .eq('id', target_id)
        .single();
      
      // 자동 삭제 (soft delete)
      await supabase
        .from(tableName)
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', target_id);

      // 작성자에게 알림 전송
      if (targetDetail?.user_id) {
        try {
          const contentType = target_type === 'post' ? '게시글' : '댓글';
          
          // 인앱 알림 메시지 생성
          await notificationRoutes.createNotification(targetDetail.user_id, {
            type: 'community_delete',
            title: `⚠️ ${contentType}이 삭제되었습니다`,
            body: `신고 누적으로 인해 회원님의 ${contentType}이 삭제되었습니다.`,
            linkUrl: '/community',
            meta: { target_type, target_id, reason: 'report_threshold' }
          });

          // 푸시 알림 전송
          await sendPushToUsers([targetDetail.user_id], {
            type: 'community_delete',
            title: `⚠️ ${contentType} 삭제`,
            body: `신고 누적으로 인해 회원님의 ${contentType}이 삭제되었습니다.`
          });

          console.log(`[community] 신고 누적 삭제 알림 전송 완료: user_id=${targetDetail.user_id}, type=${target_type}`);
        } catch (notifError) {
          console.error('[community] 신고 누적 삭제 알림 전송 실패:', notifError);
        }
      }

      // 댓글이 삭제되면 게시글의 comment_count 감소
      if (target_type === 'comment') {
        const { data: commentData } = await supabase
          .from('community_comments')
          .select('post_id')
          .eq('id', target_id)
          .single();

        if (commentData) {
          const { data: postData } = await supabase
            .from('community_posts')
            .select('comment_count')
            .eq('id', commentData.post_id)
            .single();

          await supabase
            .from('community_posts')
            .update({
              comment_count: Math.max((postData?.comment_count || 0) - 1, 0),
              updated_at: new Date().toISOString()
            })
            .eq('id', commentData.post_id);
        }
      }
    }

    res.json({ success: true, message: '신고가 접수되었습니다.' });
  } catch (error) {
    console.error('[community] 신고 예외:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;

