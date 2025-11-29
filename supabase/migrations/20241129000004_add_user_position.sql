-- userテーブルに立場カラムを追加
-- 常勤/非常勤/ローテーター/研修医

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS
  position VARCHAR(20) DEFAULT '常勤';

-- 制約追加（許可値のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_position'
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT check_position
      CHECK (position IN ('常勤', '非常勤', 'ローテーター', '研修医'));
  END IF;
END $$;
