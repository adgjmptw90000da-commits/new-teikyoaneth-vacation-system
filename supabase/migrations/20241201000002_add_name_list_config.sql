-- 名前一覧表設定テーブル
-- シフト/予定タイプごとの担当者名一覧表示用の設定を管理

CREATE TABLE IF NOT EXISTS name_list_config (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,           -- 設定名（内部用）
  display_label VARCHAR NOT NULL,  -- 表示ラベル（列ヘッダー）
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- 対象シフト/スケジュール
  target_schedule_type_ids INTEGER[] DEFAULT '{}',
  target_shift_type_ids INTEGER[] DEFAULT '{}',

  -- 対象期間
  target_period_am BOOLEAN DEFAULT false,
  target_period_pm BOOLEAN DEFAULT false,
  target_period_night BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_name_list_config_is_active ON name_list_config(is_active);
CREATE INDEX IF NOT EXISTS idx_name_list_config_display_order ON name_list_config(display_order);
