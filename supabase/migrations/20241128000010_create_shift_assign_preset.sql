-- shift_assign_preset テーブル作成
-- 一般シフト自動割り振りのプリセット設定を保存

CREATE TABLE shift_assign_preset (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,              -- プリセット名
  description TEXT,                         -- 説明（任意）

  -- 基本設定（generalShiftConfigと同様）
  shift_type_id INTEGER REFERENCES shift_type(id),  -- 割り振るシフトタイプ
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
  include_holidays BOOLEAN DEFAULT false,

  -- 除外フィルター（JSON配列で複数ルール保存）
  exclusion_filters JSONB DEFAULT '[]',

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_shift_assign_preset_display_order ON shift_assign_preset(display_order);

-- コメント
COMMENT ON TABLE shift_assign_preset IS '一般シフト自動割り振りのプリセット設定';
COMMENT ON COLUMN shift_assign_preset.exclusion_filters IS '除外フィルター設定（JSONB配列）。date_based: シフト/予定/年休による除外、work_location_based: 勤務場所による除外';
