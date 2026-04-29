const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, display_name, class_name, teacher_code } = req.body;
    if (teacher_code !== process.env.TEACHER_CODE)
      return res.status(403).json({ error: 'Mã giáo viên không đúng' });
    if (!username || !password || !display_name)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    if (username.length < 3) return res.status(400).json({ error: 'Username tối thiểu 3 ký tự' });
    if (password.length < 4) return res.status(400).json({ error: 'Password tối thiểu 4 ký tự' });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      `INSERT INTO users (username, password_hash, display_name, class_name) VALUES ($1,$2,$3,$4) RETURNING id, username, display_name, class_name`,
      [username.toLowerCase().trim(), hash, display_name.trim(), class_name || '']
    );
    await db.query(`INSERT INTO game_saves (user_id) VALUES ($1)`, [r.rows[0].id]);
    res.status(201).json({ success: true, user: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username đã tồn tại' });
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.post('/register-batch', async (req, res) => {
  try {
    const { students, teacher_code } = req.body;
    if (teacher_code !== process.env.TEACHER_CODE)
      return res.status(403).json({ error: 'Mã giáo viên không đúng' });
    const results = [];
    for (const s of students) {
      try {
        const hash = await bcrypt.hash(s.password, 10);
        const r = await db.query(
          `INSERT INTO users (username, password_hash, display_name, class_name) VALUES ($1,$2,$3,$4) RETURNING id, username, display_name`,
          [s.username.toLowerCase().trim(), hash, s.display_name, s.class_name || '']
        );
        await db.query(`INSERT INTO game_saves (user_id) VALUES ($1)`, [r.rows[0].id]);
        results.push({ ...r.rows[0], success: true });
      } catch (e) {
        results.push({ username: s.username, success: false, error: e.code === '23505' ? 'Đã tồn tại' : 'Lỗi' });
      }
    }
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Nhập username và password' });
    const result = await db.query(`SELECT * FROM users WHERE username = $1`, [username.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Username không tồn tại' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Sai mật khẩu' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, class_name: user.class_name } });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.get('/students', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Không có quyền' });
  const r = await db.query(
    `SELECT u.id, u.username, u.display_name, u.class_name, u.created_at,
            gs.level, gs.exp, gs.gold, gs.locations_done
     FROM users u LEFT JOIN game_saves gs ON gs.user_id = u.id
     WHERE u.role = 'student' ORDER BY u.class_name, u.display_name`
  );
  res.json({ students: r.rows });
});

router.delete('/students/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Không có quyền' });
  await db.query(`DELETE FROM users WHERE id = $1 AND role = 'student'`, [req.params.id]);
  res.json({ success: true });
});

router.post('/reset-password', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Không có quyền' });
  const { student_id, new_password } = req.body;
  const hash = await bcrypt.hash(new_password, 10);
  await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'student'`, [hash, student_id]);
  res.json({ success: true });
});

module.exports = router;
