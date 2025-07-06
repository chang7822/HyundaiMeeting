const express = require('express');
const router = express.Router();
const { supabase } = require('../database');

// 모든 회사 조회 (DB에서)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ message: '회사 목록을 불러오지 못했습니다.', error });
  }

  // emailDomains 필드명 맞추기
  const companies = (data || []).map(company => ({
    id: String(company.id),
    name: company.name,
    emailDomains: company.email_domains,
    isActive: company.is_active
  }));

  res.json(companies);
});

// 도메인으로 회사 조회 (DB에서)
router.get('/domain/:domain', async (req, res) => {
  const { domain } = req.params;
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .contains('email_domains', [domain])
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: '회사를 찾을 수 없습니다.' });
  }

  const company = {
    id: String(data.id),
    name: data.name,
    emailDomains: data.email_domains,
    isActive: data.is_active
  };
  res.json(company);
});

module.exports = router; 