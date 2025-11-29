-- プリセットテーブルにpriority_modeカラムを追加
-- 候補者選択の優先順位: count=回数ベース, score=得点ベース

-- duty_assign_presetにpriority_modeカラムを追加
ALTER TABLE duty_assign_preset ADD COLUMN IF NOT EXISTS
  priority_mode VARCHAR(10) DEFAULT 'count';

COMMENT ON COLUMN duty_assign_preset.priority_mode IS '候補者選択優先順位: count=回数ベース, score=得点ベース';

-- shift_assign_presetにpriority_modeカラムを追加
ALTER TABLE shift_assign_preset ADD COLUMN IF NOT EXISTS
  priority_mode VARCHAR(10) DEFAULT 'count';

COMMENT ON COLUMN shift_assign_preset.priority_mode IS '候補者選択優先順位: count=回数ベース, score=得点ベース';
