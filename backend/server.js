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
const noticeRoutes = require('./routes/notice');
const faqRoutes = require('./routes/faq');
const { supabase } = require('./database');
const { encrypt, decrypt } = require('./utils/encryption');

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
app.use('/api/notice', noticeRoutes);
app.use('/api/faq', faqRoutes);

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
  console.log('[SOCKET][server] 새 연결:', socket.id);
  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log('[SOCKET][server] join:', roomId, 'socket:', socket.id);
    // join 완료 알림
    socket.emit('joined', roomId);
  });
  socket.on('chat message', async (data) => {
    console.log('[SOCKET][server] chat message 수신:', data);
    if (!data.period_id || !data.sender_id || !data.receiver_id || !data.content) return;
    // 방 이름: period_id_정렬된userId1_userId2
    const sortedIds = [data.sender_id, data.receiver_id].sort();
    const roomId = `${data.period_id}_${sortedIds[0]}_${sortedIds[1]}`;
    console.log('[SOCKET][server] roomId 생성:', roomId);
    let encryptedContent;
    try {
      encryptedContent = encrypt(data.content);
    } catch (e) {
      console.error('[SOCKET][server] 암호화 실패:', e);
      return;
    }
    const newMessage = {
      period_id: data.period_id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      sender_nickname: data.sender_nickname,
      receiver_nickname: data.receiver_nickname,
      content: encryptedContent,
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString()
    };
    try {
      const { data: dbData, error } = await supabase.from('chat_messages').insert([newMessage]).select().single();
      if (error) {
        console.error('[SOCKET][server] [채팅 DB 저장 오류]', error);
      } else {
        console.log('[SOCKET][server] [채팅 DB 저장 성공] period_id=', newMessage.period_id, ', sender_id=', newMessage.sender_id, ', receiver_id=', newMessage.receiver_id, ', content=', newMessage.content);
        // DB에 저장된 row(id 포함)를 emit
        let plainContent = '';
        try {
          plainContent = decrypt(dbData.content);
        } catch (e) {
          plainContent = '[복호화 실패]';
        }
        io.to(roomId).emit('chat message', { ...dbData, content: plainContent });
        console.log('[SOCKET][server] chat message 브로드캐스트:', roomId, { ...dbData, content: plainContent });
      }
    } catch (e) {
      console.error('[SOCKET][server] [채팅 DB 저장 예외]', e);
    }
  });
  socket.on('disconnect', () => {
    console.log('[SOCKET][server] disconnect:', socket.id);
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