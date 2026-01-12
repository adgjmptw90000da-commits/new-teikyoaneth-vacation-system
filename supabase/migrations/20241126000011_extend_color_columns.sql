-- 色カラムのサイズを拡張（transparent対応）
ALTER TABLE schedule_type ALTER COLUMN color TYPE VARCHAR(20);
ALTER TABLE schedule_type ALTER COLUMN text_color TYPE VARCHAR(20);

ALTER TABLE shift_type ALTER COLUMN color TYPE VARCHAR(20);
ALTER TABLE shift_type ALTER COLUMN text_color TYPE VARCHAR(20);

-- コメント
COMMENT ON COLUMN schedule_type.color IS '背景色（#RRGGBB または transparent）';
COMMENT ON COLUMN shift_type.color IS '背景色（#RRGGBB または transparent）';
