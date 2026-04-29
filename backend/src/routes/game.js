const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/game/save
router.get('/save', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM game_saves WHERE user_id = $1`, [req.user.id]);
    if (r.rows.length === 0) {
      await db.query(`INSERT INTO game_saves (user_id) VALUES ($1)`, [req.user.id]);
      return res.json({ save: null });
    }
    const save = r.rows[0];
    save.locations_done = JSON.parse(save.locations_done || '[]');
    save.equipped = JSON.parse(save.equipped || '{}');
    save.inventory = JSON.parse(save.inventory || '[]');
    res.json({ save });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi tải dữ liệu' });
  }
});

// POST /api/game/save
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { char_index, char_hp, char_max_hp, char_mp, char_max_mp, char_atk,
            level, exp, exp_to_next, gold, locations_done, current_loc, equipped, inventory } = req.body;
    await db.query(
      `UPDATE game_saves SET
        char_index=$1, char_hp=$2, char_max_hp=$3, char_mp=$4, char_max_mp=$5, char_atk=$6,
        level=$7, exp=$8, exp_to_next=$9, gold=$10,
        locations_done=$11, current_loc=$12, equipped=$13, inventory=$14, updated_at=NOW()
       WHERE user_id=$15`,
      [char_index, char_hp, char_max_hp, char_mp, char_max_mp, char_atk,
       level, exp, exp_to_next, gold,
       JSON.stringify(locations_done || []), current_loc,
       JSON.stringify(equipped || {}), JSON.stringify(inventory || []),
       req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi lưu dữ liệu' });
  }
});

// POST /api/game/score — Ghi điểm sau mỗi địa điểm
router.post('/score', authMiddleware, async (req, res) => {
  try {
    const { location_id, location_name, correct_count, wrong_count, exp_earned, gold_earned } = req.body;
    await db.query(
      `INSERT INTO score_history (user_id, location_id, location_name, correct_count, wrong_count, exp_earned, gold_earned)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.user.id, location_id, location_name, correct_count || 0, wrong_count || 0, exp_earned || 0, gold_earned || 0]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi ghi điểm' });
  }
});

// GET /api/game/leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM leaderboard LIMIT 50`);
    res.json({ leaderboard: r.rows });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi tải bảng xếp hạng' });
  }
});

// GET /api/game/report — Giáo viên xem báo cáo chi tiết
router.get('/report', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Không có quyền' });
  try {
    const students = await db.query(
      `SELECT u.id, u.display_name, u.class_name, gs.level, gs.exp, gs.gold, gs.locations_done,
              COALESCE(SUM(sh.correct_count),0) AS total_correct,
              COALESCE(SUM(sh.wrong_count),0) AS total_wrong,
              COUNT(DISTINCT sh.location_id) AS locations_played
       FROM users u
       LEFT JOIN game_saves gs ON gs.user_id = u.id
       LEFT JOIN score_history sh ON sh.user_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id, u.display_name, u.class_name, gs.level, gs.exp, gs.gold, gs.locations_done
       ORDER BY gs.level DESC, gs.exp DESC`
    );
    res.json({ report: students.rows });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi tải báo cáo' });
  }
});

module.exports = router;
