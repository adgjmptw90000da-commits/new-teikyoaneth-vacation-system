-- 予定タイプ（管理者が設定する予定の種類）
CREATE TABLE IF NOT EXISTS schedule_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  position_am BOOLEAN DEFAULT true,
  position_pm BOOLEAN DEFAULT true,
  position_night BOOLEAN DEFAULT false,
  prev_day_night_shift BOOLEAN DEFAULT false,
  same_day_night_shift BOOLEAN DEFAULT true,
  next_day_night_shift BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  color VARCHAR DEFAULT '#3B82F6',
  monthly_limit INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーの予定（各日に登録する予定）
CREATE TABLE IF NOT EXISTS user_schedule (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  schedule_type_id INTEGER NOT NULL REFERENCES schedule_type(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーの研究日設定
CREATE TABLE IF NOT EXISTS user_research_day (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE UNIQUE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_first_year BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_schedule_staff_id ON user_schedule(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_schedule_date ON user_schedule(schedule_date);
CREATE INDEX IF NOT EXISTS idx_user_schedule_type_id ON user_schedule(schedule_type_id);
CREATE INDEX IF NOT EXISTS idx_user_research_day_staff_id ON user_research_day(staff_id);

-- 初期予定タイプを追加（必要に応じて管理者が変更可能）
INSERT INTO schedule_type (name, position_am, position_pm, position_night, prev_day_night_shift, same_day_night_shift, next_day_night_shift, display_order, color, monthly_limit) VALUES
('学会(発表)', true, true, false, false, false, true, 1, '#EF4444', NULL),
('学会(参加)', true, true, false, true, false, true, 2, '#F97316', NULL),
('当直なし希望', false, false, true, true, false, true, 3, '#A855F7', 3),
('公務', true, true, false, false, false, true, 4, '#3B82F6', NULL),
('出張', true, true, false, false, false, true, 5, '#22C55E', NULL),
('講義', true, false, false, false, true, true, 6, '#06B6D4', NULL),
('委員会', false, true, false, false, true, true, 7, '#EC4899', NULL)
ON CONFLICT DO NOTHING;
