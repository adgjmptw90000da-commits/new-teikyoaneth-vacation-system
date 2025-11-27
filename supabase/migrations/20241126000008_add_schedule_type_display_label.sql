-- schedule_type テーブルに表示ラベルカラムを追加
ALTER TABLE schedule_type ADD COLUMN IF NOT EXISTS display_label VARCHAR(50);

-- コメント
COMMENT ON COLUMN schedule_type.display_label IS '予定表上で表示するラベル（NULLの場合はnameを使用）';
