-- プリセットテーブルに割り振り回数制限カラムを追加
-- 1人あたりの最大割り振り回数を設定可能にする

-- duty_assign_presetに回数制限カラムを追加
ALTER TABLE duty_assign_preset ADD COLUMN IF NOT EXISTS
  max_assignments_per_member INTEGER DEFAULT NULL;

ALTER TABLE duty_assign_preset ADD COLUMN IF NOT EXISTS
  max_assignments_mode VARCHAR(20) DEFAULT 'execution';

COMMENT ON COLUMN duty_assign_preset.max_assignments_per_member IS '1人あたりの最大割り振り回数（NULLは制限なし）';
COMMENT ON COLUMN duty_assign_preset.max_assignments_mode IS '回数制限モード: execution=この実行での回数, monthly=月間総回数';

-- shift_assign_presetに回数制限カラムを追加
ALTER TABLE shift_assign_preset ADD COLUMN IF NOT EXISTS
  max_assignments_per_member INTEGER DEFAULT NULL;

ALTER TABLE shift_assign_preset ADD COLUMN IF NOT EXISTS
  max_assignments_mode VARCHAR(20) DEFAULT 'execution';

COMMENT ON COLUMN shift_assign_preset.max_assignments_per_member IS '1人あたりの最大割り振り回数（NULLは制限なし）';
COMMENT ON COLUMN shift_assign_preset.max_assignments_mode IS '回数制限モード: execution=この実行での回数, monthly=月間総回数';
