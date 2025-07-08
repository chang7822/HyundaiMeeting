const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const envPath = path.join(__dirname, 'config.env');
console.log('envPath:', envPath, 'exists:', fs.existsSync(envPath));
dotenv.config({ path: envPath });
console.log('dotenv.config() 직후 EMAIL_USER:', process.env.EMAIL_USER);

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/users');
const matchingRoutes = require('./routes/matching');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const { supabase } = require('./database');

// 환경 변수 로드 (절대 경로 사용)
dotenv.config({ path: path.join(__dirname, 'config.env') });

// 환경 변수 미설정 시 경고만 출력
if (!process.env.EMAIL_USER) {
  console.warn('[경고] EMAIL_USER 환경변수가 설정되어 있지 않습니다. 이메일 인증이 동작하지 않을 수 있습니다.');
}
if (!process.env.EMAIL_PASS) {
  console.warn('[경고] EMAIL_PASS 환경변수가 설정되어 있지 않습니다. 이메일 인증이 동작하지 않을 수 있습니다.');
}
if (!process.env.DB_PASSWORD) {
  console.warn('[경고] DB_PASSWORD 환경변수가 설정되어 있지 않습니다. 직접 DB접속이 필요한 경우 오류가 발생할 수 있습니다.');
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

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));

// socket.io 연동
const http = require('http');
const { Server } = require('socket.io');
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// chat.js의 messages 배열을 이 파일에서도 사용
const chatMessages = require('./routes/chat').messages || [];

io.on('connection', (socket) => {
  console.log('클라이언트 연결됨:', socket.id);

  socket.on('join', (roomId) => {
    socket.join(roomId); // period_id_정렬된userId1_userId2
  });

  socket.on('chat message', async (data) => {
    // data: { period_id, sender_id, receiver_id, sender_nickname, receiver_nickname, content, timestamp }
    if (!data.period_id || !data.sender_id || !data.receiver_id || !data.content) return;
    // 방 이름: period_id_정렬된userId1_userId2
    const sortedIds = [data.sender_id, data.receiver_id].sort();
    const roomId = `${data.period_id}_${sortedIds[0]}_${sortedIds[1]}`;
    const newMessage = {
      period_id: data.period_id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      sender_nickname: data.sender_nickname,
      receiver_nickname: data.receiver_nickname,
      content: data.content,
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString()
    };
    try {
      const { data: dbData, error } = await supabase.from('chat_messages').insert([newMessage]);
      if (error) {
        console.error('[채팅 DB 저장 오류]', error);
      } else {
        console.log(`[채팅 DB 저장 성공] period_id=${newMessage.period_id}, sender_id=${newMessage.sender_id}, receiver_id=${newMessage.receiver_id}, content=${newMessage.content}`);
      }
    } catch (e) {
      console.error('[채팅 DB 저장 예외]', e);
    }
    io.to(roomId).emit('chat message', { ...newMessage });
  });

  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제:', socket.id);
  });
});

// SPA 라우트 핸들링 (항상 마지막에!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Hyundai Meeting API Server' });
});

// 서버 시작
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});