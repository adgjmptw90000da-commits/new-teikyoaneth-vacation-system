-- schedule_typeテーブルにmonthly_limitカラムを追加
ALTER TABLE schedule_type ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT NULL;

-- コメント
COMMENT ON COLUMN schedule_type.monthly_limit IS '月あたりの登録回数制限（NULLの場合は無制限）';
