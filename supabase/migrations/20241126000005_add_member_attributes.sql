-- メンバー属性カラムを追加
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS team VARCHAR(1) DEFAULT 'A' CHECK (team IN ('A', 'B'));
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS night_shift_level VARCHAR(10) DEFAULT '中' CHECK (night_shift_level IN ('上', '中', '下'));
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS can_cardiac BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS can_obstetric BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS can_icu BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 既存ユーザーにデフォルト値を設定
UPDATE "user" SET team = 'A' WHERE team IS NULL;
UPDATE "user" SET night_shift_level = '中' WHERE night_shift_level IS NULL;
UPDATE "user" SET can_cardiac = false WHERE can_cardiac IS NULL;
UPDATE "user" SET can_obstetric = false WHERE can_obstetric IS NULL;
UPDATE "user" SET can_icu = false WHERE can_icu IS NULL;
UPDATE "user" SET display_order = 0 WHERE display_order IS NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_team ON "user"(team);
CREATE INDEX IF NOT EXISTS idx_user_display_order ON "user"(display_order);

-- コメント
COMMENT ON COLUMN "user".team IS 'チーム区分（A/B）';
COMMENT ON COLUMN "user".night_shift_level IS '当直レベル（上/中/下）';
COMMENT ON COLUMN "user".can_cardiac IS '心外当直可否';
COMMENT ON COLUMN "user".can_obstetric IS '産科当直可否';
COMMENT ON COLUMN "user".can_icu IS 'ICU当直可否';
COMMENT ON COLUMN "user".display_order IS '表示順序';
