-- shift_assign_presetにexclude_night_shift_unavailableを追加
ALTER TABLE shift_assign_preset
  ADD COLUMN IF NOT EXISTS exclude_night_shift_unavailable BOOLEAN DEFAULT false;

COMMENT ON COLUMN shift_assign_preset.exclude_night_shift_unavailable IS '当直不可（×）の日は割り振らない';

-- name_list_configにtarget_teamsを追加
ALTER TABLE name_list_config
  ADD COLUMN IF NOT EXISTS target_teams TEXT[] DEFAULT '{}';

COMMENT ON COLUMN name_list_config.target_teams IS '対象チーム（A/B）';
