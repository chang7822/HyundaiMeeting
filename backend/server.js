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
const reportRoutes = require('./routes/reports');
const matchingHistoryRoutes = require('./routes/matching-history');
const supportRoutes = require('./routes/support');
const systemRoutes = require('./routes/system');
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

// CORS 설정
const corsOptions = {
  origin: [
    'https://automatchingway.com',
    'https://www.automatchingway.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 미들웨어
app.use(cors(corsOptions));
app.use(express.json());

// OPTIONS 요청 처리 (preflight)
app.options('*', cors(corsOptions));

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notice', noticeRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/matching-history', matchingHistoryRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/system', systemRoutes);

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));

// socket.io 연동
const http = require('http');
const { Server } = require('socket.io');
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://automatchingway.com',
      'https://www.automatchingway.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }
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
    
    // 상대방의 정지 상태 확인
    try {
      const { data: receiverData, error: receiverError } = await supabase
        .from('users')
        .select('is_banned, banned_until')
        .eq('id', data.receiver_id)
        .single();
      
      if (receiverError) {
        console.error('[SOCKET][server] 수신자 정보 조회 실패:', receiverError);
        return;
      }
      
      if (receiverData) {
        const isBanned = receiverData.is_banned === true;
        const bannedUntil = receiverData.banned_until ? new Date(receiverData.banned_until) : null;
        const now = new Date();
        const isBanActive = isBanned && (!bannedUntil || bannedUntil > now);
        
        if (isBanActive) {
          console.log('[SOCKET][server] 정지된 사용자에게 메시지 전송 차단:', data.receiver_id);
          return;
        }
      }
    } catch (e) {
      console.error('[SOCKET][server] 정지 상태 확인 중 오류:', e);
      return;
    }
    
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
  // 읽음 상태 브로드캐스트
  socket.on('read', (data) => {
    try {
      if (!data || !data.period_id || !data.reader_id || !data.partner_id) return;
      const sortedIds = [String(data.reader_id), String(data.partner_id)].sort();
      const roomId = `${data.period_id}_${sortedIds[0]}_${sortedIds[1]}`;
      io.to(roomId).emit('read', data);
      console.log('[SOCKET][server] read 이벤트 브로드캐스트:', roomId, data);
    } catch (e) {
      console.error('[SOCKET][server] read 이벤트 처리 오류:', e);
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