-- schedule_typeとshift_typeのカラムを統一するマイグレーション

-- 1. shift_typeに当直制約カラムを追加
ALTER TABLE shift_type ADD COLUMN IF NOT EXISTS prev_day_night_shift BOOLEAN DEFAULT true;
ALTER TABLE shift_type ADD COLUMN IF NOT EXISTS same_day_night_shift BOOLEAN DEFAULT true;
ALTER TABLE shift_type ADD COLUMN IF NOT EXISTS next_day_night_shift BOOLEAN DEFAULT true;

-- 2. shift_typeにmonthly_limitカラムを追加
ALTER TABLE shift_type ADD COLUMN IF NOT EXISTS monthly_limit INTEGER;

-- 3. schedule_typeにis_kensanbi_targetカラムを追加
ALTER TABLE schedule_type ADD COLUMN IF NOT EXISTS is_kensanbi_target BOOLEAN DEFAULT false;
