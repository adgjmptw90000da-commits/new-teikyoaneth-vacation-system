-- 得点割合から直接得点設定への変更

-- 1. テーブル名を変更
ALTER TABLE user_point_retention_rate RENAME TO user_annual_leave_points;

-- 2. インデックス名を変更
ALTER INDEX idx_user_point_retention_rate_staff_year RENAME TO idx_user_annual_leave_points_staff_year;

-- 3. 既存データを得点に変換（割合から実際の得点へ）
-- settingテーブルは1行のみ（id=1）なのでfiscal_year関係なく取得
UPDATE user_annual_leave_points
SET point_retention_rate = ROUND(
  (SELECT max_annual_leave_points FROM setting WHERE id = 1)
  * point_retention_rate / 100.0
);

-- 4. カラム名を変更
ALTER TABLE user_annual_leave_points
  RENAME COLUMN point_retention_rate TO annual_leave_points;

-- 5. コメントを更新
COMMENT ON TABLE user_annual_leave_points IS '年度別年休得点設定';
COMMENT ON COLUMN user_annual_leave_points.annual_leave_points IS '年休得点（個別設定）';
