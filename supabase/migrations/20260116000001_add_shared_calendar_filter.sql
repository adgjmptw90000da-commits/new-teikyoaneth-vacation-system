-- 非臨床日共有カレンダーのフィルター設定
CREATE TABLE shared_calendar_filter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  selected_member_ids TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 初期データ
INSERT INTO shared_calendar_filter (id, selected_member_ids) VALUES (1, '{}');

COMMENT ON TABLE shared_calendar_filter IS '非臨床日共有カレンダー - 表示メンバーフィルター設定';
