-- 予定表PNG画像URL列を追加
ALTER TABLE schedule_publish
ADD COLUMN image_url_a TEXT,
ADD COLUMN image_url_b TEXT;

COMMENT ON COLUMN schedule_publish.image_url_a IS 'A表のPNG画像URL';
COMMENT ON COLUMN schedule_publish.image_url_b IS 'B表のPNG画像URL';
