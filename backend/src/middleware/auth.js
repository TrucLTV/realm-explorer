const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Không có token đăng nhập' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token không hợp lệ' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token hết hạn, hãy đăng nhập lại' });
  }
}

function teacherOnly(req, res, next) {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền này' });
  }
  next();
}

module.exports = { authMiddleware, teacherOnly };
