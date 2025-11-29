-- schedule_publishテーブルに予定提出ロックカラムを追加
ALTER TABLE schedule_publish ADD COLUMN IF NOT EXISTS
  is_submission_locked BOOLEAN DEFAULT false;

COMMENT ON COLUMN schedule_publish.is_submission_locked IS '予定提出をロックするかどうか';
