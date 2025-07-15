const crypto = require('crypto');

const KEY = process.env.CHAT_ENCRYPTION_KEY;
if (!KEY || KEY.length < 32) {
  console.warn('[encryption] CHAT_ENCRYPTION_KEY 환경변수가 32바이트 미만입니다. 보안에 취약할 수 있습니다.');
}
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 128비트

function encrypt(text) {
  if (!KEY) throw new Error('암호화 키 미설정');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'utf8').slice(0,32), iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // iv + 암호문 base64로 반환
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(data) {
  if (!KEY) throw new Error('복호화 키 미설정');
  const [ivBase64, encrypted] = data.split(':');
  if (!ivBase64 || !encrypted) throw new Error('암호문 포맷 오류');
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, 'utf8').slice(0,32), iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt }; 