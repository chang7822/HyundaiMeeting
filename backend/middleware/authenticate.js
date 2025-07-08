const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('[auth-mw] Authorization 헤더:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.log('[auth-mw] 토큰 없음');
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn('[경고] JWT_SECRET 환경변수가 설정되어 있지 않습니다. 인증/보안에 취약할 수 있습니다.');
    }
    console.log('[auth-mw] 토큰 파싱 시도:', token);
    const user = jwt.verify(token, secret);
    console.log('[auth-mw] jwt.verify 결과:', user);
    req.user = {
      ...user,
      userId: user.userId || user.id || user.sub // userId(숫자, DB의 users.id) 우선 사용
    };
    console.log('[auth-mw] 최종 req.user.userId:', req.user.userId);
    next();
  } catch (err) {
    console.log('[auth-mw] 토큰 파싱 실패:', err.message);
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

module.exports = authenticate; 