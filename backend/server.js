const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/users');
const matchingRoutes = require('./routes/matching');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

// 환경 변수 로드 (절대 경로 사용)
dotenv.config({ path: path.join(__dirname, 'config.env') });

// 환경 변수가 로드되지 않으면 직접 설정
if (!process.env.EMAIL_USER) {
  process.env.EMAIL_USER = 'changjae1109@gmail.com';
  process.env.EMAIL_PASS = 'rfcqefynptvwrxka';
  process.env.DB_PASSWORD = 'Pgmrrha12!@';
  console.log('환경 변수를 직접 설정했습니다.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Hyundai Meeting API Server' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 