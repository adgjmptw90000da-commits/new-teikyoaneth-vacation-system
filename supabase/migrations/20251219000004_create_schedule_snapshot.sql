-- 予定表スナップショットテーブル
-- 月ごとの予定表の状態を複数保存し、復元できる機能用

CREATE TABLE schedule_snapshot (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  snapshot_data JSONB NOT NULL,
  created_by_staff_id VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_schedule_snapshot_year_month ON schedule_snapshot(year, month);

-- コメント
COMMENT ON TABLE schedule_snapshot IS '予定表スナップショット';
COMMENT ON COLUMN schedule_snapshot.year IS '対象年';
COMMENT ON COLUMN schedule_snapshot.month IS '対象月';
COMMENT ON COLUMN schedule_snapshot.name IS '保存名';
COMMENT ON COLUMN schedule_snapshot.description IS '説明';
COMMENT ON COLUMN schedule_snapshot.snapshot_data IS 'スナップショットデータ（JSON）';
COMMENT ON COLUMN schedule_snapshot.created_by_staff_id IS '作成者ID';
