-- システム予約タイプを追加するマイグレーション
-- schedule_typeテーブルにis_systemとsystem_keyカラムを追加

-- 1. カラム追加
ALTER TABLE schedule_type ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE schedule_type ADD COLUMN IF NOT EXISTS system_key VARCHAR(50);

-- 2. システム予約タイプを挿入（研究日・出向・休職）
-- 注: 既に存在する場合はスキップ
INSERT INTO schedule_type (name, display_label, position_am, position_pm, position_night, prev_day_night_shift, same_day_night_shift, next_day_night_shift, is_system, system_key, color, text_color, display_order)
SELECT '研究日', '研究日', true, true, false, false, true, true, true, 'research_day', '#FFFF99', '#000000', 100
WHERE NOT EXISTS (SELECT 1 FROM schedule_type WHERE system_key = 'research_day');

INSERT INTO schedule_type (name, display_label, position_am, position_pm, position_night, prev_day_night_shift, same_day_night_shift, next_day_night_shift, is_system, system_key, color, text_color, display_order)
SELECT '出向', '出向', true, true, true, false, false, false, true, 'secondment', '#FFCC99', '#000000', 101
WHERE NOT EXISTS (SELECT 1 FROM schedule_type WHERE system_key = 'secondment');

INSERT INTO schedule_type (name, display_label, position_am, position_pm, position_night, prev_day_night_shift, same_day_night_shift, next_day_night_shift, is_system, system_key, color, text_color, display_order)
SELECT '休職', '休職', true, true, true, false, false, false, true, 'leave_of_absence', '#C0C0C0', '#000000', 102
WHERE NOT EXISTS (SELECT 1 FROM schedule_type WHERE system_key = 'leave_of_absence');
