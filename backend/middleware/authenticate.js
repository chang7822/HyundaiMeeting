const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }
  try {
    const secret = process.env.JWT_SECRET;
    const user = jwt.verify(token, secret);
    req.user = {
      ...user,
      userId: user.userId || user.id || user.sub // userId(숫자, DB의 users.id) 우선 사용
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

module.exports = authenticate; 