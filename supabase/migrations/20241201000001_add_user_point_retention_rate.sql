-- 年度別得点割合設定テーブル
CREATE TABLE user_point_retention_rate (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  point_retention_rate INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, fiscal_year)
);

CREATE INDEX idx_user_point_retention_rate_staff_year
  ON user_point_retention_rate(staff_id, fiscal_year);

COMMENT ON TABLE user_point_retention_rate IS '年度別得点割合設定';
COMMENT ON COLUMN user_point_retention_rate.staff_id IS '職員ID';
COMMENT ON COLUMN user_point_retention_rate.fiscal_year IS '年度（例: 2025 = 2025年4月〜2026年3月）';
COMMENT ON COLUMN user_point_retention_rate.point_retention_rate IS '得点割合（0-100%）';
