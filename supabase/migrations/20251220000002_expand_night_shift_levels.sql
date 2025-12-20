-- 当直レベルを4段階から6段階に拡張
-- 現在: なし, 上, 中, 下
-- 変更後: なし, 上, 上中, 中, 中下, 下

-- userテーブルの制約を更新
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_night_shift_level_check;
ALTER TABLE "user" ADD CONSTRAINT user_night_shift_level_check
  CHECK (night_shift_level IN ('なし', '上', '上中', '中', '中下', '下'));

-- コメント更新
COMMENT ON COLUMN "user".night_shift_level IS '当直レベル（なし/上/上中/中/中下/下）';
