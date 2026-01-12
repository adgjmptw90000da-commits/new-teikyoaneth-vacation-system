-- 予定表示設定カラムを追加
ALTER TABLE setting ADD COLUMN IF NOT EXISTS display_settings JSONB DEFAULT '{}';

-- デフォルト値を設定（12月予定表の色に合わせる - パステル調）
UPDATE setting SET display_settings = '{
  "research_day": {
    "label": "研究日",
    "label_first_year": "外勤",
    "color": "#000000",
    "bg_color": "#FFFF99"
  },
  "vacation": {
    "label_full": "年休",
    "label_am": "AM",
    "label_pm": "PM",
    "color": "#000000",
    "bg_color": "#FFCCCC"
  },
  "secondment": {
    "label": "出向",
    "color": "#000000",
    "bg_color": "#FFCC99"
  },
  "leave_of_absence": {
    "label": "休職",
    "color": "#000000",
    "bg_color": "#C0C0C0"
  }
}'::jsonb WHERE display_settings = '{}' OR display_settings IS NULL;

-- コメント
COMMENT ON COLUMN setting.display_settings IS '予定表示設定（ラベル、色など）';
