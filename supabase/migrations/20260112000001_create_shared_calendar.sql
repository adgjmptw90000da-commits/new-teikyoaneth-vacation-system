-- 予定共有カレンダー機能

-- カテゴリマスタ
CREATE TABLE shared_calendar_category (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_label VARCHAR(50),
  color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
  text_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベントデータ
CREATE TABLE shared_calendar_event (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES shared_calendar_category(id) ON DELETE RESTRICT,
  event_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_shared_calendar_category_order ON shared_calendar_category(display_order);
CREATE INDEX idx_shared_calendar_category_active ON shared_calendar_category(is_active);
CREATE INDEX idx_shared_calendar_event_staff ON shared_calendar_event(staff_id);
CREATE INDEX idx_shared_calendar_event_date ON shared_calendar_event(event_date);
CREATE INDEX idx_shared_calendar_event_category ON shared_calendar_event(category_id);

-- コメント
COMMENT ON TABLE shared_calendar_category IS '予定共有カレンダー - カテゴリマスタ';
COMMENT ON TABLE shared_calendar_event IS '予定共有カレンダー - イベントデータ';

-- デフォルトカテゴリを挿入
INSERT INTO shared_calendar_category (name, display_label, color, text_color, display_order) VALUES
('会議', '会議', '#3B82F6', '#FFFFFF', 1),
('出張', '出張', '#10B981', '#FFFFFF', 2),
('休暇', '休暇', '#EF4444', '#FFFFFF', 3),
('その他', '他', '#6B7280', '#FFFFFF', 4);
