-- 勤務場所マスタテーブル
CREATE TABLE IF NOT EXISTS work_location (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  display_label VARCHAR(20),
  color VARCHAR(9) DEFAULT '#CCFFFF',
  text_color VARCHAR(9) DEFAULT '#000000',
  display_order INTEGER DEFAULT 0,
  is_default_weekday BOOLEAN DEFAULT false,
  is_default_holiday BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期データ（手術室を平日デフォルト、院外を休日デフォルトに設定）
INSERT INTO work_location (name, display_label, color, display_order, is_default_weekday, is_default_holiday) VALUES
  ('手術室', 'OP', '#90EE90', 1, true, false),
  ('ICU', 'ICU', '#FFB6C1', 2, false, false),
  ('院内', '院内', '#87CEEB', 3, false, false),
  ('院外', '院外', '#FFE4B5', 4, false, true);

-- user_schedule に work_location_id カラム追加
ALTER TABLE user_schedule ADD COLUMN IF NOT EXISTS work_location_id INTEGER REFERENCES work_location(id);

-- user_shift に work_location_id カラム追加
ALTER TABLE user_shift ADD COLUMN IF NOT EXISTS work_location_id INTEGER REFERENCES work_location(id);

-- 予定なしセル用の勤務場所テーブル
CREATE TABLE IF NOT EXISTS user_work_location (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  work_location_id INTEGER NOT NULL REFERENCES work_location(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, work_date)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_work_location_staff_id ON user_work_location(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_work_location_date ON user_work_location(work_date);
CREATE INDEX IF NOT EXISTS idx_user_schedule_work_location ON user_schedule(work_location_id);
CREATE INDEX IF NOT EXISTS idx_user_shift_work_location ON user_shift(work_location_id);
