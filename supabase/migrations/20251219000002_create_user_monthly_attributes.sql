-- メンバー月別属性テーブル
-- 月ごとにメンバーの属性（当直レベル、職位、対応可能業務など）を保存

CREATE TABLE user_monthly_attributes (
  id SERIAL PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  night_shift_level TEXT,
  position TEXT,
  team TEXT,
  can_cardiac BOOLEAN DEFAULT false,
  can_obstetric BOOLEAN DEFAULT false,
  can_icu BOOLEAN DEFAULT false,
  can_remaining_duty BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, year, month)
);

-- インデックス
CREATE INDEX idx_user_monthly_attributes_year_month
  ON user_monthly_attributes(year, month);

-- コメント
COMMENT ON TABLE user_monthly_attributes IS 'メンバー月別属性';
COMMENT ON COLUMN user_monthly_attributes.staff_id IS '職員ID';
COMMENT ON COLUMN user_monthly_attributes.year IS '年';
COMMENT ON COLUMN user_monthly_attributes.month IS '月';
COMMENT ON COLUMN user_monthly_attributes.night_shift_level IS '当直レベル（なし/上/中/下）';
COMMENT ON COLUMN user_monthly_attributes.position IS '職位（常勤/非常勤/ローテーター/研修医）';
COMMENT ON COLUMN user_monthly_attributes.team IS 'チーム（A/B）';
COMMENT ON COLUMN user_monthly_attributes.can_cardiac IS '心臓対応可';
COMMENT ON COLUMN user_monthly_attributes.can_obstetric IS '産科対応可';
COMMENT ON COLUMN user_monthly_attributes.can_icu IS 'ICU対応可';
COMMENT ON COLUMN user_monthly_attributes.can_remaining_duty IS '残当対応可';
