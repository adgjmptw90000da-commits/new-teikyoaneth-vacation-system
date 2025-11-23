-- イベントテーブルの作成
-- 祝日とは別に、申請制限のないイベント情報を管理する

CREATE TABLE IF NOT EXISTS event (
  id SERIAL PRIMARY KEY,
  event_date DATE UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_event_date ON event(event_date);

-- コメントの追加
COMMENT ON TABLE event IS 'イベント情報（申請制限なし）';
COMMENT ON COLUMN event.id IS 'イベントID';
COMMENT ON COLUMN event.event_date IS 'イベント日付';
COMMENT ON COLUMN event.name IS 'イベント名';
COMMENT ON COLUMN event.created_at IS '作成日時';
COMMENT ON COLUMN event.updated_at IS '更新日時';
