-- schedule_type テーブルに文字色カラムを追加
ALTER TABLE schedule_type ADD COLUMN IF NOT EXISTS text_color VARCHAR(9) DEFAULT '#000000';

-- コメント
COMMENT ON COLUMN schedule_type.text_color IS '文字色（16進数カラーコード）';
