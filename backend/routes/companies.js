const express = require('express');
const router = express.Router();

// 임시 회사 데이터
const companies = [
  {
    id: '1',
    name: '현대자동차',
    emailDomain: 'hyundai.com',
    isActive: true
  },
  {
    id: '2',
    name: '기아자동차',
    emailDomain: 'kia.com',
    isActive: true
  },
  {
    id: '3',
    name: '현대모비스',
    emailDomain: 'mobis.co.kr',
    isActive: true
  },
  {
    id: '4',
    name: '현대제철',
    emailDomain: 'hyundai-steel.com',
    isActive: true
  },
  {
    id: '5',
    name: '현대엔지니어링',
    emailDomain: 'hdec.kr',
    isActive: true
  },
  {
    id: '6',
    name: '현대글로비스',
    emailDomain: 'glovis.net',
    isActive: true
  }
];

// 모든 회사 조회
router.get('/', (req, res) => {
  res.json(companies.filter(company => company.isActive));
});

// 도메인으로 회사 조회
router.get('/domain/:domain', (req, res) => {
  const { domain } = req.params;
  const company = companies.find(c => c.emailDomain === domain && c.isActive);
  
  if (company) {
    res.json(company);
  } else {
    res.status(404).json({ message: '회사를 찾을 수 없습니다.' });
  }
});

module.exports = router; 