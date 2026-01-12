-- 年休得点制限機能の追加

-- 1. setting テーブルに年休得点関連のカラムを追加
ALTER TABLE setting
ADD COLUMN IF NOT EXISTS max_annual_leave_points INTEGER DEFAULT 20 NOT NULL,
ADD COLUMN IF NOT EXISTS level1_points INTEGER DEFAULT 2 NOT NULL,
ADD COLUMN IF NOT EXISTS level2_points INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS current_fiscal_year INTEGER DEFAULT 2025 NOT NULL;

-- 2. user テーブルに得点保持率カラムを追加
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS point_retention_rate INTEGER DEFAULT 100 NOT NULL;

-- 3. 既存の setting レコードを更新（id=1）
UPDATE setting
SET
  max_annual_leave_points = 20,
  level1_points = 2,
  level2_points = 1,
  current_fiscal_year = 2025
WHERE id = 1;

-- 4. 既存の user レコードに得点保持率を設定
UPDATE "user"
SET point_retention_rate = 100
WHERE point_retention_rate IS NULL;

-- 5. コメント追加
COMMENT ON COLUMN setting.max_annual_leave_points IS '最大年休得点（デフォルト: 20点）';
COMMENT ON COLUMN setting.level1_points IS 'レベル1申請の消費得点（デフォルト: 2点）';
COMMENT ON COLUMN setting.level2_points IS 'レベル2申請の消費得点（デフォルト: 1点）';
COMMENT ON COLUMN setting.current_fiscal_year IS '現在の年度（4月開始、例: 2025年度 = 2025/4/1〜2026/3/31）';
COMMENT ON COLUMN "user".point_retention_rate IS '得点保持率（0-100%、デフォルト: 100%）';
