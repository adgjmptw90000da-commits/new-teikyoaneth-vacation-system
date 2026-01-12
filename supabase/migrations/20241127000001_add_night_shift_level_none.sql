-- 当直レベルに「なし」を追加
-- 既存の制約を削除して新しい制約を追加

-- 既存のCHECK制約を削除（制約名が不明な場合は一旦カラムの型を変更）
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_night_shift_level_check;
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS check_night_shift_level;

-- 新しいCHECK制約を追加（「なし」「上」「中」「下」を許可）
ALTER TABLE "user" ADD CONSTRAINT user_night_shift_level_check
  CHECK (night_shift_level IN ('なし', '上', '中', '下'));

-- コメント追加
COMMENT ON COLUMN "user".night_shift_level IS '当直レベル（なし/上/中/下）';
