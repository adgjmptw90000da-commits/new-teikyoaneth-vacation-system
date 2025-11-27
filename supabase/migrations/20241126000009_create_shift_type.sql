-- シフトタイプテーブルを作成
CREATE TABLE IF NOT EXISTS shift_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_label VARCHAR(50),
  position_am BOOLEAN DEFAULT false,
  position_pm BOOLEAN DEFAULT false,
  position_night BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  color VARCHAR(9) DEFAULT '#CCFFFF',
  text_color VARCHAR(9) DEFAULT '#000000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- コメント
COMMENT ON TABLE shift_type IS '管理者が割り振るシフトタイプ';
COMMENT ON COLUMN shift_type.name IS 'シフト名（設定画面で表示）';
COMMENT ON COLUMN shift_type.display_label IS '予定表上で表示するラベル';
COMMENT ON COLUMN shift_type.position_am IS 'AM枠に表示するか';
COMMENT ON COLUMN shift_type.position_pm IS 'PM枠に表示するか';
COMMENT ON COLUMN shift_type.position_night IS '夜勤枠に表示するか';
COMMENT ON COLUMN shift_type.display_order IS '表示順';
COMMENT ON COLUMN shift_type.color IS '背景色';
COMMENT ON COLUMN shift_type.text_color IS '文字色';
