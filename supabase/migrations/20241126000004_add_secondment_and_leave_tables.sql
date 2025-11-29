-- 出向中テーブル（月単位で管理）
CREATE TABLE IF NOT EXISTS user_secondment (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, year, month)
);

-- 休職中テーブル（期間で管理）
CREATE TABLE IF NOT EXISTS user_leave_of_absence (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (start_date <= end_date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_secondment_staff_id ON user_secondment(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_secondment_year_month ON user_secondment(year, month);
CREATE INDEX IF NOT EXISTS idx_user_leave_of_absence_staff_id ON user_leave_of_absence(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_leave_of_absence_dates ON user_leave_of_absence(start_date, end_date);

-- コメント
COMMENT ON TABLE user_secondment IS 'ユーザーの出向中設定（月単位）';
COMMENT ON COLUMN user_secondment.year IS '出向年';
COMMENT ON COLUMN user_secondment.month IS '出向月（1-12）';

COMMENT ON TABLE user_leave_of_absence IS 'ユーザーの休職期間';
COMMENT ON COLUMN user_leave_of_absence.start_date IS '休職開始日';
COMMENT ON COLUMN user_leave_of_absence.end_date IS '休職終了日';
