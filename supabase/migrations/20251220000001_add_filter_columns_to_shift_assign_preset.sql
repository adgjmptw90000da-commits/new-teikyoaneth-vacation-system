-- shift_assign_presetに属性フィルターのカラムを追加

-- 立場フィルター
ALTER TABLE shift_assign_preset
  ADD COLUMN IF NOT EXISTS filter_positions TEXT[] DEFAULT '{}';

-- 残当可否フィルター
ALTER TABLE shift_assign_preset
  ADD COLUMN IF NOT EXISTS filter_can_remaining_duty BOOLEAN;

COMMENT ON COLUMN shift_assign_preset.filter_positions IS '立場フィルター（常勤/非常勤/ローテーター/研修医）';
COMMENT ON COLUMN shift_assign_preset.filter_can_remaining_duty IS '残当可否フィルター';
