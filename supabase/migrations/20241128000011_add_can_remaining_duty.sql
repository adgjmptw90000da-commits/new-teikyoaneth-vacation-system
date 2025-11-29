-- user テーブルに残り番対応カラムを追加
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS can_remaining_duty BOOLEAN DEFAULT false;

COMMENT ON COLUMN "user".can_remaining_duty IS '残り番対応可否';
