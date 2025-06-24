const { Pool } = require('pg');

console.log('🔍 DATABASE_URL 파싱 테스트...');

// DATABASE_URL 파싱
const databaseUrl = 'postgresql://postgres:Pgmrrha12%21%40@db.ikhvppldbdljgwrdnapc.supabase.co:5432/postgres';

// URL 파싱
const url = new URL(databaseUrl);
console.log('파싱된 URL 정보:');
console.log('- Protocol:', url.protocol);
console.log('- Hostname:', url.hostname);
console.log('- Port:', url.port);
console.log('- Username:', url.username);
console.log('- Password:', url.password);
console.log('- Database:', url.pathname.slice(1));

// URL 디코딩된 비밀번호
const decodedPassword = decodeURIComponent(url.password);
console.log('- Decoded Password:', decodedPassword);

// 연결 테스트 (IPv4 강제)
const pool = new Pool({
  host: url.hostname,
  port: url.port,
  database: url.pathname.slice(1),
  user: url.username,
  password: decodedPassword,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000,
  // IPv4 강제 사용
  family: 4
});

pool.on('connect', () => {
  console.log('✅ 연결 성공!');
  process.exit(0);
});

pool.on('error', (err) => {
  console.error('❌ 연결 실패:', err.message);
  console.error('에러 코드:', err.code);
  process.exit(1);
});

setTimeout(() => {
  console.error('⏰ 타임아웃');
  process.exit(1);
}, 10000); 