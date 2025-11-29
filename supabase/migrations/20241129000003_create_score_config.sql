-- score_config テーブル作成
-- メンバー別得点設定を保存するテーブル

CREATE TABLE IF NOT EXISTS score_config (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- 設定名
  is_active BOOLEAN DEFAULT true,       -- 有効/無効
  display_order INTEGER DEFAULT 0,      -- 表示順序

  -- 対象シフト
  target_shift_type_ids INTEGER[] DEFAULT '{}',

  -- 日付フィルタ（OR条件）
  filter_day_of_weeks INTEGER[] DEFAULT '{}',  -- 曜日: 0=日, 1=月, ..., 6=土
  include_holiday BOOLEAN DEFAULT false,       -- 祝日を含む
  include_pre_holiday BOOLEAN DEFAULT false,   -- 祝前日を含む

  -- 得点
  points DECIMAL(10, 2) NOT NULL DEFAULT 1,    -- 付与得点（小数点対応）

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_score_config_is_active ON score_config(is_active);
CREATE INDEX IF NOT EXISTS idx_score_config_display_order ON score_config(display_order);
