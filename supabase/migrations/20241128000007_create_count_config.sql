-- count_config テーブル作成
-- カウント設定を保存するテーブル

CREATE TABLE IF NOT EXISTS count_config (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- 設定名（内部用）
  display_label VARCHAR(50) NOT NULL,   -- 表示ラベル
  is_active BOOLEAN DEFAULT false,      -- 表示するかどうか
  display_order INTEGER DEFAULT 0,      -- 表示順序

  -- カウント対象（複数選択可能、配列で保存）
  target_schedule_type_ids INTEGER[] DEFAULT '{}',  -- 予定タイプID（複数選択可）
  target_shift_type_ids INTEGER[] DEFAULT '{}',     -- シフトタイプID（複数選択可）
  target_work_location_ids INTEGER[] DEFAULT '{}',  -- 勤務場所ID（複数選択可）
  target_special_types VARCHAR[] DEFAULT '{}',      -- 特殊タイプ: 'vacation', 'kensanbi', 'research_day', 'night_shift_available', 'night_shift_unavailable'（複数選択可）

  -- カウント対象勤務時間
  target_period_am BOOLEAN DEFAULT true,
  target_period_pm BOOLEAN DEFAULT true,
  target_period_night BOOLEAN DEFAULT true,

  -- カウント対象者フィルタ
  filter_teams VARCHAR[] DEFAULT '{}',                    -- 'A', 'B'
  filter_night_shift_levels VARCHAR[] DEFAULT '{}',       -- 'なし', '上', '中', '下'
  filter_can_cardiac BOOLEAN DEFAULT NULL,                -- NULL=条件なし
  filter_can_obstetric BOOLEAN DEFAULT NULL,
  filter_can_icu BOOLEAN DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_count_config_is_active ON count_config(is_active);
CREATE INDEX IF NOT EXISTS idx_count_config_display_order ON count_config(display_order);
