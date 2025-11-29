-- shift_assign_presetテーブルに祝前日カラムを追加
ALTER TABLE shift_assign_preset ADD COLUMN IF NOT EXISTS
  include_pre_holidays BOOLEAN DEFAULT false;
