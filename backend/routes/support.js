const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

// ===================================
// 사용자용 API
// ===================================

// 문의 등록
router.post('/inquiries', authenticate, async (req, res) => {
  try {
    const { title, content, category = '일반문의' } = req.body;
    const user_id = req.user.userId;

    // 필수 필드 검증
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '제목과 내용을 입력해주세요.' 
      });
    }

    // 제목 길이 검증
    if (title.length > 200) {
      return res.status(400).json({ 
        success: false, 
        message: '제목은 200자 이내로 입력해주세요.' 
      });
    }

    // 문의 등록
    const { data, error } = await supabase
      .from('support_inquiries')
      .insert({
        user_id,
        title: title.trim(),
        content: content.trim(),
        category,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('문의 등록 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '문의 등록에 실패했습니다.' 
      });
    }

    res.json({
      success: true,
      message: '문의가 성공적으로 등록되었습니다.',
      data
    });

  } catch (error) {
    console.error('문의 등록 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내 문의 목록 조회
router.get('/inquiries/my', authenticate, async (req, res) => {
  try {
    const user_id = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('support_inquiries')
      .select(`
        id,
        title,
        content,
        category,
        status,
        created_at,
        updated_at
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 상태 필터
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('내 문의 목록 조회 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '문의 목록 조회에 실패했습니다.' 
      });
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0
      }
    });

  } catch (error) {
    console.error('내 문의 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 문의 상세 조회 (답변 포함)
router.get('/inquiries/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.userId;

    // 문의 조회
    const { data: inquiry, error: inquiryError } = await supabase
      .from('support_inquiries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id) // 본인 문의만 조회 가능
      .single();

    if (inquiryError || !inquiry) {
      return res.status(404).json({ 
        success: false, 
        message: '문의를 찾을 수 없습니다.' 
      });
    }

    // 답변 조회
    const { data: replies, error: repliesError } = await supabase
      .from('support_replies')
      .select(`
        id,
        content,
        is_admin_reply,
        created_at,
        user:users(email)
      `)
      .eq('inquiry_id', id)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('답변 조회 오류:', repliesError);
    }

    res.json({
      success: true,
      data: {
        ...inquiry,
        replies: replies || []
      }
    });

  } catch (error) {
    console.error('문의 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});



// ===================================
// 관리자용 API
// ===================================

// 모든 문의 목록 조회 (관리자)
router.get('/admin/inquiries', authenticate, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '관리자 권한이 필요합니다.' 
      });
    }

    const { page = 1, limit = 20, status, category } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('support_inquiries')
      .select(`
        id,
        title,
        content,
        category,
        status,
        created_at,
        updated_at,
        user:users(id, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 필터링
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('관리자 문의 목록 조회 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '문의 목록 조회에 실패했습니다.' 
      });
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0
      }
    });

  } catch (error) {
    console.error('관리자 문의 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 관리자용 문의 상세 조회
router.get('/admin/inquiries/:id', authenticate, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '관리자 권한이 필요합니다.' 
      });
    }

    const { id } = req.params;

    // 문의 조회 (사용자 정보 포함)
    const { data: inquiry, error: inquiryError } = await supabase
      .from('support_inquiries')
      .select(`
        *,
        user:users(id, email)
      `)
      .eq('id', id)
      .single();

    if (inquiryError || !inquiry) {
      return res.status(404).json({ 
        success: false, 
        message: '문의를 찾을 수 없습니다.' 
      });
    }

    // 답변 조회
    const { data: replies, error: repliesError } = await supabase
      .from('support_replies')
      .select(`
        id,
        content,
        is_admin_reply,
        created_at,
        user:users(email)
      `)
      .eq('inquiry_id', id)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('답변 조회 오류:', repliesError);
    }

    res.json({
      success: true,
      data: {
        ...inquiry,
        replies: replies || []
      }
    });

  } catch (error) {
    console.error('관리자 문의 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 관리자 답변 등록
router.post('/admin/inquiries/:id/reply', authenticate, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '관리자 권한이 필요합니다.' 
      });
    }

    const { id } = req.params;
    const { content } = req.body;
    const admin_user_id = req.user.userId;

    if (!content || content.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: '답변 내용을 입력해주세요.' 
      });
    }

    // 문의 존재 확인
    const { data: inquiry, error: checkError } = await supabase
      .from('support_inquiries')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !inquiry) {
      return res.status(404).json({ 
        success: false, 
        message: '문의를 찾을 수 없습니다.' 
      });
    }

    // 관리자 답변 등록
    const { data, error } = await supabase
      .from('support_replies')
      .insert({
        inquiry_id: id,
        user_id: admin_user_id,
        content: content.trim(),
        is_admin_reply: true
      })
      .select()
      .single();

    if (error) {
      console.error('관리자 답변 등록 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '답변 등록에 실패했습니다.' 
      });
    }

    // 문의 상태를 completed로 변경
    await supabase
      .from('support_inquiries')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({
      success: true,
      message: '답변이 등록되었습니다.',
      data
    });

  } catch (error) {
    console.error('관리자 답변 등록 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 문의 상태 변경 (관리자)
router.put('/admin/inquiries/:id/status', authenticate, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '관리자 권한이 필요합니다.' 
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // 유효한 상태값 확인
    const validStatuses = ['pending', 'completed', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 상태값입니다.' 
      });
    }

    const { data, error } = await supabase
      .from('support_inquiries')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('문의 상태 변경 오류:', error);
      return res.status(500).json({ 
        success: false, 
        message: '상태 변경에 실패했습니다.' 
      });
    }

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: '문의를 찾을 수 없습니다.' 
      });
    }

    res.json({
      success: true,
      message: '상태가 변경되었습니다.',
      data
    });

  } catch (error) {
    console.error('문의 상태 변경 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
