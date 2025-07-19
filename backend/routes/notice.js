const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

// 공지사항 목록 조회
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notice')
      .select('*')
      .order('is_important', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('공지사항 조회 오류:', error);
      return res.status(500).json({ message: '공지사항 조회에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 공지사항 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 먼저 현재 공지사항 조회
    const { data: currentNotice, error: fetchError } = await supabase
      .from('notice')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('공지사항 조회 오류:', fetchError);
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    const { error: updateError } = await supabase
      .from('notice')
      .update({ view_count: (currentNotice.view_count || 0) + 1 })
      .eq('id', id);

    if (updateError) {
      console.error('조회수 증가 오류:', updateError);
      // 조회수 증가 실패해도 공지사항은 반환
    }

    res.json(currentNotice);
  } catch (error) {
    console.error('공지사항 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 공지사항 생성
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, author, is_important } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    const { data, error } = await supabase
      .from('notice')
      .insert([{
        title,
        content,
        author: author || '관리자',
        is_important: is_important || false,
        view_count: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('공지사항 생성 오류:', error);
      return res.status(500).json({ message: '공지사항 생성에 실패했습니다.' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 공지사항 수정
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, author, is_important } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    const { data, error } = await supabase
      .from('notice')
      .update({
        title,
        content,
        author: author || '관리자',
        is_important: is_important || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('공지사항 수정 오류:', error);
      return res.status(500).json({ message: '공지사항 수정에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 공지사항 삭제
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notice')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('공지사항 삭제 오류:', error);
      return res.status(500).json({ message: '공지사항 삭제에 실패했습니다.' });
    }

    res.json({ success: true, message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 