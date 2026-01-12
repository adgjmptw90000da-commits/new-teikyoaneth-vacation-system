-- score_configに除外フラグを追加
ALTER TABLE score_config ADD COLUMN IF NOT EXISTS exclude_holiday BOOLEAN DEFAULT false;
ALTER TABLE score_config ADD COLUMN IF NOT EXISTS exclude_pre_holiday BOOLEAN DEFAULT false;

COMMENT ON COLUMN score_config.exclude_holiday IS '祝日を除外する';
COMMENT ON COLUMN score_config.exclude_pre_holiday IS '祝前日を除外する';
