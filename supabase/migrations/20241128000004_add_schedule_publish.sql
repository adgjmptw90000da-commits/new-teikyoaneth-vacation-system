-- 予定表公開管理テーブル
CREATE TABLE IF NOT EXISTS schedule_publish (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by_staff_id VARCHAR REFERENCES "user"(staff_id),
  snapshot_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_schedule_publish_year_month ON schedule_publish(year, month);
