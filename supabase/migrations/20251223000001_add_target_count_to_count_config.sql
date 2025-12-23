-- count_configテーブルに規定数カラムを追加

ALTER TABLE count_config ADD COLUMN IF NOT EXISTS
  target_count INTEGER DEFAULT NULL;

COMMENT ON COLUMN count_config.target_count IS '規定数（NULLは色分けなし）';
