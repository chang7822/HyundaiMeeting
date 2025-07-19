const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

// FAQ 목록 조회
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('faq')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('FAQ 조회 오류:', error);
      return res.status(500).json({ message: 'FAQ 조회에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('FAQ 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});



// FAQ 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('faq')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('FAQ 상세 조회 오류:', error);
      return res.status(404).json({ message: 'FAQ를 찾을 수 없습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('FAQ 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 FAQ 생성
router.post('/', authenticate, async (req, res) => {
  try {
    const { question, answer, display_order, is_active } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ message: '질문과 답변은 필수입니다.' });
    }

    const { data, error } = await supabase
      .from('faq')
      .insert([{
        question,
        answer,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true
      }])
      .select()
      .single();

    if (error) {
      console.error('FAQ 생성 오류:', error);
      return res.status(500).json({ message: 'FAQ 생성에 실패했습니다.' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('FAQ 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 FAQ 수정
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, display_order, is_active } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ message: '질문과 답변은 필수입니다.' });
    }

    const { data, error } = await supabase
      .from('faq')
      .update({
        question,
        answer,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('FAQ 수정 오류:', error);
      return res.status(500).json({ message: 'FAQ 수정에 실패했습니다.' });
    }

    res.json(data);
  } catch (error) {
    console.error('FAQ 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 FAQ 삭제
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('faq')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('FAQ 삭제 오류:', error);
      return res.status(500).json({ message: 'FAQ 삭제에 실패했습니다.' });
    }

    res.json({ success: true, message: 'FAQ가 삭제되었습니다.' });
  } catch (error) {
    console.error('FAQ 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 