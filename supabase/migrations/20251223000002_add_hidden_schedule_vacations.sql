-- 非表示年休テーブル
-- 予定表作成ページで特定の年休を非表示にするための管理テーブル

CREATE TABLE IF NOT EXISTS hidden_schedule_vacations (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  staff_id VARCHAR(50) NOT NULL,        -- 非表示にされた年休の対象者
  vacation_date DATE NOT NULL,           -- 非表示にされた日付
  hidden_by_staff_id VARCHAR(50),        -- 誰が非表示にしたか
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(year, month, staff_id, vacation_date)  -- 重複防止
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_hidden_schedule_vacations_year_month
  ON hidden_schedule_vacations(year, month);

COMMENT ON TABLE hidden_schedule_vacations IS '予定表作成ページで非表示にした年休を管理';
COMMENT ON COLUMN hidden_schedule_vacations.year IS '対象年';
COMMENT ON COLUMN hidden_schedule_vacations.month IS '対象月';
COMMENT ON COLUMN hidden_schedule_vacations.staff_id IS '非表示にされた年休の対象者のstaff_id';
COMMENT ON COLUMN hidden_schedule_vacations.vacation_date IS '非表示にされた年休の日付';
COMMENT ON COLUMN hidden_schedule_vacations.hidden_by_staff_id IS '非表示操作を行ったユーザーのstaff_id';
