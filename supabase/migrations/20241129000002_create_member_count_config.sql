-- member_count_config テーブル作成
-- メンバー別カウント設定を保存するテーブル

CREATE TABLE IF NOT EXISTS member_count_config (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- 設定名（内部用）
  display_label VARCHAR(50) NOT NULL,   -- 表示ラベル（表内に表示）
  is_active BOOLEAN DEFAULT false,      -- 表示するかどうか
  display_order INTEGER DEFAULT 0,      -- 表示順序

  -- カウント対象
  target_schedule_type_ids INTEGER[] DEFAULT '{}',  -- 予定タイプID（複数選択可）
  target_shift_type_ids INTEGER[] DEFAULT '{}',     -- シフトタイプID（複数選択可）

  -- 日付フィルタ（OR条件で結合）
  filter_day_of_weeks INTEGER[] DEFAULT '{}',  -- 曜日: 0=日, 1=月, ..., 6=土
  include_holiday BOOLEAN DEFAULT false,       -- 祝日を含む
  include_pre_holiday BOOLEAN DEFAULT false,   -- 祝前日を含む

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_member_count_config_is_active ON member_count_config(is_active);
CREATE INDEX IF NOT EXISTS idx_member_count_config_display_order ON member_count_config(display_order);
