-- shift_assign_presetとduty_assign_presetに除外フラグを追加
ALTER TABLE shift_assign_preset ADD COLUMN IF NOT EXISTS exclude_holidays BOOLEAN DEFAULT false;
ALTER TABLE shift_assign_preset ADD COLUMN IF NOT EXISTS exclude_pre_holidays BOOLEAN DEFAULT false;

ALTER TABLE duty_assign_preset ADD COLUMN IF NOT EXISTS exclude_holidays BOOLEAN DEFAULT false;
ALTER TABLE duty_assign_preset ADD COLUMN IF NOT EXISTS exclude_pre_holidays BOOLEAN DEFAULT false;

COMMENT ON COLUMN shift_assign_preset.exclude_holidays IS '祝日を除外する';
COMMENT ON COLUMN shift_assign_preset.exclude_pre_holidays IS '祝前日を除外する';
COMMENT ON COLUMN duty_assign_preset.exclude_holidays IS '祝日を除外する';
COMMENT ON COLUMN duty_assign_preset.exclude_pre_holidays IS '祝前日を除外する';
