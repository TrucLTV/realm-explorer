-- Realm Explorer Database Schema
-- Run this on your PostgreSQL database (Railway provides this)

-- Users table (học sinh + giáo viên)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(10) DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  class_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Game saves (tiến độ game của từng học sinh)
CREATE TABLE IF NOT EXISTS game_saves (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  char_index INTEGER DEFAULT 0,
  char_hp INTEGER DEFAULT 80,
  char_max_hp INTEGER DEFAULT 80,
  char_mp INTEGER DEFAULT 120,
  char_max_mp INTEGER DEFAULT 120,
  char_atk INTEGER DEFAULT 12,
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  exp_to_next INTEGER DEFAULT 100,
  gold INTEGER DEFAULT 0,
  locations_done TEXT DEFAULT '[]',
  current_loc INTEGER DEFAULT 0,
  equipped TEXT DEFAULT '{"weapon":null,"armor":null,"accessory":null}',
  inventory TEXT DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Score history (lịch sử điểm số từng lần chơi)
CREATE TABLE IF NOT EXISTS score_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL,
  location_name VARCHAR(100),
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  exp_earned INTEGER DEFAULT 0,
  gold_earned INTEGER DEFAULT 0,
  played_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  u.display_name,
  u.class_name,
  gs.level,
  gs.exp + (gs.level - 1) * 100 AS total_exp,
  gs.gold,
  COALESCE(
    (SELECT COUNT(*) FROM score_history sh WHERE sh.user_id = u.id),
    0
  ) AS sessions_played,
  COALESCE(
    (SELECT SUM(sh.correct_count) FROM score_history sh WHERE sh.user_id = u.id),
    0
  ) AS total_correct
FROM users u
JOIN game_saves gs ON gs.user_id = u.id
WHERE u.role = 'student'
ORDER BY total_exp DESC, gs.gold DESC;

-- Default teacher account (đổi password sau!)
INSERT INTO users (username, password_hash, display_name, role)
VALUES ('giaovien', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Giáo Viên', 'teacher')
ON CONFLICT (username) DO NOTHING;
-- Default password: "giaovien123" — ĐỔI NGAY SAU KHI DEPLOY!
