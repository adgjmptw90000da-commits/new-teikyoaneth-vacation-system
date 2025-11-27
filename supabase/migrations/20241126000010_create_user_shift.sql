-- ユーザーシフト割り当てテーブルを作成
CREATE TABLE IF NOT EXISTS user_shift (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type_id INTEGER NOT NULL REFERENCES shift_type(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, shift_date, shift_type_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_shift_staff_id ON user_shift(staff_id);
CREATE INDEX IF NOT EXISTS idx_user_shift_date ON user_shift(shift_date);
CREATE INDEX IF NOT EXISTS idx_user_shift_type_id ON user_shift(shift_type_id);

-- コメント
COMMENT ON TABLE user_shift IS 'ユーザーへのシフト割り当て';
COMMENT ON COLUMN user_shift.staff_id IS 'スタッフID';
COMMENT ON COLUMN user_shift.shift_date IS 'シフト日';
COMMENT ON COLUMN user_shift.shift_type_id IS 'シフトタイプID';
