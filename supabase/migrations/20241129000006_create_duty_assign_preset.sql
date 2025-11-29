-- duty_assign_preset テーブル作成
-- 当直自動割り振りのプリセット設定を保存

CREATE TABLE duty_assign_preset (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,              -- プリセット名
  description TEXT,                         -- 説明（任意）

  -- シフト設定
  night_shift_type_id INTEGER REFERENCES shift_type(id),  -- 当直シフトタイプ
  day_after_shift_type_id INTEGER REFERENCES shift_type(id), -- 当直明けシフトタイプ
  exclude_night_shift_type_ids INTEGER[],  -- 連続不可チェック対象の当直ID群

  -- 対象者設定
  selection_mode VARCHAR(20) DEFAULT 'filter',       -- 'filter' | 'individual'
  filter_teams TEXT[],                               -- チームフィルター
  filter_night_shift_levels TEXT[],                  -- 当直レベルフィルター
  filter_can_cardiac BOOLEAN,
  filter_can_obstetric BOOLEAN,
  filter_can_icu BOOLEAN,
  selected_member_ids TEXT[],                        -- 個別選択時のメンバーID

  -- 日付設定
  date_selection_mode VARCHAR(20) DEFAULT 'period',  -- 'period' | 'weekday' | 'specific'
  target_weekdays INTEGER[],                         -- 対象曜日
  include_holidays BOOLEAN DEFAULT true,
  include_pre_holidays BOOLEAN DEFAULT true,         -- 祝前日を含む

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_duty_assign_preset_display_order ON duty_assign_preset(display_order);

-- コメント
COMMENT ON TABLE duty_assign_preset IS '当直自動割り振りのプリセット設定';
COMMENT ON COLUMN duty_assign_preset.exclude_night_shift_type_ids IS '連続不可チェック対象の当直シフトタイプID群';
